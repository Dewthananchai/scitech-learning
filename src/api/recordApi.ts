/* ============================================================
   SciTech Learning — per-record Supabase API (Phase 1)
   ============================================================
   ทดแทนการซิงก์แบบ "blob เดียวต่อคีย์" ของ cloudSync สำหรับข้อมูลที่
   หลายเครื่องเขียนพร้อมกัน (คำตอบใบงาน, เช็คชื่อ):

   เดิม (cloudSync): อุปกรณ์ทุกเครื่องถือสำเนาอาร์เรย์ทั้งชุด → อัปโหลดทับ
   ทั้งก้อนตาม timestamp ล่าสุด → เครื่องไหน stale ก็ลบงานคนอื่นทิ้ง

   ใหม่ (ไฟล์นี้):    1 เรกคอร์ด = 1 แถวจริงใน Supabase
     • เขียนทีละแถว (insert/update) — ไม่มีวันลบงานคนอื่นโดยไม่ตั้งใจ
     • ลบเกิดได้เฉพาะเมื่อเจตนาลบ (deleteWorksheet cascade)
     • offline: เขียนลง localStorage (outbox, ธง _pending) แล้ว push ซ้ำ
       อัตโนมัติเมื่อออนไลน์ — เหมือนกลไกเดิมแต่อยู่ระดับ "แถว"
     • realtime: ฟัง postgres_changes แทนการ poll ทุก 5 วิ
     • localStorage เหลือเป็น cache สำหรับ boot ทันที + อ่านตอนออฟไลน์

   id เปลี่ยนเป็น string (uuid) — แถวที่ backfill จากข้อมูลเดิมใช้
   legacy_id เก็บตัวเลขเดิมเพื่อไม่ให้ข้อมูลหายตอนย้าย
   ============================================================ */

import { getClient, cloudSyncConfigured } from '../lib/cloudSync';
import type { WorksheetSubmission, AttendanceRecord } from '../types';

export type SubmissionId = string;   // uuid (หรือ `local:<uuid>` ระหว่างยังไม่ push)
export type AttendanceRecordId = string;

const LS_SUBMISSIONS = 'scitech_worksheet_submissions'; // cache + outbox (เดิม)
const LS_ATTENDANCE = 'scitech_attendance_records';     // cache + outbox (เดิม)

/* ---------------- localStorage cache (read-through + outbox) ---------------- */

function cacheRead<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cacheWrite<T>(key: string, rows: T[]): void {
  try {
    // หมายเหตุ: เขียนตรง ๆ (ไม่ผ่าน setItem ของ cloudSync อีกต่อไป —
    // คีย์นี้ถูกถอดออกจาก SYNCED_KEYS แล้ว) แต่ยังใช้ setItem เพื่อให้
    // หน้าที่อ่าน key เดิมโดยตรง (starAchievements) เห็นข้อมูลล่าสุด
    localStorage.setItem(key, JSON.stringify(rows));
  } catch { /* storage เต็ม — cache เท่านั้น ไม่กระทบความจริงบนคลาวด์ */ }
}

/** uuid แบบไม่พึ่ง crypto.randomUUID (กันเบราว์เซอร์เก่า/บริบทไม่ปลอดภัย) */
export function newRecordId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* fallthrough */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

/* ---------------- row <-> app-type mapping ---------------- */
/* db แถว (snake_case, timestamptz) ↔ app type (id: string, เวลาเป็น ISO string) */

type SubmissionRow = {
  id?: string;               // เว้นไว้เมื่อยังไม่มี uuid (outbox) → ให้เซิร์ฟเวอร์ gen เอง
  legacy_id?: number | null;
  worksheet_id: number;
  student_id: number;
  answers: WorksheetSubmission['answers'];
  submitted_at: string;
  is_late: boolean;
  status: 'submitted' | 'graded';
  total_score: number | null;
  graded_at: string | null;
  graded_by: string | null;
};

function rowToSubmission(r: SubmissionRow): WorksheetSubmission {
  return {
    id: String(r.id),
    worksheet_id: r.worksheet_id,
    student_id: r.student_id,
    answers: Array.isArray(r.answers) ? r.answers : [],
    submitted_at: r.submitted_at,
    is_late: r.is_late,
    ...(r.status ? { status: r.status } : {}),
    ...(r.total_score != null ? { total_score: Number(r.total_score) } : {}),
    ...(r.graded_at ? { graded_at: r.graded_at } : {}),
    ...(r.graded_by ? { graded_by: r.graded_by } : {}),
  } as WorksheetSubmission;
}

