const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const questions = require('../questions.json');
// import { test, expect } from '@playwright/test';
// import fs from 'fs';
// import path from 'path';
// import os from 'os';
// import { exec } from 'child_process';
// import questions from '../questions.json' assert { type: 'json' };


test('Ask questions, get bot replies, and export to CSV', async ({ page }) => {
  test.setTimeout(0); // Unlimited timeout

  await page.goto(
    'https://toolassets.haptikapi.com/js-sdk/html/demoqp.html?business-id=8867&client-id=75d87f5185a3d04bf1129320bc4a93237877f2d1&api-key=npci:otoh9oes4gap1oe798jcxl91ffzq0ixd3jnleb3d&base-url=https://staging.hellohaptik.com/&xdk=true',
    { waitUntil: 'domcontentloaded' }
  );

  // await page.goto(
  //   'https://toolassets.haptikapi.com/js-sdk/html/demoqp.html?business-id=8500&client-id=75d87f5185a3d04bf1129320bc4a93237877f2d1&api-key=npci:8jdx4x12rumk9omntb261af1d8ympxl9212hbkky&base-url=https://staging.hellohaptik.com/&xdk=true',
  //   { waitUntil: 'domcontentloaded' }
  // );
  

  const frame = page.frameLocator('iframe').first();
  await frame.locator("//div[contains(@data-testid,'minimizeButton')]//span//*[name()='svg']").click();

  const inputBox = frame.locator("//textarea[@id='composerv2-text-area']");
  await inputBox.waitFor();
  await page.waitForTimeout(3000); // Wait for 3 more sec

  const typingIndicator = frame.locator('text=Typing');
  const botMessages = frame.locator("span.hsl-bubble-text.v2.message-section-message-bubble-text");

  const collectedQA = [];

  try {
    for (const [index, question] of questions.entries()) {
      console.log(`🟡 Sending Q${index + 1}: ${question}`);
      const oldCount = await botMessages.count();

      // Send the question
      await inputBox.fill(question);
      await inputBox.press('Enter');

      // Wait for question to be visible in the chat window
      await page.waitForTimeout(500); // Allow a short time for the question to render

      // Ensure bot replies before sending the next question
      let done = false;
      let waited = 0;
      const maxTimeout = 30000; // 30 seconds max for each response
      const pollInterval = 500;

      while (!done && waited < maxTimeout) {
        await page.waitForTimeout(pollInterval);
        waited += pollInterval;

        const newCount = await botMessages.count();
        const isTyping = await typingIndicator.isVisible().catch(() => false);

        if (newCount > oldCount && !isTyping) {
          // Wait a bit more to ensure the message is fully rendered
          await page.waitForTimeout(2000);
          const stableCount = await botMessages.count();
          if (stableCount === newCount) {
            done = true;
          }
        }
      }

      // Collect new bot messages
      const finalCount = await botMessages.count();
      const newMessages = [];
      for (let i = oldCount; i < finalCount; i++) {
        const text = (await botMessages.nth(i).textContent())?.trim();
        if (text && text !== question) newMessages.push(text);
      }

      const botReply = newMessages.join(' | ') || 'No answer found';
      console.log(`✅ Bot replied to Q${index + 1}: ${botReply}`);
      collectedQA.push({ question, answer: botReply });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Save to CSV
    const csvData =
      'Question,Answer\n' +
      collectedQA
        .map(
          (q) =>
            `"${q.question.replace(/"/g, '""')}","${q.answer.replace(/"/g, '""')}"`
        )
        .join('\n');

    const csvPath = path.join(__dirname, '../bot_responses.csv');
    fs.writeFileSync(csvPath, csvData);
    console.log('📄 Responses saved to bot_responses.csv');

    // Open the CSV file automatically
    if (os.platform() === 'win32') {
      exec(`start excel "${csvPath.replace(/\//g, '\\')}"`);
    } else if (os.platform() === 'darwin') {
      exec(`open -a "Microsoft Excel" "${csvPath}"`);
    } else {
      exec(`xdg-open "${csvPath}"`);
    }

    // Pause for manual inspection
    await page.pause();
  }
});
