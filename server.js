import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static(__dirname)); // serve static files like run-test.html

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'run-test.html'));
});

// Upload CSV and generate questions.json
app.post('/upload-csv', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const csvPath = path.join(__dirname, req.file.path);
  const command = `node fetchquestions.js "${csvPath}"`;

  exec(command, { cwd: __dirname }, (err, stdout, stderr) => {
    fs.unlinkSync(csvPath); // delete uploaded file after processing
    if (err) {
      console.error('Error in fetchquestions:', stderr);
      return res.status(500).send(stderr);
    }
    console.log('questions.json generated');
    res.send('questions.json generated successfully');
  });
});

app.post('/run-bot-test', (req, res) => {
    const command = 'npx playwright test tests/bot-question-tests.spec.js --project=chromium --headed';
  
    console.log('⚙️ Running command:', command);
  
    exec(command, { cwd: __dirname }, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Playwright test error:', stderr);
        return res.status(500).send(stderr);
      }
      console.log('✅ Playwright test executed successfully.');
      res.send(stdout);
    });
  });
  

// Start the server
try {
  app.listen(3000, () => {
    console.log('✅ Server is running on http://localhost:3000');
  });
} catch (err) {
  console.error('❌ Failed to start server:', err);
}