type AttendanceRow = {
  id?: string;               // เว้นไว้เมื่อยังไม่มี uuid (outbox) → ให้เซิร์ฟเวอร์ gen เอง
  legacy_id?: number | null;
  session_id: number;
  student_id: number;
  student_name: string;
  grade_level: number;
  status: AttendanceRecord['status'];
  checked_in_at: string | null;
  note: string | null;
};

function rowToRecord(r: AttendanceRow): AttendanceRecord {
  return {
    id: String(r.id),
    session_id: r.session_id,
    student_id: r.student_id,
    student_name: r.student_name ?? '',
    grade_level: r.grade_level ?? 1,
    status: r.status,
    ...(r.checked_in_at ? { checked_in_at: r.checked_in_at } : {}),
    ...(r.note ? { note: r.note } : {}),
  };
}

/** id ที่ยังเป็นตัวเลขเดิม (จาก localStorage ก่อน backfill) → รูปแบบใหม่ `legacy:<n>` */
function normalizeCache(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map(r => (typeof r.id === 'number' ? { ...r, id: `legacy:${r.id}` } : r));
}

/* ---------------- generic per-record CRUD ---------------- */

async function upsertRow(
  table: string,
  conflict: string[],
  row: Record<string, unknown>,
): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;
  const { error } = await supabase.from(table).upsert(row, { onConflict: conflict.join(',') });
  if (error) {
    console.warn(`[recordApi] ${table} upsert failed:`, error.message);
    return false;
  }
  return true;
}

async function fetchRows<T>(table: string, select: string, map: (r: never) => T): Promise<T[] | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select(select);
  if (error) {
    console.warn(`[recordApi] ${table} fetch failed:`, error.message);
    return null;
  }
  return (data ?? []).map(r => map(r as never));
}

async function deleteRow(table: string, id: string): Promise<boolean> {
  const supabase = getClient();
  if (!supabase) return false;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.warn(`[recordApi] ${table} delete failed:`, error.message);
    return false;
  }
  return true;
}
void deleteRow;

/* ---------------- submissions API ---------------- */

/** payload สำหรับตาราง worksheet_submissions (จาก app type)
 *  แถว local:* ยังไม่มี uuid → เว้น id ให้เซิร์ฟเวอร์ gen_random_uuid() เอง
 *  (ส่ง id: '' เข้าคอลัมน์ uuid จะพังทันที)
 *  legacy_id เว้นเสมอ (backfill เป็นผู้กำหนด) — ไม่งั้น upsert ชนแล้ว
 *  จะไปเขียนทับ/ชน unique index ของ legacy_id โดยไม่จำเป็น */
function submissionRow(s: WorksheetSubmission): SubmissionRow {
  const rawId = String(s.id);
  const uuid = rawId.startsWith('local:') || rawId.startsWith('legacy:') ? '' : rawId;
  return {
    ...(uuid ? { id: uuid } : {}),
    worksheet_id: s.worksheet_id,
    student_id: s.student_id,
    answers: s.answers ?? [],
    submitted_at: s.submitted_at,
    is_late: Boolean(s.is_late),
    status: s.status === 'graded' ? 'graded' : 'submitted',
    total_score: s.total_score != null ? s.total_score : null,
    graded_at: s.graded_at ?? null,
    graded_by: s.graded_by ?? null,
  };
}

