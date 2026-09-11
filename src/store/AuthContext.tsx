import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { signInWithUsername, setAuthPassword, signOutSupabase, hasLiveSession } from '../lib/supabaseAuth';
import { hydrateFromCloud } from '../lib/cloudSync';

export type UserRole = 'admin' | 'student' | null;

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'student';
  grade_level?: number;
  classroom?: string;
  school_name?: string;
  profile_image?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = 'scitech_users';
const STORAGE_KEY = 'scitech_auth_user';

function loadUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveUser(user: AuthUser | null) {
  if (user) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user to localStorage:', e);
      if (user.profile_image) {
        try {
          const withoutImage = { ...user, profile_image: undefined };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutImage));
        } catch {
          // Give up
        }
      }
    }
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** sync ข้อมูลโปรไฟล์กลับทะเบียนผู้ใช้ (ชื่อ ชั้น ห้อง — ไม่แตะรหัสผ่าน) */
function syncProfileToRegister(id: number, updates: Partial<AuthUser>) {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return;
    const users = JSON.parse(raw);
    localStorage.setItem(USERS_KEY, JSON.stringify(users.map((u: Record<string, unknown>) =>
      Number(u.id) === id
        ? {
            ...u,
            ...(updates.full_name !== undefined ? { full_name: updates.full_name } : {}),
            ...(updates.grade_level !== undefined ? { grade_level: updates.grade_level } : {}),
            ...(updates.classroom !== undefined ? { class_name: updates.classroom } : {}),
            ...(updates.school_name !== undefined ? { school_name: updates.school_name } : {}),
            ...(updates.profile_image !== undefined ? { profile_image: updates.profile_image } : {}),
          }
        : u
    )));
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ถ้า session ใน Supabase หมดอายุ ให้ถือว่าออกจากระบบด้วย
    hasLiveSession().then(live => {
      if (!live) {
        setUser(null);
        saveUser(null);
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await signInWithUsername(username, password);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    // เติมข้อมูลล่าสุดจากทะเบียน (เช่น รูปโปรไฟล์ที่เปลี่ยนไป)
    let profileImage: string | undefined;
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (raw) {
        const users = JSON.parse(raw);
        const found = users.find((u: Record<string, unknown>) =>
          String(u.username).toLowerCase() === result.user.username.toLowerCase()
        );
        if (found?.profile_image) profileImage = String(found.profile_image);
      }
    } catch {}
    const finalUser = { ...result.user, profile_image: profileImage };
    setUser(finalUser);
    saveUser(finalUser);
    // ดึงข้อมูลล่าสุดจากคลาวด์ทันทีที่ได้ session
    // (แถว app_state อ่านได้เฉพาะผู้ที่ล็อกอินแล้วหลังเปิด RLS)
    if (result.via === 'supabase') {
      try { await hydrateFromCloud(); } catch { /* ออฟไลน์ — ใช้ localStorage เดิม */ }
    }
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
    void signOutSupabase();
  }, []);

  const updateProfile = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveUser(updated);
      syncProfileToRegister(prev.id, updates);
      return updated;
    });
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!user) return { success: false, error: 'ยังไม่ได้ล็อกอิน' };
    // รหัสผ่านถูกเปลี่ยนในระบบ auth ของ Supabase เท่านั้น (bcrypt ฝั่งเซิร์ฟเวอร์)
    // ห้ามเขียนรหัสผ่านกลับลงทะเบียน scitech_users — แถวนั้นทุกคนที่ล็อกอินอ่านได้
    const res = await setAuthPassword(user.username, newPassword);
    if (!res.ok) return { success: false, error: res.error };
    return { success: true };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile, changePassword, isAdmin: user?.role === 'admin', isStudent: user?.role === 'student' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
