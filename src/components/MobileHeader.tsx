import { useLayout } from '../store/LayoutContext';
import { useAuth } from '../store/AuthContext';
import { useMissions, useAnnouncements, useAnnouncementReads, filterVisibleAnnouncements } from '../store/useStore';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface MobileHeaderProps {
  title?: string;
}

export default function MobileHeader({ title }: MobileHeaderProps) {
  const { toggleSidebar } = useLayout();
  const { user, logout } = useAuth();
  const { completions } = useMissions();
  const { announcements } = useAnnouncements();
  const { readIds } = useAnnouncementReads(user?.id);
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

  const gradeDisplay = user?.grade_level ? `ป.${user.grade_level}${user.classroom ? `/${user.classroom.replace(/^[^\/]*\/?/, '')}` : ''}` : 'นักเรียน';

  // Same avatar rule as ProfilePage: uploaded photo if set, else first+last initials on blue gradient
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
  };
  const avatarFallback = (textClass: string) => (
    <span className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold ${textClass}`}>
      {user ? getInitials(user.full_name) : 'น'}
    </span>
  );

  const totalStars = useMemo(() => {
    if (!user) return 0;
    return completions.filter(c => c.student_id === user.id).reduce((sum, c) => sum + c.stars_earned, 0);
  }, [completions, user]);

  // 🔔 badge: teacher announcements visible to THIS student that are still unread
  // (same visibility rule as the 📢 page + per-student read tracking)
  const activeAnnouncementCount = useMemo(
    () => filterVisibleAnnouncements(announcements, user?.grade_level).filter(a => !readIds.includes(a.id)).length,
    [announcements, user, readIds]
  );

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 w-full z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-indigo-100/60 px-3.5 py-2.5 flex items-center justify-between transition-all">
      {/* Left: Drawer Toggle + Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-lg shadow-sm">
            🚀
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
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

      {/* Right: Notification Bell + Stars Badge + Profile Avatar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification Bell → ประกาศจากครู */}
        <Link
          to="/student/announcements"
          aria-label="ประกาศจากครู"
          title="ประกาศจากครู"
          className="relative w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200/80 shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-lg">🔔</span>
          {activeAnnouncementCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white shadow-sm animate-bounce-slow">
              {activeAnnouncementCount > 9 ? '9+' : activeAnnouncementCount}
            </span>
          )}
        </Link>

        {/* Star Badge */}
        <Link
          to="/student/missions"
          className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-yellow-100 border border-amber-200/80 px-2.5 py-1 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-base animate-bounce-slow">⭐</span>
          <span className="text-xs font-black text-amber-700">{totalStars}</span>
        </Link>

        {/* Profile Avatar (Dropdown Menu) */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileOpen(open => !open)}
            aria-label="เมนูโปรไฟล์"
            className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white overflow-hidden shadow-sm hover:border-indigo-300 hover:scale-105 active:scale-95 transition-all"
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
                to="/student/profile"
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
                    {user?.full_name || 'นักเรียน'}
                  </strong>
                  <small className="block text-xs text-slate-500 mt-0.5">
                    {gradeDisplay}
                  </small>
                </div>
              </Link>

              <hr className="border-t border-slate-100 my-2" />

              {/* Menu Items */}
              <Link
                to="/student/profile"
                onClick={() => setProfileOpen(false)}
                className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ⚙️ ตั้งค่าโปรไฟล์
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

