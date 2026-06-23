import fs from 'fs';
import https from 'https';

const envContent = fs.readFileSync('.env', 'utf8');
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
if (!keyMatch) { console.error('No SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }
const serviceRoleKey = keyMatch[1].trim();
const projectRef = 'ynkdtqhhnxmpqvdbzzqk';

const sql = fs.readFileSync('supabase/migrations/022_admin_leagues_rls.sql', 'utf8');

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
    console.log(data.substring(0, 500));
  });
});

req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
