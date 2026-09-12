import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLayout } from '../store/LayoutContext';
import { useAuth } from '../store/AuthContext';

interface TeacherMobileHeaderProps {
  title?: string;
}

/**
 * MobileHeader สำหรับฝั่งครู/แอดมิน — แยกจากของนักเรียนโดยสิ้นเชิง
 *  • ไม่มีป้ายดาว (⭐) และไม่มีกระดิ่งแจ้งประกาศของนักเรียน
 *  • มีปุ่ม ☰ เปิด/ปิดแถบเมนูข้าง (AdminSidebar drawer)
 *  • โทนสีเขียว-teal ตามธีมพอร์ทัลครู
 */
export default function TeacherMobileHeader({ title }: TeacherMobileHeaderProps) {
  const { toggleSidebar } = useLayout();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Profile dropdown menu state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    if (window.confirm('ต้องการออกจากระบบหรือไม่?')) {
      logout();
      navigate('/login');
    }
  };

  // Same avatar rule as ProfilePage: uploaded photo if set, else first+last initials on green gradient
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
  };
  const avatarFallback = (textClass: string) => (
    <span className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold ${textClass}`}>
      {user ? getInitials(user.full_name) : 'ค'}
    </span>
  );

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 w-full z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-emerald-100/60 px-3.5 py-2.5 flex items-center justify-between transition-all">
      {/* Left: Drawer Toggle (☰ ซ่อน/แสดงเมนู) + Brand */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleSidebar}
          aria-label="เปิด/ปิดเมนู"
          title="เปิด/ปิดเมนู"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 shadow-sm hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          <span className="text-lg leading-none">☰</span>
        </button>
        <Link to="/admin" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-lg shadow-sm">
            🔬
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              SciTech
            </span>
            {title && (
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {title}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Right: Profile Avatar only (no stars, no student bell) */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileOpen(open => !open)}
            aria-label="เมนูโปรไฟล์"
            className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white overflow-hidden shadow-sm hover:border-emerald-300 hover:scale-105 active:scale-95 transition-all"
          >
            {user?.profile_image ? (
              <img src={user.profile_image} alt="รูปโปรไฟล์" className="w-full h-full object-cover" />
            ) : (
              avatarFallback('text-sm')
            )}
          </button>

          {/* Profile Card Dropdown */}
          {profileOpen && (
            <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-fade-in origin-top-right">
              {/* Profile Info */}
              <Link
                to="/admin/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    avatarFallback('text-base')
                  )}
                </div>
                <div className="min-w-0">
                  <strong className="block text-sm font-bold text-slate-800 truncate">
                    {user?.full_name || 'ครูผู้สอน'}
                  </strong>
                  <small className="block text-xs text-slate-500 mt-0.5">👨‍🏫 ครูประจำวิชา</small>
                </div>
              </Link>

              <hr className="border-t border-slate-100 my-2" />

              {/* Menu Items */}
              <Link
                to="/admin/profile"
                onClick={() => setProfileOpen(false)}
                className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                🏆 โปรไฟล์ของฉัน
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                ↪️ ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
