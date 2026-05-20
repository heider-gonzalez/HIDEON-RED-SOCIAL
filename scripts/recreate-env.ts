import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');

// Read existing .env to preserve other variables
let existingContent = '';
try {
  existingContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
  console.log('No existing .env file found');
}

// Extract non-SMTP variables
const lines = existingContent.split('\n');
const nonSmtpLines = lines.filter(line => {
  const trimmed = line.trim();
  return !trimmed.startsWith('SMTP_') && trimmed !== '';
});

// Create new .env content
const newContent = [
  ...nonSmtpLines,
  '',
  '# SMTP Configuration for Welcome Emails',
  'SMTP_USER=heidergonzalez16@gmail.com',
  'SMTP_PASS=bbjibfrvoywibjbe'
].join('\n');

fs.writeFileSync(envPath, newContent);
console.log('✅ .env file recreated successfully');