export const submissionRecords = {
  /** รายการทั้งหมด: คลาวด์ก่อน, รวมกับ outbox ในเครื่อง (แถว local:/legacy: ที่ยัง push ไม่ขึ้น) */
  async list(): Promise<{ data: WorksheetSubmission[]; fromCloud: boolean }> {
    const cloud = await fetchRows<WorksheetSubmission>(
      'worksheet_submissions', '*', rowToSubmission as (r: never) => WorksheetSubmission);
    if (cloud === null) {
      // ออฟไลน์/ยังไม่ตั้งค่า → ใช้ cache เดิม (normalize id ให้เป็นรูปแบบใหม่)
      const cached = normalizeCache(cacheRead<Record<string, unknown>>(LS_SUBMISSIONS)) as unknown as WorksheetSubmission[];
      return { data: cached, fromCloud: false };
    }
    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_SUBMISSIONS)) as unknown as WorksheetSubmission[];
    const keyOf = (s: WorksheetSubmission) => `${s.worksheet_id}:${s.student_id}`;
    const byKey = new Map(cloud.map(s => [keyOf(s), s]));
    // แถวที่ยัง push ไม่ขึ้นต้องรอด — ทั้ง local:* (งานใหม่) และ legacy:* (ข้อมูลเดิมที่
    // เครื่องนี้ถือสำเนาใหม่กว่า blob บนคลาวด์ และยังไม่เคยถูก push ขึ้นตาราง)
    // ถ้าไม่กันไว้ การ list รอบแรกจะ "หาย" ข้อมูลที่เครื่องนี้มีแต่คลาวด์ยังไม่มี
    const outbox = cache.filter(s =>
      (String(s.id).startsWith('local:') || String(s.id).startsWith('legacy:')) &&
      !byKey.has(keyOf(s)));
    // outbox ก่อน (คำตอบที่เพิ่งส่งจากเครื่องนี้), ส่วนคลาวด์คงลำดับเดิม
    // (ไม่เรียงโดย submitted_at — ค่าเดิมเป็นข้อความ locale ไทย เทียบแบบ string ไม่ได้)
    const merged = [...outbox, ...byKey.values()];
    cacheWrite(LS_SUBMISSIONS, merged);
    return { data: merged, fromCloud: true };
  },

  /** นักเรียนส่งงาน (หรือส่งซ้ำ — ทับแถวเดิมของคู่ worksheet/student) */
  async submit(submission: Omit<WorksheetSubmission, 'id'> & { id?: WorksheetSubmission | number }): Promise<WorksheetSubmission> {
    const localId = `local:${newRecordId()}`;
    const local: WorksheetSubmission = { ...(submission as WorksheetSubmission), id: localId };

    // เขียน cache ก่อนเสมอ — UI ตอบสนองทันที ออฟไลน์ก็ไม่หาย
    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_SUBMISSIONS)) as unknown as WorksheetSubmission[];
    const keyOf = (s: WorksheetSubmission) => `${s.worksheet_id}:${s.student_id}`;
    cacheWrite(LS_SUBMISSIONS, [local, ...cache.filter(s => keyOf(s) !== keyOf(local))]);

    // push เบื้องหลัง — สำเร็จหรือไม่ แถวอยู่ใน cache แล้ว (id local:* = outbox
    // ถ้ายังไม่ขึ้นคลาวด์; refresh รอบหน้าจะแทนด้วยแถวจริงจากเซิร์ฟเวอร์)
    void upsertRow('worksheet_submissions', ['worksheet_id', 'student_id'],
      submissionRow(local) as unknown as Record<string, unknown>);
    return local;
  },

  /** ครูตรวจ/แก้คะแนน — อัปเดตทีละแถว ไม่แตะแถวอื่น */
  async update(id: string | number, updates: Partial<WorksheetSubmission>): Promise<boolean> {
    // อัปเดต cache ทันที แล้วใช้ "อาร์เรย์หลังอัปเดต" สำหรับ push (ไม่งั้นอัปโหลดค่าเก่า)
    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_SUBMISSIONS)) as unknown as WorksheetSubmission[];
    const updated = cache.map(s => (String(s.id) === String(id) ? { ...s, ...updates, id: s.id } : s));
    cacheWrite(LS_SUBMISSIONS, updated);

    // แถว legacy:<n> (ย้ายจากข้อมูลเดิม) หรือ local:<uuid> (ยัง push ไม่ขึ้น) —
    // ไม่มี uuid จริงบนคลาวด์ → upsert ตามคู่ (worksheet, student) ด้วยแถวเต็มหลังอัปเดต
    if (String(id).startsWith('legacy:') || String(id).startsWith('local:')) {
      const full = updated.find(s => String(s.id) === String(id));
      if (!full) return false;
      return upsertRow('worksheet_submissions', ['worksheet_id', 'student_id'],
        submissionRow(full) as unknown as Record<string, unknown>);
    }
    const patch: Record<string, unknown> = {
      ...(updates.answers !== undefined ? { answers: updates.answers } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.total_score !== undefined ? { total_score: updates.total_score } : {}),
      ...(updates.graded_at !== undefined ? { graded_at: updates.graded_at } : {}),
      ...(updates.graded_by !== undefined ? { graded_by: updates.graded_by } : {}),
      ...(updates.submitted_at !== undefined ? { submitted_at: updates.submitted_at } : {}),
    };
    return upsertRow('worksheet_submissions', ['id'], { id, ...patch });
  },

  /** ลบคำตอบเดียว (ใช้เมื่อลบใบงาน — cascade) */
  async removeByWorksheet(worksheetId: number): Promise<void> {
    const cache = cacheRead<WorksheetSubmission>(LS_SUBMISSIONS);
    cacheWrite(LS_SUBMISSIONS, cache.filter(s => s.worksheet_id !== worksheetId));
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('worksheet_submissions').delete().eq('worksheet_id', worksheetId);
  },

  /** ดัน outbox ทั้งหมดขึ้นคลาวด์ (เรียกตอน sync รอบปกติ)
   *  รวม legacy:* ด้วย — เครื่องที่ถือข้อมูลเก่าที่ใหม่กว่า blob บนคลาวด์
   *  จะได้ push ขึ้นตารางเองอัตโนมัติ (กันข้อมูลหายช่วงเปลี่ยนระบบ)
   *  หมายเหตุ: ส่ง legacy_id = null เสมอ เพื่อไม่ชน unique index ของ legacy_id
   *  (คู่ worksheet+student คือตัวกำหนดแถว — ตัวเลขเดิมเป็นแค่ข้อมูลอ้างอิง) */
  async flushOutbox(): Promise<number> {
    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_SUBMISSIONS)) as unknown as WorksheetSubmission[];
    let pushed = 0;
    for (const s of cache.filter(x =>
      String(x.id).startsWith('local:') || String(x.id).startsWith('legacy:'))) {
      const ok = await upsertRow('worksheet_submissions', ['worksheet_id', 'student_id'],
        submissionRow(s) as unknown as Record<string, unknown>);
      // push สำเร็จ: คง id local:* ไว้ใน cache — refresh รอบถัดไปจะแทนด้วย
      // แถวจริงจากคลาวด์ให้เอง (จับคู่ด้วย worksheet_id+student_id)
      if (ok) pushed++;
    }
    return pushed;
  },
};

