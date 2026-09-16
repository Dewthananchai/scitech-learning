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
  // (ย้ายไปตารางจริงแล้ว — src/api/recordApi.ts: scitech_worksheet_submissions,
  //  scitech_attendance_records เหลือใน localStorage เป็น cache/outbox เท่านั้น)
  'scitech_grades_journal',
  'scitech_announcements',
  'scitech_calendar',
  'scitech_attendance_sessions',
  'scitech_missions',
  'scitech_daily_missions',
  'scitech_mission_completions',
  'scitech_star_awards',
  'scitech_star_conditions',
  'scitech_quiz_history',
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

/**
 * คีย์ "ข้อมูลที่ครูสร้าง" — อาร์เรย์ว่างห้ามขึ้นคลาวด์ และห้ามถูกดาวน์โหลดมาทับข้อมูลจริง
 * (สาเหตุของ "ย้ายเครื่องแล้วบทเรียนหายหมด": เครื่องใหม่ mount ก่อนข้อมูลมา → state เริ่มต้น
 * [] → ถูกอัปโหลดทับคลาวด์) คีย์ฝั่งความคืบหน้านักเรียน/เซสชัน ที่ล้างได้ตามปกติ ไม่อยู่ในลิสต์นี้
 */
const PROTECTED_KEYS = new Set<string>([
  'scitech_users',
  'scitech_subjects',
  'scitech_lessons',
  'scitech_questions',
  'scitech_quizzes',
  'scitech_announcements',
  'scitech_calendar',
  'scitech_worksheets',
  'scitech_grades_journal',
  'scitech_star_awards',
  'scitech_star_conditions',
  'onet_bank_data_v1',
  'onet_levels_v1',
  'onet_years_v1',
  'm1_bank_data_v1',
  'm1_bank_schools_v1',
  'm1_bank_years_v1',
]);

