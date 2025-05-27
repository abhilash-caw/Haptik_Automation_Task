const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const questions = require('../questions.json');
const { getTestUrl } = require('../config/test-config');

test('Ask questions, get bot replies, and export to CSV', async ({ page }) => {
  test.setTimeout(0); // Unlimited timeout

  // Get URL from config file - automatically uses 'staging' environment
  // To use production environment, uncomment the line below:
  // const testUrl = getTestUrl('production');
  const testUrl = getTestUrl();
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

  const frame = page.locator('iframe').first().contentFrame();
  await frame.getByTestId('minimizeButton').click();

  const inputBox = frame.getByTestId('composerTextArea');
  await inputBox.waitFor();

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