/* ---------------- attendance records API ---------------- */

/** legacy_id เว้นเสมอ (backfill เป็นผู้กำหนด) — เหตุผลเดียวกับ submissionRow */
function attendanceRow(r: AttendanceRecord): AttendanceRow {
  const rawId = String(r.id);
  const uuid = rawId.startsWith('local:') || rawId.startsWith('legacy:') ? '' : rawId;
  return {
    ...(uuid ? { id: uuid } : {}),
    session_id: r.session_id,
    student_id: r.student_id,
    student_name: r.student_name ?? '',
    grade_level: r.grade_level ?? 1,
    status: r.status,
    checked_in_at: r.checked_in_at ?? null,
    note: r.note ?? null,
  };
}

export const attendanceRecords = {
  async list(): Promise<{ data: AttendanceRecord[]; fromCloud: boolean }> {
    const cloud = await fetchRows<AttendanceRecord>(
      'attendance_records', '*', rowToRecord as (r: never) => AttendanceRecord);
    if (cloud === null) {
      const cached = normalizeCache(cacheRead<Record<string, unknown>>(LS_ATTENDANCE)) as unknown as AttendanceRecord[];
      return { data: cached, fromCloud: false };
    }
    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_ATTENDANCE)) as unknown as AttendanceRecord[];
    const keyOf = (r: AttendanceRecord) => `${r.session_id}:${r.student_id}`;
    const byKey = new Map(cloud.map(r => [keyOf(r), r]));
    const outbox = cache.filter(r =>
      (String(r.id).startsWith('local:') || String(r.id).startsWith('legacy:')) &&
      !byKey.has(keyOf(r)));
    const merged = [...outbox, ...byKey.values()];
    cacheWrite(LS_ATTENDANCE, merged);
    return { data: merged, fromCloud: true };
  },

  /** เช็คชื่อ/บันทึกสถานะ (ส่งซ้ำ = ทับแถวเดิมของคู่ session/student)
   *  เขียน cache ทันทีแบบ sync (UI ตอบสนองเหมือนเดิม) แล้ว push คลาวด์เบื้องหลัง */
  add(record: Omit<AttendanceRecord, 'id' | 'checked_in_at'> & { checked_in_at?: string }): AttendanceRecord {
    const local: AttendanceRecord = {
      ...(record as Omit<AttendanceRecord, 'id' | 'checked_in_at'>),
      id: `local:${newRecordId()}`,
      checked_in_at: record.checked_in_at ?? new Date().toISOString(),
    } as AttendanceRecord;

    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_ATTENDANCE)) as unknown as AttendanceRecord[];
    const keyOf = (r: AttendanceRecord) => `${r.session_id}:${r.student_id}`;
    cacheWrite(LS_ATTENDANCE, [local, ...cache.filter(r => keyOf(r) !== keyOf(local))]);

    void upsertRow('attendance_records', ['session_id', 'student_id'],
      attendanceRow(local) as unknown as Record<string, unknown>);
    return local;
  },

  async update(id: string | number, updates: Partial<AttendanceRecord>): Promise<boolean> {
    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_ATTENDANCE)) as unknown as AttendanceRecord[];
    const updated = cache.map(r => (String(r.id) === String(id) ? { ...r, ...updates, id: r.id } : r));
    cacheWrite(LS_ATTENDANCE, updated);

    if (String(id).startsWith('legacy:') || String(id).startsWith('local:')) {
      const full = updated.find(r => String(r.id) === String(id));
      if (!full) return false;
      return upsertRow('attendance_records', ['session_id', 'student_id'],
        attendanceRow(full) as unknown as Record<string, unknown>);
    }
    const patch: Record<string, unknown> = {
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.note !== undefined ? { note: updates.note } : {}),
      ...(updates.checked_in_at !== undefined ? { checked_in_at: updates.checked_in_at } : {}),
    };
    return upsertRow('attendance_records', ['id'], { id, ...patch });
  },

  /** ลบเรกคอร์ดทั้งเซสชัน (ตอนครูลบเซสชันเช็คชื่อ) */
  async removeBySession(sessionId: number): Promise<void> {
    const cache = cacheRead<AttendanceRecord>(LS_ATTENDANCE);
    cacheWrite(LS_ATTENDANCE, cache.filter(r => r.session_id !== sessionId));
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('attendance_records').delete().eq('session_id', sessionId);
  },

  async flushOutbox(): Promise<number> {
    const cache = normalizeCache(cacheRead<Record<string, unknown>>(LS_ATTENDANCE)) as unknown as AttendanceRecord[];
    let pushed = 0;
    for (const r of cache.filter(x =>
      String(x.id).startsWith('local:') || String(x.id).startsWith('legacy:'))) {
      const ok = await upsertRow('attendance_records', ['session_id', 'student_id'],
        attendanceRow(r) as unknown as Record<string, unknown>);
      if (ok) pushed++; // refresh รอบถัดไปจะแทนแถว local:*/legacy:* ด้วยแถวจริงจากคลาวด์
    }
    return pushed;
  },
};