function isEmptyArrayJson(raw: unknown): boolean {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) && v.length === 0;
  } catch {
    return false;
  }
}

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
/** ค่าล่าสุดที่เรารู้จักต่อคีย์ — ใช้ข้ามการอัปโหลดซ้ำของลูปเขียนจาก polling */
const lastKnown = new Map<string, string>();
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

  // กันข้อมูลสูญหาย: ก่อนอัปโหลดคำตอบ/ใบงานที่นักเรียนส่ง ต้องรวมกับคลาวด์ก่อน —
  // อุปกรณ์ที่ถือสำเนาเก่า (เช่น แท็บที่ยังรัน bundle เก่าและ poll ทุก 5 วิ)
  // จะไม่มีวันลบคะแนนที่ครูตรวจแล้ว หรือใบงานที่นักเรียนเพิ่งส่ง
  const subsEntry = batch.find(([id]) => id === SUBMISSIONS_KEY);
  if (subsEntry) {
    const merged = await mergeSubmissionsWithCloud(supabase, subsEntry[1].value);
    if (merged.changed) {
      try {
        localStorage.setItem(SUBMISSIONS_KEY, merged.value);
        localStorage.setItem(metaKey(SUBMISSIONS_KEY), String(Date.now()));
      } catch { /* ไม่บล็อกการอัปโหลด */ }
      rows = rows.map(r => (r.id === SUBMISSIONS_KEY ? { ...r, value: merged.value } : r));
    }
  }

  // สมุดจดผลตรวจ: รวมกับคลาวด์ (เฉพาะแถวตรวจแล้ว, เพิ่มได้ ลบไม่ได้) ก่อนอัปโหลด —
  // สมุดจดคือข้อมูลสำรองสุดท้ายที่ใช้กู้คะแนน ถ้าอุปกรณ์เก่าอัปโหลดทับคำตอบ
  const journalEntry = batch.find(([id]) => id === JOURNAL_KEY);
  if (journalEntry) {
    const healed = await mergeSubmissionsWithCloud(supabase, journalEntry[1].value, JOURNAL_MERGE);
    if (healed.changed) {
      try { localStorage.setItem(JOURNAL_KEY, healed.value); } catch { /* ignore */ }
      rows = rows.map(r => (r.id === JOURNAL_KEY ? { ...r, value: healed.value } : r));
    }
  }

  // กันข้อมูลสูญหาย: ก่อนอัปโหลดทะเบียนผู้ใช้ ต้องรวมรหัสผ่านจากคลาวด์กลับเข้า
  // สำเนาท้องถิ่นเสมอ — อุปกรณ์ที่ถือสำเนาเก่า/รหัสผ่านว่าง จะไม่มีวันลบรหัสผ่าน
  // ของผู้ใช้บนคลาวด์ (สาเหตุของปัญหา "ล็อกอินไม่ได้" ที่เคยเกิดซ้ำ)
  const usersEntry = batch.find(([id]) => id === USER_REGISTER_KEY);
  if (usersEntry) {
    // (1) normalize: เติมฟิลด์ที่จำเป็นให้ครบ (is_active/class_name/grade_level)
    //     เดิมทะเบียนที่ถูกเขียนโดยไม่ครบฟิลด์ (ค่า null) ทำให้หน้าครูกรองนักเรียนไม่เจอ
    //     → ตรวจใบงานไม่ได้ แม้นักเรียนส่งงานแล้ว
    let localValue = normalizeUserRegister(usersEntry[1].value);
    // (2) merge: รหัสผ่านจากคลาวด์ห้ามหาย — เติมกลับก่อนอัปโหลดเสมอ
    const merged = await mergeUserPasswordsWithCloud(supabase, localValue);
    if (merged.changed) localValue = merged.value;
    if (localValue !== usersEntry[1].value) {
      try {
        localStorage.setItem(USER_REGISTER_KEY, localValue);
        localStorage.setItem(metaKey(USER_REGISTER_KEY), String(Date.now()));
      } catch { /* ไม่บล็อกการอัปโหลด */ }
      rows = rows.map(r => (r.id === USER_REGISTER_KEY ? { ...r, value: localValue } : r));
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

/** keys ที่ hydrate ดาวน์โหลดจริงในรอบล่าสุด (ใช้แจ้ง listeners) */
const lastSyncedKeys = new Set<string>();

/** ดึงข้อมูลจากคลาวด์มาอัปเดต localStorage เฉพาะแถวที่คลาวด์ใหม่กว่า */
export async function hydrateFromCloud(): Promise<{ synced: number; errors: string[] }> {
  const supabase = getClient();
  if (!supabase) return { synced: 0, errors: [] };
  if (hydrating) return { synced: 0, errors: [] }; // กันเรียกซ้อนจาก polling + focus
  hydrating = true;
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
    const rows = (data ?? []).filter(r => SYNCED_KEYS.includes(r.id));

    /* --- รอบ 1: กู้ผลตรวจจากสมุดจด (ก่อนพิจารณา timestamp ใด ๆ) ---
       อุปกรณ์ที่รัน bundle เก่ายังอัปโหลดทับคำตอบด้วยสำเนาเก่าได้ (blind write-through)
       สมุดจด (append-only) คือข้อมูลสำรองที่มันไม่แตะ — ผลตรวจที่หายจะถูกเติมกลับ
       เข้าทั้งสำเนาคลาวด์และสำเนาเครื่องก่อนที่รอบ 2 จะเทียบ timestamp */
    const journalRow = rows.find(r => r.id === JOURNAL_KEY);
    const subsRow = rows.find(r => r.id === SUBMISSIONS_KEY);
    if (journalRow && subsRow) {
      const restored = restoreGradesFromJournal(subsRow, journalRow);
      if (restored.changedSubs) {
        subsRow.value = restored.subsValue;
        subsRow.updated_at = new Date().toISOString();
      }
      if (restored.changedJournal) journalRow.value = restored.journalValue;
    }

    for (const row of rows) {
      if (!SYNCED_KEYS.includes(row.id)) continue;
      const local = localStorage.getItem(row.id);
      const localMeta = localStorage.getItem(metaKey(row.id));
      const cloudAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      const localAt = localMeta ? Number(localMeta) : 0;
      if (!local || cloudAt > localAt) {
        const raw = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
        // กันข้อมูลสูญหาย: คลาวด์เป็น "อาร์เรย์ว่าง" แต่เครื่องนี้มีข้อมูลจริง —
        // นี่คือรอยเท้าของเครื่องที่อัปโหลด [] ทับ (บั๊กเปิดแอปก่อนข้อมูลมา)
        // → ห้ามทับของเครื่องนี้ และดันข้อมูลจริงกลับขึ้นคลาวด์ทันที (กู้คืนอัตโนมัติ)
        if (local && PROTECTED_KEYS.has(row.id) && isEmptyArrayJson(raw) && !isEmptyArrayJson(local)) {
          console.warn(`[cloudSync] คลาวด์ของ ${row.id} เป็นอาร์เรย์ว่าง — คงข้อมูลจริงในเครื่องไว้และอัปโหลดกู้คืน`);
          lastKnown.set(row.id, local);
          dirty.set(row.id, { value: local, updatedAt: new Date().toISOString() });
          scheduleFlush();
          continue;
        }
        // ทะเบียนผู้ใช้: normalize ทุกครั้งที่ดึงจากคลาวด์ — เติมฟิลด์ที่หาย (is_active/class_name/grade_level)
        const value = row.id === USER_REGISTER_KEY ? normalizeUserRegister(raw) : raw;
        // ต้องจำค่าลง lastKnown ก่อน setItem — มิฉะนั้น write interceptor จะถือว่า
        // "มีการเขียนใหม่" แล้วอัปโหลดค่าที่เพิ่งดาวน์โหลดกลับขึ้นคลาวด์ทุกคีย์ทุกครั้งที่เปิดแอป
        lastKnown.set(row.id, value);
        localStorage.setItem(row.id, value);
        localStorage.setItem(metaKey(row.id), String(cloudAt || Date.now()));
        lastSyncedKeys.add(row.id); // แจ้ง UI ที่ subscribe key นี้
        if (value !== raw) {
          // สำเนาที่เติมฟิลด์ครบแล้วต่างจากคลาวด์ → อัปโหลดเวอร์ชันที่ครบกลับขึ้นไป
          dirty.set(row.id, { value, updatedAt: new Date().toISOString() });
          scheduleFlush();
        }
        synced++;
      } else {
        lastKnown.set(row.id, local); // สำเนาเครื่องใหม่กว่า — จำไว้ ไม่ให้ polling ยัดซ้ำ
        // กู้คืนอัตโนมัติ (กรณีเวลาเครื่องนี้ใหม่กว่าคลาวด์ด้วย): คลาวด์ว่างแต่เครื่องนี้
        // มีข้อมูลจริง → ดันกลับขึ้นคลาวด์เสมอ ไม่สน timestamp (อุปกรณ์ใดที่ยังมีบทเรียน
        // ครบจะกลายเป็นตัวกู้ข้อมูลให้ทั้งระบบโดยอัตโนมัติ)
        if (PROTECTED_KEYS.has(row.id) && isEmptyArrayJson(row.value) && !isEmptyArrayJson(local)) {
          console.warn(`[cloudSync] คลาวด์ของ ${row.id} ว่างแต่เครื่องนี้มีข้อมูลจริง — อัปโหลดกู้คืน`);
          dirty.set(row.id, { value: local, updatedAt: new Date().toISOString() });
          scheduleFlush();
        }
        if (row.id === USER_REGISTER_KEY) {
        let merged = mergePasswords(local, row.value);
        // และ normalize ฟิลด์ที่จำเป็นด้วย — กันทะเบียนที่ไม่ครบฟิลด์วนกลับมาใหม่
        const norm = normalizeUserRegister(merged);
        if (norm !== local) {
          merged = norm;
          localStorage.setItem(row.id, merged);
          localStorage.setItem(metaKey(row.id), String(Date.now()));
          lastKnown.set(row.id, merged);
          mirrorWrite(row.id);
          synced++;
          lastSyncedKeys.add(row.id);
        }
        }
      }
    }
  } catch (e) {
    errors.push(String(e));
  } finally {
    hydrating = false;
  }
  return { synced, errors };
}
let hydrating = false;

/* ---------------- live cloud updates (ครูสร้าง → นักเรียนเห็นทันที) ----------------
   ดึงข้อมูลจากคลาวด์เป็นระยะ (เฉพาะแถวที่คลาวด์ใหม่กว่า) — เครื่องที่เปิดค้างไว้
   จะได้รับบทเรียน/ข้อสอบ/ประกาศใหม่จากอุปกรณ์อื่นโดยไม่ต้องรีโหลดหน้า */
const CLOUD_POLL_MS = 5000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/** keys ที่เปลี่ยนจากคลาวด์ล่าสุด — UI ที่สนใจ key ไหน subscribe ผ่าน onCloudKeyChanged */
const keyListeners = new Map<string, Set<() => void>>();

/** สมัครรับการแจ้งเตือนเมื่อคลาวด์ส่งข้อมูลใหม่ของ key มาอัปเดต localStorage */
export function onCloudKeyChanged(key: string, fn: () => void): () => void {
  if (!keyListeners.has(key)) keyListeners.set(key, new Set());
  keyListeners.get(key)!.add(fn);
  return () => { keyListeners.get(key)?.delete(fn); };
}

function startCloudPolling(): void {
  if (pollTimer || typeof window === 'undefined') return;
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return; // แท็บถูกซ่อน — ประหยัดแบนด์วิดท์
    void hydrateFromCloud().then(({ synced }) => {
      if (synced > 0) {
        lastSyncedKeys.forEach(k => keyListeners.get(k)?.forEach(fn => fn()));
        lastSyncedKeys.clear();
      }
    });
  }, CLOUD_POLL_MS);
  // ดึงทันทีเมื่อกลับมาที่แท็บด้วย
  window.addEventListener('focus', () => { void hydrateFromCloud(); });
}

