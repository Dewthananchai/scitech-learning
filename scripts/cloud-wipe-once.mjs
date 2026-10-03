/* One-time cloud wipe: ทับข้อมูล demo เก่าใน Supabase ด้วยค่าว่าง
   ใช้ service_role ไม่ได้ (เราไม่เก็บคีย์ลับ) — ใช้ publishable key
   ซึ่งมีสิทธิ์ insert/update ผ่าน RLS policies ที่เราสร้างไว้

   ⚠️ สคริปต์นี้ลบข้อมูลทั้งหมดในคลาวด์ — ต้องยืนยันด้วย --yes
   ใช้: node scripts/cloud-wipe-once.mjs --yes
   (URL/KEY อ่านจาก .env.local โดยอัตโนมัติ ไม่ผูกกับโปรเจกต์ใดโปรเจกต์หนึ่ง) */
import { readFileSync } from 'fs';

if (!process.argv.includes('--yes')) {
  console.error('ปฏิเสธด้วย: สคริปต์นี้จะลบข้อมูลทั้งหมดในคลาวด์\n');
  console.error('ถ้าแน่ใจแล้ว ใช้: node scripts/cloud-wipe-once.mjs --yes');
  process.exit(1);
}

const env = readFileSync('.env.local', 'utf8');
const URL_BASE = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1];
const KEY = env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1];
if (!URL_BASE || !KEY) {
  console.error('หา VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ใน .env.local ไม่พบ');
  process.exit(1);
}
const URL = `${URL_BASE.replace(/\/$/, '')}/rest/v1/app_state`;
console.log(`⚠️  กำลังล้าง ${URL}`);

const KEYS = [
  'scitech_users', 'scitech_user_passwords', 'scitech_lessons', 'scitech_questions',
  'scitech_quizzes', 'scitech_subjects', 'scitech_lesson_sessions', 'scitech_worksheets',
  'scitech_worksheet_submissions', 'scitech_announcements', 'scitech_calendar',
  'scitech_attendance_sessions', 'scitech_attendance_records', 'scitech_missions',
  'scitech_daily_missions', 'scitech_mission_completions', 'scitech_lesson_progress',
  'onet_bank_data_v1', 'onet_levels_v1', 'onet_years_v1', 'onet_exam_history_v1',
  'm1_bank_data_v1', 'm1_bank_schools_v1', 'm1_bank_years_v1', 'm1_exam_history_v1',
];

const now = new Date().toISOString();
const rows = KEYS.map(id => ({ id, value: JSON.stringify([]), updated_at: now }));

const res = await fetch(`${URL}?on_conflict=id`, {
  method: 'POST',
  headers: {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
});
console.log('HTTP', res.status, res.ok ? '— cloud wiped' : await res.text());
process.exit(res.ok ? 0 : 1);