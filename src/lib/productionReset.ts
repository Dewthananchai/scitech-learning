/* ============================================================
   Production Reset — ล้างข้อมูลตัวอย่างในเครื่องนี้ (ครั้งเดียว)
   ============================================================
   ปัญหา: เบราว์เซอร์แต่ละเครื่องยังเก็บข้อมูล demo เก่าไว้
   (ผู้ใช้ทดลอง admin/1234, teacher/1234, บทเรียน/ข้อสอบตัวอย่าง)

   สคริปต์นี้ทำงานอัตโนมัติครั้งเดียวต่อเบราว์เซอร์เมื่อเปิดแอป:
   1. เช็คธง (scitech_prod_reset_v1) — เคยรันแล้ว → ข้าม
   2. ล้าง localStorage ทุกคีย์ของแอปในเครื่องนี้
   3. seed บัญชีผู้ดูแลระบบบัญชีเดียว: admin / Dew0842239351
   4. ตั้งธง — ไม่รันอีก

   ฝั่งคลาวด์ (Supabase) ถูกล้างครั้งเดียวทาง API แล้ว —
   หลังรีเซ็ต แอปจะ hydrate ข้อมูลจริงล่าสุดจากคลาวด์เสมอ
   ============================================================ */

import { SYNCED_KEYS } from './cloudSync';

const RESET_FLAG = 'scitech_prod_reset_v1';

/** บัญชีผู้ดูแลระบบเริ่มต้น — ต้องตรงกับ seedUsers ใน useStore.ts */
const ADMIN_USER = {
  id: 1,
  username: 'admin',
  password: 'Dew0842239351',
  full_name: 'ผู้ดูแลระบบ',
  role: 'admin',
  is_active: true,
  created_at: new Date().toISOString().split('T')[0],
};

/** คีย์ localStorage ที่แอปเขียน (รวมธง, รูปโปรไฟล์, ฯลฯ) */
function allAppKeys(): string[] {
  const keys = new Set<string>(SYNCED_KEYS);
  keys.add(RESET_FLAG);
  keys.add('scitech_auth_user');
  keys.add('scitech_theme');
  keys.add('scitech_sidebar_collapsed');
  // คีย์ sync meta __synced_at__* จะถูกสร้างใหม่เอง
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('scitech_') || k.startsWith('onet_') || k.startsWith('m1_') || k.startsWith('__synced_at__'))) {
      keys.add(k);
    }
  }
  return Array.from(keys);
}

export async function runProductionResetIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(RESET_FLAG)) return; // เคยรันแล้ว

  console.info('[prodReset] ล้างข้อมูลตัวอย่างในเครื่องนี้ — เริ่มต้นใช้งานจริง');

  // 1) ล้าง localStorage ทุกคีย์ของแอป (คลาวด์จะถูก hydrate ทับหลังจากนี้)
  for (const k of allAppKeys()) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }

  // 2) seed บัญชี admin บัญชีเดียว (mirror ขึ้นคลาวด์อัตโนมัติผ่าน write interceptor)
  localStorage.setItem('scitech_users', JSON.stringify([ADMIN_USER]));

  // 3) ตั้งธง — ไม่รันอีกในเบราว์เซอร์นี้
  localStorage.setItem(RESET_FLAG, new Date().toISOString());
  console.info('[prodReset] เสร็จสิ้น — ระบบพร้อมใช้งานจริง (บัญชี admin เท่านั้น)');
}