/** รวมรหัสผ่านจากคลาวด์ (cloudRaw) เข้าสำเนาท้องถิ่น (localRaw) — คืน JSON ใหม่ถ้ามีการเติมรหัสผ่านที่หายไป */
function mergePasswords(localRaw: string, cloudRaw: unknown): string {
  try {
    const parse = (v: unknown): Array<Record<string, unknown>> =>
      typeof v === 'string' ? JSON.parse(v) : (v as Array<Record<string, unknown>>);
    const localUsers = parse(localRaw);
    const cloudUsers = parse(cloudRaw);
    const keyOf = (u: Record<string, unknown>) => String(u.username ?? '').toLowerCase().trim();
    const cloudBy = new Map(cloudUsers.map(u => [keyOf(u), u]));
    let changed = false;
    const merged = localUsers.map(u => {
      const pw = String((u.password as string | undefined) ?? '').trim();
      const cloudPw = String((cloudBy.get(keyOf(u))?.password as string | undefined) ?? '').trim();
      if (!pw && cloudPw) { changed = true; return { ...u, password: cloudPw }; }
      return u;
    });
    return changed ? JSON.stringify(merged) : localRaw;
  } catch {
    return localRaw;
  }
}

const metaKey = (id: string) => `__synced_at__${id}`;

