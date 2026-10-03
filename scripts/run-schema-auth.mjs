/* รัน supabase/schema-auth.sql ผ่าน Supabase Management API
   ใช้: node scripts/run-schema-auth.mjs <PERSONAL_ACCESS_TOKEN>
   token สร้างจาก https://supabase.com/dashboard/account/tokens (ขึ้นต้น sbp_)

   REF อ่านจาก VITE_SUPABASE_URL ใน .env.local โดยอัตโนมัติ
   (override ได้ด้วย: REF=xxxx node scripts/run-schema-auth.mjs sbp_...) */
import { readFileSync } from 'fs';

const token = process.argv[2];
if (!token || !token.startsWith('sbp_')) {
  console.error('ใส่ token เป็น argument แรก: node scripts/run-schema-auth.mjs sbp_...');
  process.exit(1);
}

function readRef() {
  if (process.env.REF) return process.env.REF;
  try {
    const env = readFileSync('.env.local', 'utf8');
    const m = env.match(/VITE_SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (m) return m[1];
  } catch { /* ไม่มีไฟล์ .env.local — ต้องส่ง REF มาเอง */ }
  throw new Error('หา VITE_SUPABASE_URL ใน .env.local ไม่พบ — ส่ง REF=xxxx เป็น env var แทน');
}

const REF = readRef();
console.log(`กำลังรัน schema-auth.sql บนโปรเจกต์ ${REF}`);
const sql = readFileSync('supabase/schema-auth.sql', 'utf8');

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
console.log(text.slice(0, 2000));
process.exit(res.ok ? 0 : 1);