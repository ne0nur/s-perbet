import fs from 'fs';
import https from 'https';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '../.env') });

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;

if (!serviceRoleKey || !supabaseUrl) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL in .env');
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)[1];
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/run_sql.js <path_to_sql_file>');
  process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf8');
const body = JSON.stringify({ query: sql });

const req = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(data);
  });
});

req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