/* ---------------- one-time backfill: blob → ตารางจริง ---------------- */

const BACKFILL_FLAG = 'scitech_records_backfill_v1';

/**
 * ย้ายข้อมูลจาก app_state blob เดิมเข้าตารางใหม่ครั้งเดียว (idempotent):
 * อ่านค่าจากคลาวด์ก่อน (มีเครื่องใดถือสำเนาใหม่กว่าก็ได้ผลเดียวกัน)
 * แล้ว upsert ทีละแถว — unique index กันยัดซ้ำ รันกี่ครั้งก็ผลเดิม
 */
export async function backfillRecordsIfNeeded(): Promise<void> {
  const supabase = getClient();
  if (!supabase || !cloudSyncConfigured()) return;
  if (localStorage.getItem(BACKFILL_FLAG)) return;

  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('id, value')
      .in('id', [LS_SUBMISSIONS, LS_ATTENDANCE]);
    if (error) return;

    for (const row of data ?? []) {
      let arr: Array<Record<string, unknown>>;
      try {
        const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        if (!Array.isArray(parsed)) continue;
        arr = parsed;
      } catch { continue; }

      if (row.id === LS_SUBMISSIONS) {
        for (const raw of arr) {
          const s = raw as unknown as WorksheetSubmission & { id: number };
          if (s.worksheet_id == null || s.student_id == null) continue;
          await upsertRow('worksheet_submissions', ['worksheet_id', 'student_id'], {
            legacy_id: Number(s.id) || null,
            worksheet_id: Number(s.worksheet_id),
            student_id: Number(s.student_id),
            answers: s.answers ?? [],
            submitted_at: s.submitted_at ?? new Date().toISOString(),
            is_late: Boolean(s.is_late),
            status: s.status === 'graded' ? 'graded' : 'submitted',
            total_score: s.total_score ?? null,
            graded_at: s.graded_at ?? null,
            graded_by: s.graded_by ?? null,
          });
        }
      } else {
        for (const raw of arr) {
          const r = raw as unknown as AttendanceRecord & { id: number };
          if (r.session_id == null || r.student_id == null) continue;
          await upsertRow('attendance_records', ['session_id', 'student_id'], {
            legacy_id: Number(r.id) || null,
            session_id: Number(r.session_id),
            student_id: Number(r.student_id),
            student_name: r.student_name ?? '',
            grade_level: r.grade_level ?? 1,
            status: r.status ?? 'present',
            checked_in_at: r.checked_in_at ?? null,
            note: r.note ?? null,
          });
        }
      }
    }
    localStorage.setItem(BACKFILL_FLAG, new Date().toISOString());
    console.info('[recordApi] backfill จาก app_state เสร็จ (ครั้งเดียว)');
  } catch (e) {
    console.warn('[recordApi] backfill ข้าม (ลองใหม่ครั้งหน้า):', e);
  }
}