const USER_REGISTER_KEY = 'scitech_users';
/** (ย้ายไปตารางจริง recordApi แล้ว — คง merge สมุดจดไว้เพื่อกู้คะแนนเก่า) */
const SUBMISSIONS_KEY = 'scitech_worksheet_submissions';
/** สมุดจดผลการตรวจ (append-only) — กันคะแนนหายแม้ถูกอุปกรณ์เก่าทับ */
const JOURNAL_KEY = 'scitech_grades_journal';
/** โหมดรวมสำหรับสมุดจด: คะแนนที่ตรวจแล้วเพิ่มได้เรื่อย ๆ ห้ามถูกถอดออก */
const JOURNAL_MERGE = true;

/**
 * เติมฟิลด์ที่จำเป็นของทะเบียนผู้ใช้ให้ครบก่อนบันทึก/อัปโหลด:
 *  • is_active ห้ามเป็น null/undefined (แปลว่า "ปิดใช้งาน" ในทุกฟิลเตอร์ของหน้าครู)
 *  • นักเรียนต้องมี grade_level และ class_name — ไม่งั้นหน้าตรวจใบงาน/เช็คชื่อหาเด็กไม่เจอ
 */
export function normalizeUserRegister(raw: string): string {
  try {
    const users = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(users)) return raw;
    let changed = false;
    const fixed = users.map(u => {
      const nu = { ...u };
      if (nu.is_active !== false && nu.is_active !== true) { nu.is_active = true; changed = true; }
      const role = String(nu.role ?? '');
      if (role === 'student') {
        const grade = Number(nu.grade_level);
        if (!Number.isFinite(grade) || grade < 1 || grade > 6) { nu.grade_level = 1; changed = true; }
        if (!String(nu.class_name ?? '').trim()) { nu.class_name = `${nu.grade_level || 1}/1`; changed = true; }
      }
      return changed ? nu : u;
    });
    return changed ? JSON.stringify(fixed) : raw;
  } catch {
    return raw;
  }
}

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

