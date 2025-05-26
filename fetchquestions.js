import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = process.argv[2]; // Get CSV file path from command line

if (!csvFilePath) {
  console.error('CSV file path not provided.');
  process.exit(1);
}

const questions = [];

fs.createReadStream(csvFilePath)
  .pipe(parse({ columns: true, trim: true }))
  .on('data', (row) => {
    const question = row.QUESTION || row.question || Object.values(row)[0]; // Flexible for different headers
    if (question) {
      questions.push(question);
    }
  })
  .on('end', () => {
    fs.writeFileSync(
      path.join(__dirname, 'questions.json'),
      JSON.stringify(questions, null, 2),
      'utf-8'
    );
    console.log('✅ questions.json generated successfully as an array of strings.');
  })
  .on('error', (err) => {
    console.error('❌ Error reading CSV:', err);
  });