/* ---------------- realtime (แทน polling) + sync loop ---------------- */

let unsubscribers: Array<() => void> = [];
let syncTimer: ReturnType<typeof setInterval> | null = null;

/** listeners ต่อ cache-key — ใช้รูปแบบเดียวกับ onCloudKeyChanged เดิม */
const keyListeners = new Map<string, Set<() => void>>();

export function onRecordsChanged(key: string, fn: () => void): () => void {
  if (!keyListeners.has(key)) keyListeners.set(key, new Set());
  keyListeners.get(key)!.add(fn);
  return () => { keyListeners.get(key)?.delete(fn); };
}

function notify(key: string): void {
  keyListeners.get(key)?.forEach(fn => fn());
}

/**
 * เริ่มระบบ sync ต่อเรกคอร์ด (เรียกครั้งเดียวตอนเปิดแอป — main.tsx):
 * 1. backfill ข้อมูลเดิมครั้งแรก
 * 2. ดึงล่าสุดเข้า cache
 * 3. subscribe realtime → มีการเปลี่ยนแปลงจากเครื่องอื่น → อ่านซ้ำ → แจ้ง UI
 * 4. ทุก 30 วิ: push outbox + อ่านซ้ำ (กัน realtime หลุด, ประหยัดกว่า poll 5 วิ)
 */
export function initRecordSync(): void {
  if (syncTimer || typeof window === 'undefined') return;
  if (!cloudSyncConfigured()) return;

  const REFRESH_MS = 30000;

  const refresh = async (): Promise<void> => {
    await submissionRecords.flushOutbox();
    await attendanceRecords.flushOutbox();
    const subs = await submissionRecords.list();
    const att = await attendanceRecords.list();
    if (subs.fromCloud) notify(LS_SUBMISSIONS);
    if (att.fromCloud) notify(LS_ATTENDANCE);
  };

  void backfillRecordsIfNeeded().then(() => refresh());

  const supabase = getClient();
  if (supabase) {
    const sub = supabase
      .channel('scitech-records')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'worksheet_submissions' },
        () => { void submissionRecords.list().then(d => { if (d.fromCloud) notify(LS_SUBMISSIONS); }); })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => { void attendanceRecords.list().then(d => { if (d.fromCloud) notify(LS_ATTENDANCE); }); })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') console.info('[recordApi] realtime พร้อม');
      });
    unsubscribers.push(() => { void supabase.removeChannel(sub); });
  }

  // safety net: push outbox + อ่านซ้ำเป็นระยะ (กัน realtime หลุดเงียบ ๆ)
  syncTimer = setInterval(() => { void refresh(); }, REFRESH_MS);
  window.addEventListener('pagehide', () => { void flushNowRecords(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNowRecords();
  });
}

/** ดัน outbox ทันที (ตอนปิดแท็บ/สลับแท็บ) */
export async function flushNowRecords(): Promise<void> {
  try {
    await submissionRecords.flushOutbox();
    await attendanceRecords.flushOutbox();
  } catch { /* ออฟไลน์ — outbox รอรอบหน้า */ }
}

export function stopRecordSync(): void {
  unsubscribers.forEach(fn => fn());
  unsubscribers = [];
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

/** อ่าน cache ในเครื่องแบบ sync (ค่าเริ่มต้นของ hook + หลัง onRecordsChanged) */
export const cacheViews = {
  submissions(): WorksheetSubmission[] {
    return normalizeCache(cacheRead<Record<string, unknown>>(LS_SUBMISSIONS)) as unknown as WorksheetSubmission[];
  },
  attendance(): AttendanceRecord[] {
    return normalizeCache(cacheRead<Record<string, unknown>>(LS_ATTENDANCE)) as unknown as AttendanceRecord[];
  },
};
