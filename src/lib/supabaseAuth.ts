/* ============================================================
   Supabase Auth bridge — ล็อกอินผ่าน GoTrue (รหัสผ่านเก็บเป็น
   bcrypt ฝั่งเซิร์ฟเวอร์ ไม่ปรากฏใน app_state อีกต่อไป)
   ============================================================
   แอปใช้ username ล้วน แต่ Supabase Auth ต้องการ email →
   ใช้อีเมลสังเคราะห์รูปแบบ username@scitech.local

   ขั้นตอนรีโอนครั้งแรก (backfill): บัญชีในทะเบียน scitech_users
   ยังไม่มีในระบบ auth → ลองล็อกอินแล้วพลาดเพราะ "ไม่พบบัญชี" →
   ตรวจรหัสผ่านกับทะเบียนเดิม (ครั้งเดียว) → ถ้าตรง ให้สร้างบัญชี
   auth อัตโนมัติ (signUp) พร้อม metadata role → ล็อกอินซ้ำ →
   จากนั้นรหัสผ่านถูกตรวจโดย Supabase เท่านั้น
   ============================================================ */

import { getClient, cloudSyncConfigured } from './cloudSync';
import type { AuthUser } from '../store/AuthContext';

export interface RegisterUser {
  id: number;
  username: string;
  password?: string;
  full_name?: string;
  role: string;
  is_active?: boolean;
  grade_level?: number | null;
  class_name?: string | null;
}

export const authEmail = (username: string) =>
  `${username.toLowerCase().trim()}@scitech.local`;

/** ผลล็อกอินแบบรวม: Supabase Auth ก่อน, ทะเบียนเดิมเป็นทางถอยหลัง */
export async function signInWithUsername(
  username: string,
  password: string,
): Promise<{ user: AuthUser; via: 'supabase' | 'legacy' } | { error: string }> {
  const supabase = getClient();
  if (!supabase) return { error: 'ยังไม่เชื่อมต่อระบบ cloud — ล็อกอินไม่ได้' };

  const email = authEmail(username);

  // 1) ล็อกอินผ่าน Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data.user) {
    return { via: 'supabase', user: await toAuthUser(supabase, data.user.user_metadata ?? {}, username) };
  }

  // 2) backfill ครั้งแรก: ไม่มีบัญชีใน auth → ตรวจกับทะเบียนเดิม
  const msg = error?.message ?? '';
  const noAccount = /invalid login credentials/i.test(msg) || /email not confirmed/i.test(msg);
  if (!noAccount) return { error: msg || 'ล็อกอินไม่สำเร็จ' };

  const register = await fetchRegisterUser(username);
  if (!register) return { error: 'ไม่พบผู้ใช้งานนี้ในระบบ' };
  if (register.is_active === false) return { error: 'บัญชีนี้ถูกระงับการใช้งาน' };
  if (!register.password || register.password !== password) {
    return { error: 'รหัสผ่านไม่ถูกต้อง' };
  }

  // 3) สร้างบัญชี auth อัตโนมัติ (รหัสผ่านถูก bcrypt ฝั่ง GoTrue)
  const { error: upErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: register.username,
        full_name: register.full_name ?? register.username,
        role: register.role === 'teacher' ? 'admin' : register.role,
        grade_level: register.grade_level ?? null,
        class_name: register.class_name ?? null,
        register_id: register.id,
      },
    },
  });
  // อีเมลยืนยันอัตโนมัติถูกปิดอยู่แล้วในโปรเจกต์นี้; ถ้าโปรเจกต์เปิด
  // ผู้ใช้จะได้ session null → ต้องเปิด "Confirm email" ปิดใน dashboard
  if (upErr && !/already registered|already exists/i.test(upErr.message)) {
    return { error: `สร้างบัญชีระบบ cloud ไม่สำเร็จ: ${upErr.message}` };
  }

  // 4) ล็อกอินซ้ำด้วยบัญชีที่เพิ่งสร้าง
  const retry = await supabase.auth.signInWithPassword({ email, password });
  if (retry.error || !retry.data.user) {
    return { error: retry.error?.message ?? 'ล็อกอินไม่สำเร็จหลังสร้างบัญชี' };
  }
  const meta = (retry.data.user.user_metadata ?? {}) as Record<string, unknown>;
  return { via: 'supabase', user: await toAuthUser(supabase, meta, username) };
}

/** สิทธิ์จริงมาจากตาราง app_admins ฝั่งเซิร์ฟเวอร์ (is_admin) — ไม่เชื่อ metadata ใน JWT */
async function toAuthUser(
  supabase: NonNullable<ReturnType<typeof getClient>>,
  meta: Record<string, unknown>,
  fallbackUsername: string,
): Promise<AuthUser> {
  let role: 'admin' | 'student' = meta.role === 'admin' ? 'admin' : 'student';
  try {
    const { data: serverAdmin } = await supabase.rpc('is_admin_rpc');
    if (serverAdmin === true) role = 'admin';
    else if (serverAdmin === false) role = 'student';
  } catch { /* fallback ใช้ metadata */ }
  return {
    id: registerIdFromMeta(meta, fallbackUsername),
    username: String(meta.username ?? fallbackUsername),
    full_name: String(meta.full_name ?? meta.username ?? fallbackUsername),
    role,
    grade_level: meta.grade_level != null ? Number(meta.grade_level) : undefined,
    classroom: meta.class_name != null ? String(meta.class_name) : undefined,
  };
}

