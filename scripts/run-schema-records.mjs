/* รัน supabase/schema-records.sql ผ่าน Supabase Management API
   ใช้: node scripts/run-schema-records.mjs <PERSONAL_ACCESS_TOKEN>
   token สร้างจาก https://supabase.com/dashboard/account/tokens (ขึ้นต้น sbp_) */
import { readFileSync } from 'fs';

const token = process.argv[2];
if (!token || !token.startsWith('sbp_')) {
  console.error('ใส่ token เป็น argument แรก: node scripts/run-schema-records.mjs sbp_...');
  process.exit(1);
}

const REF = 'skqjnkawlmewazmrtevt';
const sql = readFileSync('supabase/schema-records.sql', 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log('HTTP', res.status);
console.log(text.slice(0, 4000));
process.exit(res.ok ? 0 : 1);
