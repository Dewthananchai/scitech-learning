/* ============================================================
   SciTech Learning — Supabase cloud sync layer
   ============================================================
   ทุกข้อมูลของแอป (ผู้ใช้ บทเรียน ข้อสอบ ใบงาน ประกาศ ฯลฯ) ถูกเก็บ
   ใน localStorage ตามคีย์ (เช่น scitech_users, onet_bank_data_v1)
   เลเยอร์นี้ทำให้ข้อมูลชุดเดียวกัน "ซิงก์ขึ้นคลาวด์" โดยอัตโนมัติ:

   - ตอนเปิดแอป: ดึงข้อมูลจาก Supabase มาทับ localStorage ที่เก่ากว่า
     (เทียบเวลาแก้ไขล่าสุด — last write wins)
   - ระหว่างใช้งาน: ทุกครั้งที่แอปเขียน localStorage เข้าคิวอัปโหลด
     ไป Supabase ทันที (debounce รวมการเขียนถี่ ๆ)
   - ถ้าไม่ได้ตั้งค่า Supabase หรือออฟไลน์: แอปทำงานจาก
     localStorage ได้เหมือนเดิมทุกอย่าง (ไม่พัง)

   ตารางที่ใช้ (ดู supabase/schema.sql):
     app_state (id text primary key, value jsonb, updated_at timestamptz)
     — แถวละ 1 คีย์ localStorage
   ============================================================ */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/** ทุกคีย์ localStorage ของแอปที่ต้องการซิงก์ (ไม่รวม session/local UI state) */
export const SYNCED_KEYS: string[] = [
  // ทะเบียนผู้ใช้: ยัง sync เพื่อให้ทุกเครื่องเห็นรายชื่อเดียวกัน
  // (แต่ RLS อนุญาตให้ admin เขียนเท่านั้น; รหัสผ่านถูกถอดออกโดย backfill)
  'scitech_users',
  'scitech_lessons',
  'scitech_questions',
  'scitech_quizzes',
  'scitech_subjects',
  'scitech_lesson_sessions',
  'scitech_worksheets',
  'scitech_worksheet_submissions',
  'scitech_announcements',
  'scitech_calendar',
  'scitech_attendance_sessions',
  'scitech_attendance_records',
  'scitech_missions',
  'scitech_daily_missions',
  'scitech_mission_completions',
  'scitech_lesson_progress',
  'onet_bank_data_v1',
  'onet_levels_v1',
  'onet_years_v1',
  'onet_exam_history_v1',
  'm1_bank_data_v1',
  'm1_bank_schools_v1',
  'm1_bank_years_v1',
  'm1_exam_history_v1',
];

let client: SupabaseClient | null = null;

export const cloudSyncConfigured = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY &&
    /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20);

export function getClient(): SupabaseClient | null {
  if (!cloudSyncConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/* ---------------- upload queue (debounced write-through) ---------------- */

type QueueEntry = { value: string; updatedAt: string };
const dirty = new Map<string, QueueEntry>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 1200);
}

async function flush(): Promise<void> {
  const supabase = getClient();
  if (!supabase || dirty.size === 0) return;
  const batch = Array.from(dirty.entries());
  dirty.clear();

  // กันข้อมูลสูญหาย: ก่อนอัปโหลดทะเบียนผู้ใช้ ต้องรวมรหัสผ่านจากคลาวด์กลับเข้า
  // สำเนาท้องถิ่นเสมอ — อุปกรณ์ที่ถือสำเนาเก่า/รหัสผ่านว่าง จะไม่มีวันลบรหัสผ่าน
  // ของผู้ใช้บนคลาวด์ (สาเหตุของปัญหา "ล็อกอินไม่ได้" ที่เคยเกิดซ้ำ)
  let rows = batch.map(([id, e]) => ({ id, value: e.value, updated_at: e.updatedAt }));
  const usersEntry = batch.find(([id]) => id === USER_REGISTER_KEY);
  if (usersEntry) {
    const merged = await mergeUserPasswordsWithCloud(supabase, usersEntry[1].value);
    if (merged.changed) {
      try {
        localStorage.setItem(USER_REGISTER_KEY, merged.value);
        localStorage.setItem(metaKey(USER_REGISTER_KEY), String(Date.now()));
      } catch { /* ไม่บล็อกการอัปโหลด */ }
      rows = rows.map(r => (r.id === USER_REGISTER_KEY ? { ...r, value: merged.value } : r));
    }
  }

  const { error } = await supabase
    .from('app_state')
    .upsert(rows, { onConflict: 'id' });
  if (error) {
    // กลับเข้าคิวเพื่อลองใหม่รอบหน้า (ออฟไลน์ชั่วคราว ฯลฯ)
    for (const [id, e] of batch) if (!dirty.has(id)) dirty.set(id, e);
    console.warn('[cloudSync] upload failed, will retry:', error.message);
  }
}

