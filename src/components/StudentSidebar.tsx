import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLayout } from '../store/LayoutContext';
import { useAuth } from '../store/AuthContext';
import { useMissions } from '../store/useStore';
import { getTotalStarsForStudent } from '../lib/starAchievements';
import { useMemo } from 'react';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  color: string;
  badge?: string;
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'หน้าแรก', icon: '🏠', color: 'from-blue-500 to-indigo-600' },
  { path: '/student/lessons', label: 'บทเรียน', icon: '📘', color: 'from-emerald-400 to-teal-600' },
  { path: '/student/quizzes', label: 'ข้อสอบ', icon: '📝', color: 'from-pink-500 to-rose-500' },
  { path: '/student/announcements', label: 'ข่าวประกาศ', icon: '📢', color: 'from-sky-400 to-blue-500' },
];

export default function StudentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, closeSidebar, toggleSidebar } = useLayout();
  const { user, logout } = useAuth();
  const { completions } = useMissions();

  const totalStars = useMemo(() => {
    if (!user) return 0;
    const missionStars = completions.filter(c => c.student_id === user.id).reduce((sum, c) => sum + c.stars_earned, 0);
    return getTotalStarsForStudent(user.id, missionStars);
  }, [completions, user]);

  const handleNavClick = () => closeSidebar();

  const handleLogout = () => {
    if (window.confirm('ต้องการออกจากระบบหรือไม่?')) {
      closeSidebar();
      logout();
      navigate('/login');
    }
  };

  const gradeDisplay = user?.grade_level ? `ป.${user.grade_level}${user.classroom ? `/${user.classroom.replace(/^[^\/]*\/?/, '')}` : ''}` : 'นักเรียน';

  return (
    <>
      {/* ============================================================
          2. TABLET / iPad RAIL (Visible on md: 768px-1023px)
          Compact vertical rail that leaves 688px+ for the iPad content!
          ============================================================ */}
      <aside className="hidden md:flex lg:hidden flex-col w-20 fixed top-0 left-0 bottom-0 bg-white/95 backdrop-blur-md border-r border-indigo-100/80 z-30 py-3 items-center justify-between shadow-sm">
        {/* Top Mini Brand */}
        <div className="flex flex-col items-center gap-1">
          <Link to="/dashboard" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-md hover:scale-105 transition-all">
            🚀
          </Link>
        </div>

        {/* Center Icons List */}
        <nav className="flex flex-col items-center gap-2 overflow-y-auto py-2 kid-scrollbar">
          {STUDENT_NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-br ${item.color} text-white shadow-md scale-105 font-bold`
                    : 'text-slate-600 hover:bg-slate-100 hover:scale-105 active:scale-95'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[9px] leading-tight text-center truncate max-w-[50px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Button & Logout */}
        <div className="flex flex-col items-center gap-2.5">
          <Link
            to="/student/profile"
            title="โปรไฟล์ของฉัน"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 overflow-hidden ${
              location.pathname === '/student/profile'
                ? 'ring-3 ring-indigo-500 bg-indigo-100'
                : 'bg-gradient-to-br from-pink-400 to-rose-500 text-white font-bold text-xs'
            }`}
          >
            {user?.profile_image ? (
              <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{(user?.full_name || 'น')[0]}</span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="w-10 h-10 rounded-xl text-rose-500 hover:bg-rose-50 flex items-center justify-center text-lg transition-all"
          >
          </button>
        </div>
      </aside>

      {/* ============================================================
          3. DESKTOP SIDEBAR (Visible on lg: >=1024px)
          Full spacious, cheerful sidebar with student card as button
          ============================================================ */}
      <aside className="hidden lg:flex flex-col w-64 fixed top-0 left-0 bottom-0 bg-white/95 backdrop-blur-md border-r border-indigo-100/80 p-4 z-30 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-2xl shadow-md text-white">
            🚀
          </div>
          <div>
            <div className="font-extrabold text-lg text-slate-800 tracking-tight">SciTech</div>
            <div className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
              ห้องเรียนวิทย์คิดส์
            </div>
          </div>
        </div>

        {/* Student Profile Card (Clickable Button to /student/profile) */}
        <Link
          to="/student/profile"
          className="group block bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-3.5 text-white shadow-md mb-4 relative overflow-hidden hover:shadow-lg hover:scale-[1.02] active:scale-98 transition-all"
          title="แตะเพื่อดูโปรไฟล์และผลการเรียน"
        >
          <div className="absolute -right-2 -bottom-2 text-4xl opacity-20 group-hover:scale-110 transition-transform">🌟</div>
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-white/20 p-0.5 border border-white/50 flex items-center justify-center text-xl overflow-hidden font-bold shrink-0">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                ''
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="bg-white/25 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  {gradeDisplay}
                </span>
              </div>
              <p className="text-xs font-extrabold truncate mt-0.5">{user?.full_name || 'น้องนักเรียน'}</p>
              <p className="text-[11px] font-black text-amber-200 mt-0.5">⭐ {totalStars} ดาวสะสม</p>
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto space-y-1.5 pr-1 kid-scrollbar">
          {STUDENT_NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${item.color} text-white font-bold shadow-md shadow-blue-500/20 scale-[1.02]`
                    : 'text-slate-600 hover:bg-slate-100 font-medium active:scale-98'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${isActive ? '' : 'filter drop-shadow-xs'}`}>{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer & Logout */}
        <div className="pt-3 border-t border-slate-100 mt-2 space-y-2">
          <div className="px-2 py-1.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2 text-xs text-amber-800 font-medium">
            <span className="text-base animate-bounce-slow">💡</span>
            <span className="text-[11px]">ทดลองบ่อยๆ เก่งแน่นอน!</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-sm font-bold transition-all border border-rose-100"
          >
            <span>🚪</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          4. MOBILE BOTTOM DOCK (Visible on <768px)
          ============================================================ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-indigo-100 shadow-[0_-4px_25px_rgba(79,70,229,0.1)]">
        <div className="grid grid-cols-5 items-end px-1 py-1.5 safe-area-bottom">
          {/* Home */}
          <Link
           to="/dashboard"
           className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
           location.pathname === '/dashboard'
           ? 'bg-slate-200 text-slate-900 font-bold scale-105 shadow-sm'
           : 'bg-transparent text-slate-500 hover:bg-slate-100'
           }`}
           >
           <span className="text-xl">🏠</span>
           <span className="text-[9px] leading-tight text-center">หน้าแรก</span>
          </Link>

          {/* Lessons */}
          <Link
           to="/student/lessons"
           className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
           location.pathname.startsWith('/student/lessons')
           ? 'bg-slate-200 text-slate-900 font-bold scale-105 shadow-sm'
           : 'bg-transparent text-slate-500 hover:bg-slate-100'
           }`}
           >
           <span className="text-xl">📘</span>
           <span className="text-[9px] leading-tight text-center">บทเรียน</span>
         </Link>

          {/* Quizzes */}
          <Link
           to="/student/quizzes"
           className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
           location.pathname.startsWith('/student/quizzes')
           ? 'bg-slate-200 text-slate-900 font-bold scale-105 shadow-sm'
           : 'bg-transparent text-slate-500 hover:bg-slate-100'
           }`}
           >
           <span className="text-xl">📝</span>
           <span className="text-[9px] leading-tight text-center">ข้อสอบ</span>
          </Link>

          {/* StudentWorksheets */}
          <Link
           to="/student/worksheets"
           className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
           location.pathname.startsWith('/student/worksheets')
           ? 'bg-slate-200 text-slate-900 font-bold scale-105 shadow-sm'
           : 'bg-transparent text-slate-500 hover:bg-slate-100'
           }`}
           >
           <span className="text-xl">📋</span>
           <span className="text-[9px] leading-tight text-center">ใบงาน</span>
           </Link>
          {/* Profile */}
          <Link
            to="/student/profile"
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
            location.pathname.startsWith('/student/profile')
            ? 'bg-slate-200 text-slate-900 font-bold scale-105 shadow-sm'
            : 'bg-transparent text-slate-500 hover:bg-slate-100'
           }`}
           >
           <span className="text-xl">🎓</span>
           <span className="text-[9px] leading-tight text-center">โปรไฟล์</span>
           </Link>
        </div>
      </nav>
    </>
  );
}

// Export aliases for backwards compatibility
export { StudentSidebar as StudentNavigationBar };