/**
 * กู้ผลตรวจจากสมุดจดกลับเข้ารายการคำตอบ (เรียกก่อนเทียบ timestamp ใน hydrate):
 *  • ทุกแถวตรวจแล้วในสมุดจดที่คำตอบปัจจุบันยังไม่มี (หรือยังไม่ตรวจ) → เติมกลับ
 *  • ผลตรวจใหม่ในคำตอบที่สมุดจดยังไม่มี → เขียนลงสมุดจดด้วย (สมุดจดโตได้เรื่อย ๆ)
 */
function restoreGradesFromJournal(
  subsRow: { value: unknown; updated_at: string | null },
  journalRow: { value: unknown },
): { subsValue: string; journalValue: string; changedSubs: boolean; changedJournal: boolean } {
  const subsValue = typeof subsRow.value === 'string' ? subsRow.value : JSON.stringify(subsRow.value);
  const journalValue = typeof journalRow.value === 'string' ? journalRow.value : JSON.stringify(journalRow.value);
  const out = { subsValue, journalValue, changedSubs: false, changedJournal: false };
  try {
    const parse = (v: unknown): Array<Record<string, unknown>> =>
      typeof v === 'string' ? JSON.parse(v) : (v as Array<Record<string, unknown>>);
    const subs = parse(subsValue);
    let journal = parse(journalValue);
    if (!Array.isArray(subs)) return out;
    if (!Array.isArray(journal)) journal = [];
    const keyOf = (s: Record<string, unknown>) => `${s.worksheet_id}:${s.student_id}`;
    const journalBy = new Map(journal.map(s => [keyOf(s), s]));

    // (a) ผลตรวจใหม่จากคำตอบปัจจุบัน → เพิ่มเข้าสมุดจด
    for (const s of subs) {
      if (s.status !== 'graded') continue;
      const j = journalBy.get(keyOf(s));
      const at = String(s.graded_at ?? '');
      if (!j || String(j.graded_at ?? '') < at) {
        if (j) { journal = journal.map(x => (keyOf(x) === keyOf(s) ? s : x)); }
        else { journal.push(s); journalBy.set(keyOf(s), s); }
        out.changedJournal = true;
      }
    }

    // (b) ผลตรวจจากสมุดจดที่คำตอบปัจจุบันขาดหาย/ถูกถอด → เติมกลับ
    const subsBy = new Map(subs.map(s => [keyOf(s), s]));
    for (const j of journal) {
      const s = subsBy.get(keyOf(j));
      if (!s || s.status !== 'graded') {
        const at = String(j.graded_at ?? '');
        // แถวคำตอบปัจจุบันยังไม่ตรวจ แต่สมุดจดบอกว่าเคยตรวจ — ถ้าสมุดใหม่กว่าที่คำตอบส่ง
        const curAt = s ? String(s.submitted_at ?? '') : '';
        // เทียบไม่ได้ตรง ๆ (รูปแบบไทย/ISO) — ใช้กฎ: สมุดจดชนะเมื่อคำตอบปัจจุบันยังไม่ตรวจ
        void curAt; void at;
        if (s) {
          out.subsValue = JSON.stringify(subs.map(x => (keyOf(x) === keyOf(j) ? j : x)));
        } else {
          out.subsValue = JSON.stringify([...(parse(out.subsValue)), j]);
        }
        out.changedSubs = true;
        subsBy.set(keyOf(j), j);
      } else if (String(j.graded_at ?? '') > String(s.graded_at ?? '')) {
        // สมุดจดมีผลตรวจใหม่กว่า (ครูตรวจซ้ำจากเครื่องอื่น)
        out.subsValue = JSON.stringify(subsBy.size ? JSON.parse(out.subsValue).map((x: Record<string, unknown>) => (keyOf(x) === keyOf(j) ? j : x)) : [j]);
        out.changedSubs = true;
        subsBy.set(keyOf(j), j);
      }
    }
  } catch { /* ข้อมูลพัง — คืนค่าเดิม */ }
  return out;
}

