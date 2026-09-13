import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLayout } from '../store/LayoutContext';
import { useAuth } from '../store/AuthContext';

const adminNav = [
  { path: '/admin', label: 'แดชบอร์ด', icon: '📋', color: 'from-blue-400 to-indigo-500' },
  { path: '/admin/lessons', label: 'คลังบทเรียน', icon: '📦', color: 'from-emerald-400 to-teal-500' },
  { path: '/admin/units', label: 'หน่วยการเรียนรู้', icon: '📚', color: 'from-cyan-400 to-sky-500' },
  { path: '/admin/questions', label: 'คลังข้อสอบ', icon: '📄', color: 'from-amber-400 to-orange-500' },
  { path: '/admin/worksheets', label: 'จัดการใบงาน', icon: '🗂️', color: 'from-green-400 to-emerald-500' },
  { path: '/admin/announcements', label: 'จัดการประกาศ', icon: '📢', color: 'from-pink-400 to-rose-500' },
  { path: '/admin/calendar', label: 'จัดการปฏิทิน', icon: '📅', color: 'from-violet-400 to-purple-500' },
  { path: '/admin/users', label: 'ผู้ใช้และการเข้าเรียน', icon: '👥', color: 'from-sky-400 to-blue-500' },
  { path: '/admin/missions', label: 'ภารกิจและดาวสะสม', icon: '🎯', color: 'from-orange-400 to-red-500' },
  { path: '/admin/profile', label: 'โปรไฟล์ของฉัน', icon: '🏆', color: 'from-amber-400 to-yellow-500' },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, closeSidebar } = useLayout();
  const { user, logout } = useAuth();
  const handleNavClick = () => closeSidebar();
  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-5 px-3 pt-1">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-2xl shadow-md text-white shrink-0">
          🔬
        </div>
        <div className="min-w-0">
          <div className="font-black text-lg text-slate-800 tracking-tight leading-none">SciTech</div>
          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full inline-block mt-1">
            👨‍🏫 พอร์ทัลครูผู้สอน
          </div>
        </div>
      </div>

      {/* Teacher Profile Card */}
      {user && (
        <Link
          to="/admin/profile"
          onClick={handleNavClick}
          className="group block bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-3.5 text-white shadow-md shadow-emerald-700/20 mb-4 relative overflow-hidden hover:shadow-lg hover:scale-[1.01] active:scale-98 transition-all"
          title="ดูโปรไฟล์ของฉัน"
        >
          <div className="absolute -right-2 -bottom-2 text-4xl opacity-15">⭐</div>
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-white/20 p-0.5 border border-white/40 flex items-center justify-center text-xl overflow-hidden font-bold shrink-0">
              {user.profile_image ? (
                <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                '👨‍🏫'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="bg-white/25 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight">
                  ครูประจำวิชา
                </span>
                <span className="text-[10px] text-emerald-200 font-bold group-hover:underline">
                  โปรไฟล์ →
                </span>
              </div>
              <p className="text-xs font-bold truncate mt-0.5">{user.full_name}</p>
              <p className="text-[10px] text-emerald-100/90 truncate">{user.school_name || 'กลุ่มสาระวิทยาศาสตร์'}</p>
            </div>
          </div>
        </Link>
      )}

      {/* Navigation List */}
      <nav className="flex flex-col gap-1.5 text-sm flex-1 px-1 overflow-y-auto teacher-scrollbar">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 pt-1 pb-0.5">
          ระบบจัดการการเรียนรู้
        </p>
        {adminNav.map(item => {
          const isActive = item.path === '/admin'
            ? location.pathname === '/admin'
            : item.path === '/admin/users'
            ? location.pathname.startsWith('/admin/users') || location.pathname.startsWith('/admin/attendance')
            : item.path === '/admin/lessons'
            ? location.pathname.startsWith('/admin/lessons') || location.pathname.startsWith('/admin/create-lesson') || location.pathname.startsWith('/admin/edit-lesson')
            : item.path === '/admin/worksheets'
            ? location.pathname.startsWith('/admin/worksheets') || location.pathname.startsWith('/admin/grade-worksheets') || location.pathname.startsWith('/admin/saved-worksheets')
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? `bg-gradient-to-r ${item.color} text-white font-bold shadow-md scale-[1.02]`
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium active:scale-98'
              }`}
            >
              <span className={`text-xl ${isActive ? '' : 'filter drop-shadow-xs'}`}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer & Logout */}
      <div className="px-1 pt-3 border-t border-slate-100 mt-2 space-y-2">
        <button
          onClick={() => {
            if (window.confirm('ต้องการออกจากระบบหรือไม่?')) {
              handleLogout();
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-sm font-bold transition-all border border-rose-100"
        >
          <span>🚪</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 bg-white shadow-fun hidden md:flex flex-col p-4 fixed h-full z-30 border-r border-slate-100">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeSidebar}></div>
          <aside className="fixed top-0 left-0 w-72 bg-white shadow-2xl flex flex-col p-4 h-full z-10 animate-slide-in rounded-r-3xl">
            <button onClick={closeSidebar} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