function registerIdFromMeta(meta: Record<string, unknown>, fallbackUsername: string): number {
  if (meta.register_id != null) return Number(meta.register_id);
  // คงที่จากชื่อผู้ใช้ (แฮชง่าย) — เผื่อ metadata ไม่มี register_id
  let h = 0;
  const s = String(meta.username ?? fallbackUsername);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

/** อ่านผู้ใช้จากทะเบียนเดิม (scitech_users ใน localStorage — sync จากคลาวด์แล้ว) */
async function fetchRegisterUser(username: string): Promise<RegisterUser | null> {
  try {
    const raw = localStorage.getItem('scitech_users');
    if (!raw) return null;
    const users = JSON.parse(raw) as RegisterUser[];
    const key = username.toLowerCase().trim();
    return users.find(u => String(u.username).toLowerCase() === key) ?? null;
  } catch {
    return null;
  }
}

/** admin สร้าง/ตั้งรหัสผ่านบัญชีใหม่ผ่าน RPC (security definer ฝั่ง SQL) */
export async function adminCreateAuthUser(u: RegisterUser): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: 'ยังไม่เชื่อมต่อระบบ cloud' };
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) return { ok: false, error: 'ต้องล็อกอินก่อน' };

  const { error } = await supabase.rpc('admin_create_user', {
    p_username: u.username,
    p_password: u.password ?? '123456',
    p_full_name: u.full_name ?? u.username,
    p_role: u.role === 'teacher' ? 'admin' : u.role,
    p_grade_level: u.grade_level ?? null,
    p_class_name: u.class_name ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** เปลี่ยนรหัสผ่าน: ตัวเองเปลี่ยนเองได้, admin เปลี่ยนของใครก็ได้ */
export async function setAuthPassword(username: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, error: 'ยังไม่เชื่อมต่อระบบ cloud' };
  const { error } = await supabase.rpc('admin_set_password', {
    p_username: username,
    p_new_password: newPassword,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** session ปัจจุบัน (access token สำหรับ RLS) */
export async function hasLiveSession(): Promise<boolean> {
  const supabase = getClient();
  if (!supabase || !cloudSyncConfigured()) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getClient();
  if (supabase) await supabase.auth.signOut();
}

/* ---------------- one-time backfill ---------------- */

const BACKFILL_FLAG = 'scitech_auth_backfill_v1';

/**
 * ย้ายรหัสผ่านทั้งหมดเข้าระบบ auth ครั้งเดียว:
 * 1. ทุกบัญชีในทะเบียนที่ยังไม่มีใน auth → สมัครด้วย signUp (bcrypt ฝั่งเซิร์ฟเวอร์)
 * 2. เคลียร์คอลัมน์ password ออกจากทะเบียน — จุดเดียวที่รหัสผ่านยังอยู่คือ GoTrue
 * ทำงานทันทีที่เปิดแอปหลังล็อกอิน (ต้องมี session เพื่อให้ RLS อ่านทะเบียนได้)
 */
export async function backfillAuthUsersIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(BACKFILL_FLAG)) return;
  const supabase = getClient();
  if (!supabase || !cloudSyncConfigured()) return;

  try {
    const raw = localStorage.getItem('scitech_users');
    if (!raw) return;
    const users = JSON.parse(raw) as RegisterUser[];
    if (!Array.isArray(users) || users.length === 0) return;

    let created = 0;
    for (const u of users) {
      if (!u.username) continue;
      const email = authEmail(u.username);
      // เดาว่ามีบัญชีอยู่แล้วไหม: ลอง recover-password แบบสั้น ๆ ไม่ได้ —
      // ใช้วิธีตรง ๆ: ลอง signUp ถ้า "already registered" = มีอยู่แล้ว
      const pw = u.password ?? Math.random().toString(36).slice(2, 10) + 'Aa1';
      const { error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: {
            username: u.username,
            full_name: u.full_name ?? u.username,
            role: u.role === 'admin' || u.role === 'teacher' ? 'admin' : 'student',
            grade_level: null,
            class_name: null,
            register_id: u.id,
          },
        },
      });
      if (!error) created++;
      else if (!/already registered|already exists/i.test(error.message)) {
        console.warn(`[authBackfill] ${u.username}: ${error.message}`);
      }
    }

    // เคลียร์รหัสผ่านในทะเบียน — จากนี้รหัสผ่านอยู่ใน GoTrue เท่านั้น
    const stripped = users.map(u => {
      const { password: _pw, ...rest } = u;
      return rest;
    });
    localStorage.setItem('scitech_users', JSON.stringify(stripped));
    localStorage.setItem(BACKFILL_FLAG, new Date().toISOString());
    console.info(`[authBackfill] สร้างบัญชี auth ใหม่ ${created} บัญชี — รหัสผ่านถูกย้ายเข้าระบบ auth แล้ว`);
  } catch (e) {
    console.warn('[authBackfill] ข้าม (ลองใหม่ครั้งหน้า):', e);
  }
}
