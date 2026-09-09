import { useState, useCallback, useEffect, createContext, useContext } from 'react';

export type UserRole = 'admin' | 'student' | null;

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'student';
  grade_level?: number;
  classroom?: string;
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

// Demo users
const DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  'admin': {
    password: '1234',
    user: { id: 1, username: 'admin', full_name: 'ครูวิภาวดี ใจดี', role: 'admin' },
  },
  'teacher': {
    password: '1234',
    user: { id: 2, username: 'teacher', full_name: 'ครูสมชาย รักสอน', role: 'admin' },
  },
  'student': {
    password: '1234',
    user: { id: 10, username: 'student', full_name: 'ด.ช. ภูมิภัทร รักเรียน', role: 'student', grade_level: 3, classroom: '3/1' },
  },
  'poon': {
    password: '1234',
    user: { id: 11, username: 'poon', full_name: 'ด.ญ. ปุณญ่า สดใส', role: 'student', grade_level: 1, classroom: '1/2' },
  },
  'pan01': {
    password: '1234',
    user: { id: 38, username: 'pan01', full_name: 'ด.ญ. ปัญญ่า สดใส', role: 'student', grade_level: 1, classroom: '1/1' },
  },
};

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
    let entry = DEMO_USERS[key];
    // Also check localStorage users (from admin user management)
    if (!entry) {
      try {
        const storedUsers = localStorage.getItem('scitech_users');
        if (storedUsers) {
          const users = JSON.parse(storedUsers);
          const found = users.find((u: any) => u.username === key && u.is_active);
          if (found) {
            entry = {
              password: found.password,
              user: {
                id: found.id,
                username: found.username,
                full_name: found.full_name,
                role: found.role,
                grade_level: found.grade_level,
                classroom: found.class_name,
              },
            };
          }
        }
      } catch {}
    }
    if (!entry) {
      return { success: false, error: 'ไม่พบผู้ใช้งานนี้ในระบบ' };
    }
    // Check password (also support stored password overrides)
    let actualPassword = entry.password;
    try {
      const storedPasswords = localStorage.getItem('scitech_user_passwords');
      if (storedPasswords) {
        const passwords = JSON.parse(storedPasswords);
        if (passwords[key]) actualPassword = passwords[key];
      }
    } catch {}
    if (actualPassword !== password) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
    }
    setUser(entry.user);
    saveUser(entry.user);
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
      // Also update in DEMO_USERS
      const entry = Object.values(DEMO_USERS).find(e => e.user.id === prev.id);
      if (entry) entry.user = updated;
      return updated;
    });
  }, []);

  const changePassword = useCallback((newPassword: string) => {
    setUser(prev => {
      if (!prev) return prev;
      // Update password in DEMO_USERS
      const entry = Object.values(DEMO_USERS).find(e => e.user.id === prev.id);
      if (entry) entry.password = newPassword;
      // Save to localStorage
      const stored = localStorage.getItem('scitech_user_passwords');
      const passwords: Record<string, string> = stored ? JSON.parse(stored) : {};
      passwords[prev.username] = newPassword;
      localStorage.setItem('scitech_user_passwords', JSON.stringify(passwords));
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
