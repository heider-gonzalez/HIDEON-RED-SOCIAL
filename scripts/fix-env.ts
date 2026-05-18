import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Remove duplicate SMTP entries and keep only the real ones
const lines = envContent.split('\n');
const cleanedLines = lines.filter(line => {
  const trimmed = line.trim();
  // Remove placeholder SMTP entries
  if (trimmed === 'SMTP_USER=tu_correo_gmail@gmail.com') return false;
  if (trimmed === 'SMTP_PASS=tu_contrasena_de_aplicacion_de_16_letras') return false;
  // Remove empty lines at the end
  if (trimmed === '' && lines.indexOf(line) > lines.length - 5) return false;
  return true;
});

// Add the correct SMTP entries at the end
const finalLines = [
  ...cleanedLines.filter(line => line.trim() !== '' || !line.includes('SMTP')),
  '',
  '# SMTP Configuration for Welcome Emails',
  '',
  'SMTP_USER=heidergonzalez16@gmail.com',
  'SMTP_PASS=bbjibfrvoywibjbe'
];

fs.writeFileSync(envPath, finalLines.join('\n'));
console.log('✅ .env file cleaned and updated with correct SMTP credentials');
