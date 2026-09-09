import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface LayoutProps {
  isAdmin?: boolean;
}

const studentNav = [
  { path: '/', label: 'หน้าแรก', icon: '🏠' },
  { path: '/dashboard', label: 'แดชบอร์ด', icon: '📊' },
];

const adminNav = [
  { path: '/admin', label: 'แดชบอร์ด', icon: '📊' },
  { path: '/admin/units', label: 'หน่วยการเรียนรู้', icon: '📚' },
  { path: '/admin/lessons', label: 'จัดการบทเรียน', icon: '📖' },
  { path: '/admin/create-lesson', label: 'สร้างบทเรียนใหม่', icon: '📝' },
  { path: '/admin/questions', label: 'คลังข้อสอบ', icon: '❓' },
];

export default function Layout({ isAdmin = false }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navItems = isAdmin ? adminNav : studentNav;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          {sidebarOpen ? (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ST</span>
              </div>
              <div>
                <div className="font-bold text-primary-700 text-sm">SciTech Learning</div>
                <div className="text-[10px] text-gray-400">แพลตฟอร์มการเรียนรู้วิทยาศาสตร์</div>
              </div>
            </Link>
          ) : (
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">ST</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {isAdmin && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {sidebarOpen && 'จัดการระบบ'}
            </div>
          )}
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 border-t border-gray-100 hover:bg-gray-50 text-gray-400"
        >
          <span className="text-lg">{sidebarOpen ? '◀' : '▶'}</span>
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-700">
              {isAdmin ? 'จัดการระบบ' : 'SciTech Learning'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <Link to="/admin" className="text-sm text-gray-500 hover:text-primary-600">
                เข้าสู่ระบบแอดมิน
              </Link>
            )}
            {isAdmin && (
              <Link to="/" className="text-sm text-gray-500 hover:text-primary-600">
                ดูหน้าเว็บ
              </Link>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {isAdmin ? 'ครู/admin' : 'ด.ญ. กุ๊กกิ๊ก'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