/**
 * รวมคำตอบใบงานที่นักเรียนส่ง (คลาวด์ + ท้องถิ่น) ก่อนอัปโหลด — ห้ามข้อมูลหาย:
 *  • แถวที่มีเฉพาะในคลาวด์ (นักเรียนคนอื่นส่งจากเครื่องอื่น / ครูตรวจแล้ว) → เก็บไว้
 *  • แถวซ้ำ: เวอร์ชันที่ "ตรวจแล้ว" ชนะเสมอ; ถ้ายังไม่ตรวจ เอาเวอร์ชันที่ส่งล่าสุด
 * คืน JSON ใหม่ถ้ามีการรวม, คืนค่าเดิมถ้าไม่ต่าง
 */
async function mergeSubmissionsWithCloud(
  supabase: SupabaseClient,
  localValue: string,
  journalMode = false,
): Promise<{ value: string; changed: boolean }> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('value')
      .eq('id', SUBMISSIONS_KEY)
      .maybeSingle();
    if (error || !data?.value) return { value: localValue, changed: false };
    const parse = (v: unknown): Array<Record<string, unknown>> =>
      typeof v === 'string' ? JSON.parse(v) : (v as Array<Record<string, unknown>>);
    const localSubs = parse(localValue);
    const cloudSubs = parse(data.value);
    if (!Array.isArray(localSubs) || !Array.isArray(cloudSubs)) return { value: localValue, changed: false };

    const keyOf = (s: Record<string, unknown>) => `${s.worksheet_id}:${s.student_id}`;
    const localBy = new Map(localSubs.map(s => [keyOf(s), s]));
    const merged: Array<Record<string, unknown>> = [];
    let changed = false;

    for (const cloud of cloudSubs) {
      const local = localBy.get(keyOf(cloud));
      if (!local) {
        // มีเฉพาะในคลาวด์ (นักเรียนส่งจากเครื่องอื่น / ครูตรวจจากเครื่องอื่น) — เก็บ
        merged.push(cloud);
        changed = true;
        continue;
      }
      const cloudGraded = cloud.status === 'graded';
      const localGraded = local.status === 'graded';
      if (journalMode) {
        // สมุดจด: เก็บเฉพาะผลตรวจ — เวอร์ชันที่ตรวจล่าสุด (graded_at ใหม่กว่า) ชนะ,
        // และผลตรวจที่มีอยู่ห้ามถอดออก (ถ้าเครื่องใดส่งเวอร์ชันไม่ตรวจมา ให้คงผลเดิม)
        const cAt = String(cloud.graded_at ?? '');
        const lAt = String(local.graded_at ?? '');
        if (cloudGraded && localGraded) merged.push(cAt >= lAt ? cloud : local);
        else if (cloudGraded) { merged.push(cloud); changed = true; }
        else if (localGraded) merged.push(local); // ผลตรวจของเครื่องนี้ — คงไว้ (ห้ามแทนด้วยแถวไม่ตรวจ)
        // ทั้งคู่ไม่ตรวจ → ไม่ใส่สมุดจด (สมุดจดเก็บเฉพาะผลตรวจ)
      } else if (cloudGraded && !localGraded) {
        merged.push(cloud); // ครูตรวจแล้วบนคลาวด์ — ชนะเสมอ
        changed = true;
      } else if (localGraded && !cloudGraded) {
        merged.push(local); // เครื่องนี้ตรวจแล้ว — อัปโหลดเวอร์ชันตรวจแล้ว
      } else {
        // ไม่มีใครตรวจ — เอาเวอร์ชันที่ส่งล่าสุด (submitted_at แบบ ISO เทียบได้, แบบไทยถือว่าเท่ากัน)
        const cAt = String(cloud.submitted_at ?? '');
        const lAt = String(local.submitted_at ?? '');
        merged.push(cAt > lAt ? cloud : local);
        if (cAt > lAt) changed = true;
      }
    }
    // แถวที่มีเฉพาะในเครื่อง (นักเรียนเพิ่งส่งจากเครื่องนี้) — เก็บไว้อัปโหลด
    // (สมุดจด: เก็บเฉพาะแถวที่ตรวจแล้วเท่านั้น)
    for (const local of localSubs) {
      if (cloudSubs.some(c => keyOf(c) === keyOf(local))) continue;
      if (journalMode && local.status !== 'graded') continue;
      merged.push(local);
    }
    return changed ? { value: JSON.stringify(merged), changed: true } : { value: localValue, changed: false };
  } catch {
    return { value: localValue, changed: false };
  }
}

