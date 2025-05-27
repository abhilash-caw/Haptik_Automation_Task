const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const questions = require('../questions.json');

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
  await frame.getByTestId('minimizeButton').click();

  const inputBox = frame.getByTestId('composerTextArea');
  await inputBox.waitFor();
  await page.waitForTimeout(3000); // Wait for 3 more sec

  const typingIndicator = frame.locator('text=Typing');
  const botMessages = frame.locator('.hsl-bubble');

  const collectedQA = [];

  // Helper function to wait for bot response after sending a question
  async function waitForBotResponse() {
    let done = false;
    let waited = 0;
    const maxTimeout = 30000; // 30 seconds max
    const pollInterval = 500;

    // Get initial bot message count before waiting
    const oldCount = await botMessages.count();

    while (!done && waited < maxTimeout) {
      await page.waitForTimeout(pollInterval);
      waited += pollInterval;

      const newCount = await botMessages.count();
      const isTyping = await typingIndicator.isVisible().catch(() => false);

      if (newCount > oldCount && !isTyping) {
        // Wait extra to ensure messages finish rendering
        await page.waitForTimeout(2000);
        const stableCount = await botMessages.count();
        if (stableCount === newCount) {
          done = true;
        }
      }
    }

    if (!done) throw new Error('Timeout waiting for bot response');

    // Return old and new counts for message collection
    return { oldCount, newCount: await botMessages.count() };
  }

  try {
    for (const [index, question] of questions.entries()) {
      console.log(`🟡 Sending Q${index + 1}: ${question}`);

      // Send the question
      await inputBox.fill(question);
      await inputBox.press('Enter');

      // Wait a short time for question to render
      await page.waitForTimeout(3000);

      // Wait until bot finishes replying before continuing
      const { oldCount, newCount } = await waitForBotResponse();

      // Collect new bot messages
      const newMessages = [];
      for (let i = oldCount; i < newCount; i++) {
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

    // Open CSV automatically based on OS
    if (os.platform() === 'win32') {
      exec(`start excel "${csvPath.replace(/\//g, '\\')}"`);
    } else if (os.platform() === 'darwin') {
      exec(`open -a "Microsoft Excel" "${csvPath}"`);
    } else {
      exec(`xdg-open "${csvPath}"`);
    }

  }
});
