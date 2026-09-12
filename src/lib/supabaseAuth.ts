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
const AUTH_DOMAIN = 'scitech.local';

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
  //    ถ้าสร้างไม่สำเร็จ (เช่น email rate limit เพราะโปรเจกต์ยังเปิด
  //    "Confirm email") → ไม่ทำให้ล็อกอินพัง: ยังใช้ทะเบียนเดิมต่อได้
  //    และถ้าเพิ่งโดน rate limit จะข้ามการลองซ้ำ 10 นาที เพื่อไม่เปลืองโควตาอีเมล
  if (isRateLimitBackoffActive()) {
    console.info('[auth] ข้ามการสร้างบัญชี GoTrue ชั่วคราว (รอพ้นเพดานอีเมลของ Supabase)');
    return legacyLoginResult(register);
  }
  const { data: upData, error: upErr } = await supabase.auth.signUp({
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
  if (upErr && !/already registered|already exists/i.test(upErr.message)) {
    console.warn(`[auth] สร้างบัญชี GoTrue ยังไม่สำเร็จ (${upErr.message}) — ล็อกอินแบบทะเบียนเดิม`);
    if (/rate limit|over_email_send_rate_limit/i.test(upErr.message)) markRateLimitBackoff();
  }

  // 4) ถ้าสมัครสำเร็จ (ได้ session กลับมาเลย) → ใช้ session นั้นทันที
  if (!upErr && upData?.session) {
    return { via: 'supabase', user: await toAuthUser(supabase, upData.user?.user_metadata ?? {}, username) };
  }

  // 5) ไม่งั้นล็อกอินซ้ำ (เช่นบัญชีมีอยู่แล้ว); ถ้ายังไม่สำเร็จ →
  //    ย้อนไปใช้ทะเบียนเดิมที่ตรวจรหัสผ่านแล้ว (ไม่บล็อกการใช้งาน)
  const retry = await supabase.auth.signInWithPassword({ email, password });
  if (!retry.error && retry.data.user) {
    const meta = (retry.data.user.user_metadata ?? {}) as Record<string, unknown>;
    return { via: 'supabase', user: await toAuthUser(supabase, meta, username) };
  }
  return legacyLoginResult(register);
}

/** ผลลัพธ์ล็อกอินแบบทะเบียนเดิม (ใช้เมื่อ GoTrue ยังไม่พร้อม/โดนจำกัดอีเมล) */
function legacyLoginResult(register: RegisterUser): { user: AuthUser; via: 'legacy' } {
  return {
    via: 'legacy',
    user: {
      id: register.id,
      username: register.username,
      full_name: register.full_name ?? register.username,
      role: register.role === 'teacher' || register.role === 'admin' ? 'admin' : 'student',
      grade_level: register.grade_level ?? undefined,
      classroom: register.class_name ?? undefined,
    },
  };
}

/* พักการสร้างบัญชี GoTrue 10 นาทีหลังโดนเพดานอีเมล — ล็อกอินปกติไม่กระทบ */
const RATE_LIMIT_KEY = '__auth_signup_backoff_until__';
function markRateLimitBackoff(): void {
  try { localStorage.setItem(RATE_LIMIT_KEY, String(Date.now() + 10 * 60 * 1000)); } catch { /* ignore */ }
}
function isRateLimitBackoffActive(): boolean {
  try {
    const until = Number(localStorage.getItem(RATE_LIMIT_KEY) || 0);
    return Number.isFinite(until) && Date.now() < until;
  } catch { return false; }
}
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

/** อ่านผู้ใช้จากทะเบียน — ดึงจากคลาวด์ก่อนเสมอ (กัน localStorage ที่อุปกรณ์ล้าสมัย), สำรองด้วย localStorage */
async function fetchRegisterUser(username: string): Promise<RegisterUser | null> {
  const key = username.toLowerCase().trim();
  const pick = (users: RegisterUser[]) =>
    users.find(u => String(u.username).toLowerCase() === key) ?? null;

  // 1) คลาวด์เป็นแหล่งความจริง — อุปกรณ์ใดก็ได้ผลลัพธ์เดียวกัน
  try {
    const supabase = getClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('app_state')
        .select('value')
        .eq('id', 'scitech_users')
        .maybeSingle();
      if (!error && data?.value) {
        const users = (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) as RegisterUser[];
        const hit = pick(users);
        if (hit) return hit;
      }
    }
  } catch { /* ตกไปใช้ localStorage ด้านล่าง */ }

  // 2) สำรอง: สำเนาในเครื่อง (กรณีออฟไลน์/คลาวด์ล่ม)
  try {
    const raw = localStorage.getItem('scitech_users');
    if (!raw) return null;
    return pick(JSON.parse(raw) as RegisterUser[]);
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

    /* กติกาความปลอดภัย: ห้ามลบรหัสผ่านออกจากทะเบียนถ้ายังไม่พิสูจน์ได้
       ว่าบัญชี GoTrue ใช้งานได้จริง — ไม่งั้นผู้ใช้จะล็อกอินไม่ได้ทั้งระบบ
       (บั๊กครั้งแรก: strip ก่อนรู้ว่า signUp สำเร็จ → รหัสผ่านหายทั้งระบบ) */

    // ตรวจก่อนว่าโปรเจกต์อนุญาตให้ signUp ได้จริง (Confirm email OFF)
    const probeEmail = `backfill-probe-${Date.now()}@${AUTH_DOMAIN}`;
    const probePw = `Pr-${Math.random().toString(36).slice(2, 12)}1A`;
    const probe = await supabase.auth.signUp({ email: probeEmail, password: probePw });
    const confirmEmailOn = !probe.data.session;
    // ลบ probe ไม่ได้จาก client (ไม่มี admin API) — ปล่อยไว้เป็นบัญชีค้างใช้
    if (confirmEmailOn) {
      console.warn(
        '[authBackfill] งดทำงาน: โปรเจกต์เปิด "Confirm email" อยู่ — ' +
        'ปิดที่ Supabase Dashboard → Authentication → Sign In / Providers ก่อน'
      );
      return; // ไม่แตะทะเบียนเลย — รหัสผ่านยังอยู่ครบ ล็อกอินได้ตามปกติ
    }

    let created = 0;
    let failed = 0;
    for (const u of users) {
      if (!u.username) continue;
      const email = authEmail(u.username);
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
      if (!error) {
        created++;
      } else if (!/already registered|already exists/i.test(error.message)) {
        // สร้างไม่สำเร็จ — เก็บรหัสผ่านไว้ในทะเบียนต่อ (ยังล็อกอินแบบเดิมได้)
        failed++;
        console.warn(`[authBackfill] ${u.username}: ${error.message}`);
      }
    }

    if (failed > 0) {
      console.warn(`[authBackfill] ข้ามการ strip: สร้างไม่สำเร็จ ${failed} บัญชี — รหัสผ่านคงอยู่ในทะเบียนต่อ`);
      return; // ลองใหม่ครั้งหน้า (ธงยังไม่ตั้ง)
    }

    // สำเร็จทุกบัญชีเท่านั้น — ค่อยลบรหัสผ่านออกจากทะเบียน
    const stripped = users.map(u => {
      const { password: _pw, ...rest } = u;
      return rest;
    });
    localStorage.setItem('scitech_users', JSON.stringify(stripped));
    localStorage.setItem(BACKFILL_FLAG, new Date().toISOString());
    console.info(`[authBackfill] ย้ายรหัสผ่านเข้า GoTrue สำเร็จ ${created} บัญชี`);
  } catch (e) {
    console.warn('[authBackfill] ข้าม (ลองใหม่ครั้งหน้า):', e);
  }
}