/** เรียกหลังแอปเขียน localStorage ที่อยู่ใน SYNCED_KEYS — อัปโหลดตามหลัง (ข้ามถ้าข้อมูลไม่เปลี่ยน) */
export function mirrorWrite(key: string, value?: string): void {
  if (!SYNCED_KEYS.includes(key)) return;
  const val = value !== undefined ? value : localStorage.getItem(key);
  if (val === null) return;
  // กันข้อมูลสูญหาย: ข้อมูลครูเป็น "อาร์เรย์ว่าง" ห้ามอัปโหลด — เครื่องที่ state ยังไม่ hydrate
  // (แท็บเก่า/โค้ดเก่า/เน็ตช้า) จะไม่มีวันล้างข้อมูลจริงบนคลาวด์ด้วยสำเนาว่างอีก
  // (ถ้าล้างจริง ให้ลบทีละแถว — การอัปโหลดค่าที่ยังมีข้อมูลทำได้ปกติ)
  if (PROTECTED_KEYS.has(key) && isEmptyArrayJson(val)) {
    console.warn(`[cloudSync] ข้ามการอัปโหลด ${key}: เป็นอาร์เรย์ว่าง (กันล้างข้อมูลจริงบนคลาวด์)`);
    return;
  }
  // ข้ามถ้าค่าเหมือนค่าล่าสุดที่เรารู้จัก — ลูปเขียนซ้ำจาก polling จะไม่ปลุกการอัปโหลด
  // (กันอุปกรณ์สองเครื่องแย่งเขียนทับกัน: เครื่องที่ไม่ได้แก้จริงจะไม่มีวันชนะ timestamp)
  if (lastKnown.get(key) === val) return;
  lastKnown.set(key, val);
  const now = new Date().toISOString();
  localStorage.setItem(metaKey(key), String(Date.now()));
  dirty.set(key, { value: val, updatedAt: now });
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
    mirrorWrite(k, v);
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
    startCloudPolling(); // ครูสร้างบทเรียน → นักเรียนทุกเครื่องเห็นภายใน ~5 วิ
  })();
  return initPromise;
}
