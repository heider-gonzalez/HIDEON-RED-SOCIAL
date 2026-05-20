import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');

// Create a clean .env file with only the essential variables
const cleanContent = `CLOUDFLARE_R2_API_URL=https://137569df68ffc80cc0977391324e77fc.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=9e180425d82ee44e164ffc7a5c1df779
CLOUDFLARE_R2_SECRET_ACCESS_KEY=615c3ac4ac4fd67a92cf560a3a100ca512cece152802aeea91a08d3994751b83
CLOUDFLARE_R2_BUCKET_NAME=hideon-media
VITE_R2_PUBLIC_URL=https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev
VITE_SUPABASE_URL=https://wgbbaxvuuinubkgffpiq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MTc4NjgsImV4cCI6MjA1NTM5Mzg2OH0.B_LIb8OHoe5C08YoyS9Lw5NvUlCPJB5zYP6h4klpTuk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-I
UPy67uijlo
SMTP_USER=heidergonzalez16@gmail.com
SMTP_PASS=bbjibfrvoywibjbe
`;

fs.writeFileSync(envPath, cleanContent, 'utf-8');
console.log('✅ .env file cleaned successfully');
