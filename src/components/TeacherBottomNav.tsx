import { Link, useLocation } from 'react-router-dom';

const items = [
  { to: '/admin', label: 'แดชบอร์ด', icon: '📋', exact: true },
  { to: '/admin/lessons', label: 'บทเรียน', icon: '📦', exact: false },
  { to: '/admin/questions', label: 'ข้อสอบ', icon: '📄', exact: false },
  { to: '/admin/worksheets', label: 'ใบงาน', icon: '🗂️', exact: false },
  { to: '/admin/profile', label: 'โปรไฟล์', icon: '🏆', exact: false },
];

/**
 * แถบนำทางล่างสำหรับครู/แอดมินบนมือถือ (<768px) — ตรงกับ 5 รายการใน AdminSidebar
 * (สไตล์เดียวกับแถบล่างของนักเรียน แต่โทนสีและเส้นทางเป็นของฝั่งครู)
 */
export default function TeacherBottomNav() {
  const location = useLocation();

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav
      aria-label="เมนูด้านล่างสำหรับครู"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-emerald-100 shadow-[0_-4px_25px_rgba(5,150,105,0.1)]"
    >
      <div className="grid grid-cols-5 items-end px-1 py-1.5 safe-area-bottom">
        {items.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
              isActive(item.to, item.exact)
                ? 'bg-emerald-100 text-emerald-900 font-bold scale-105 shadow-sm'
                : 'bg-transparent text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] leading-tight text-center">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
