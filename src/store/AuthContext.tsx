import { useState, useCallback, useEffect, createContext, useContext } from 'react';

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
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
  changePassword: (newPassword: string) => void;
  isAdmin: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * ระบบผู้ใช้จริง — ตรวจสอบกับทะเบียนผู้ใช้ใน localStorage (scitech_users) เท่านั้น
 * ไม่มีบัญชีทดลอง (demo) อีกต่อไป — ผู้ดูแลระบบสร้างบัญชีอื่นทั้งหมดผ่านหน้าจัดการผู้ใช้
 */
const USERS_KEY = 'scitech_users';
const PASSWORDS_KEY = 'scitech_user_passwords';

function findStoredUser(username: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return null;
    const users = JSON.parse(raw);
    const found = users.find((u: Record<string, unknown>) =>
      String(u.username).toLowerCase() === username.toLowerCase().trim() && u.is_active !== false
    );
    return found ?? null;
  } catch {
    return null;
  }
}

function getStoredPassword(username: string, fallback: unknown): string {
  try {
    const raw = localStorage.getItem(PASSWORDS_KEY);
    if (!raw) return String(fallback ?? '');
    const passwords = JSON.parse(raw);
    return passwords[username.toLowerCase().trim()] ?? String(fallback ?? '');
  } catch {
    return String(fallback ?? '');
  }
}

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
      // If storage is full, try removing the profile_image and retry
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(loadUser());
    setIsLoading(false);
  }, []);

  const login = useCallback((username: string, password: string) => {
    const key = username.toLowerCase().trim();
    const found = findStoredUser(key);
    if (!found) {
      return { success: false, error: 'ไม่พบผู้ใช้งานนี้ในระบบ' };
    }
    const actualPassword = getStoredPassword(key, found.password);
    if (actualPassword !== password) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
    }
    const entry: AuthUser = {
      id: Number(found.id),
      username: String(found.username),
      full_name: String(found.full_name ?? found.username),
      role: found.role === 'teacher' ? 'admin' : (found.role as 'admin' | 'student'),
      grade_level: found.grade_level != null ? Number(found.grade_level) : undefined,
      classroom: found.class_name != null ? String(found.class_name) : undefined,
      school_name: found.school_name != null ? String(found.school_name) : undefined,
    };
    setUser(entry);
    saveUser(entry);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveUser(updated);
      // sync กลับไปยังทะเบียนผู้ใช้ใน localStorage ด้วย
      try {
        const raw = localStorage.getItem(USERS_KEY);
        if (raw) {
          const users = JSON.parse(raw);
          localStorage.setItem(USERS_KEY, JSON.stringify(users.map((u: Record<string, unknown>) =>
            Number(u.id) === prev.id
              ? { ...u, full_name: updated.full_name, grade_level: updated.grade_level, class_name: updated.classroom, school_name: updated.school_name, profile_image: updated.profile_image }
              : u
          )));
        }
      } catch {}
      return updated;
    });
  }, []);

  const changePassword = useCallback((newPassword: string) => {
    setUser(prev => {
      if (!prev) return prev;
      // เขียนทับรหัสใน scitech_user_passwords (ทับ seed ของทะเบียนผู้ใช้ด้วย)
      try {
        const stored = localStorage.getItem(PASSWORDS_KEY);
        const passwords: Record<string, string> = stored ? JSON.parse(stored) : {};
        passwords[prev.username.toLowerCase()] = newPassword;
        localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
      } catch {}
      try {
        const raw = localStorage.getItem(USERS_KEY);
        if (raw) {
          const users = JSON.parse(raw);
          localStorage.setItem(USERS_KEY, JSON.stringify(users.map((u: Record<string, unknown>) =>
            Number(u.id) === prev.id ? { ...u, password: newPassword } : u
          )));
        }
      } catch {}
      return prev;
    });
  }, []);

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