/** เขียนทันทีเมื่อจะเปลี่ยนหน้า/ปิดแท็บ */
export async function flushNow(): Promise<void> {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  await flush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { void flushNow(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNow();
  });
}

/* ---------------- hydrate + mirror ---------------- */

/** ดึงข้อมูลจากคลาวด์มาอัปเดต localStorage เฉพาะแถวที่คลาวด์ใหม่กว่า */
export async function hydrateFromCloud(): Promise<{ synced: number; errors: string[] }> {
  const supabase = getClient();
  if (!supabase) return { synced: 0, errors: [] };
  const errors: string[] = [];
  let synced = 0;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('id, value, updated_at')
      .in('id', SYNCED_KEYS);
    if (error) {
      errors.push(error.message);
      return { synced, errors };
    }
    for (const row of data ?? []) {
      if (!SYNCED_KEYS.includes(row.id)) continue;
      const local = localStorage.getItem(row.id);
      const localMeta = localStorage.getItem(metaKey(row.id));
      const cloudAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      const localAt = localMeta ? Number(localMeta) : 0;
      if (!local || cloudAt > localAt) {
        localStorage.setItem(row.id, typeof row.value === 'string' ? row.value : JSON.stringify(row.value));
        localStorage.setItem(metaKey(row.id), String(cloudAt || Date.now()));
        synced++;
      }
    }
  } catch (e) {
    errors.push(String(e));
  }
  return { synced, errors };
}

const metaKey = (id: string) => `__synced_at__${id}`;

const USER_REGISTER_KEY = 'scitech_users';

/** รวมรหัสผ่านจากคลาวด์เข้าสำเนาท้องถิ่นก่อนอัปโหลด — รหัสผ่านจะหายไม่ได้
 *  (อุปกรณ์ใดก็ตามที่สำเนาล้าสมัย/รหัสผ่านว่าง จะได้รับรหัสผ่านจากคลาวด์คืนโดยอัตโนมัติ) */
async function mergeUserPasswordsWithCloud(
  supabase: SupabaseClient,
  localValue: string,
): Promise<{ value: string; changed: boolean }> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('value')
      .eq('id', USER_REGISTER_KEY)
      .maybeSingle();
    if (error || !data?.value) return { value: localValue, changed: false };
    const parse = (v: unknown): Array<Record<string, unknown>> =>
      typeof v === 'string' ? JSON.parse(v) : (v as Array<Record<string, unknown>>);
    const cloudUsers = parse(data.value);
    const localUsers = parse(localValue);
    const keyOf = (u: Record<string, unknown>) => String(u.username ?? '').toLowerCase().trim();
    const cloudBy = new Map(cloudUsers.map(u => [keyOf(u), u]));
    let changed = false;
    const merged = localUsers.map(u => {
      const pw = String((u.password as string | undefined) ?? '').trim();
      const cloud = cloudBy.get(keyOf(u));
      const cloudPw = String((cloud?.password as string | undefined) ?? '').trim();
      if (!pw && cloudPw) { changed = true; return { ...u, password: cloudPw }; }
      return u;
    });
    return changed ? { value: JSON.stringify(merged), changed: true } : { value: localValue, changed: false };
  } catch {
    return { value: localValue, changed: false };
  }
}

/** เรียกหลังแอปเขียน localStorage ที่อยู่ใน SYNCED_KEYS — อัปโหลดตามหลัง */
export function mirrorWrite(key: string): void {
  if (!SYNCED_KEYS.includes(key)) return;
  const value = localStorage.getItem(key);
  if (value === null) return;
  const now = new Date().toISOString();
  localStorage.setItem(metaKey(key), String(Date.now()));
  dirty.set(key, { value, updatedAt: now });
  scheduleFlush();
}

/** ครอบ localStorage.setItem เพื่อให้ทุกการเขียนของแอปถูก mirror อัตโนมัติ */
export function installWriteInterceptor(): void {
  if (typeof window === 'undefined') return;
  const proto = Storage.prototype;
  if ((proto as unknown as { __mirrored?: boolean }).__mirrored) return;
  const original = proto.setItem;
  proto.setItem = function (this: Storage, k: string, v: string) {
    original.call(this, k, v);
    mirrorWrite(k);
  };
  (proto as unknown as { __mirrored?: boolean }).__mirrored = true;
}

/* ---------------- startup ---------------- */

let initPromise: Promise<void> | null = null;

/** เรียกครั้งเดียวตอนเปิดแอป (main.tsx) */
export function initCloudSync(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!cloudSyncConfigured()) return; // ไม่มีคีย์ → ใช้ localStorage อย่างเดียว
    installWriteInterceptor();
    const { errors } = await hydrateFromCloud();
    if (errors.length) console.warn('[cloudSync] hydrate errors:', errors);
    // mirror การเขียนทั้งหมดตั้งแต่นี้
    for (const k of SYNCED_KEYS) {
      const meta = localStorage.getItem(metaKey(k));
      if (!meta) localStorage.setItem(metaKey(k), '0');
    }
  })();
  return initPromise;
}
