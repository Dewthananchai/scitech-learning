/* One-time cloud wipe: ทับข้อมูล demo เก่าใน Supabase ด้วยค่าว่าง
   ใช้ service_role ไม่ได้ (เราไม่เก็บคีย์ลับ) — ใช้ publishable key
   ซึ่งมีสิทธิ์ insert/update ผ่าน RLS policies ที่เราสร้างไว้ */
const URL = 'https://skqjnkawlmewazmrtevt.supabase.co/rest/v1/app_state';
const KEY = 'sb_publishable_ZNG5LYvYt1FGAnpWn4LqbQ_jQNjQvgA';

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

// seed admin account (ค่าเริ่มต้นจริง — ไม่ใช่ demo)
rows[0].value = JSON.stringify([{
  id: 1, username: 'admin', password: 'Dew0842239351',
  full_name: 'ผู้ดูแลระบบ', role: 'admin', is_active: true,
  created_at: now.split('T')[0],
}]);

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
console.log('HTTP', res.status, res.ok ? '— cloud wiped + admin seeded' : await res.text());
process.exit(res.ok ? 0 : 1);
