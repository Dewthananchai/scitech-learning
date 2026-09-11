import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { useWorksheets, useUsers } from '../store/useStore';
import AdminSidebar from '../components/AdminSidebar';
import MobileHeader from '../components/MobileHeader';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

export default function AdminDashboard() {
  const { lessons, questions, subjects } = useAppStore();
  const { user } = useAuth();
  const { worksheets } = useWorksheets();
  const { users } = useUsers();

  const studentCount = useMemo(() => {
    return users.filter(u => u.role === 'student' && u.is_active).length || 45;
  }, [users]);

  const stats = [
    {
      label: 'บทเรียนทั้งหมด',
      value: lessons.length,
      icon: '📖',
      href: '/admin/lessons',
      accent: 'border-emerald-200 hover:border-emerald-400',
      iconBg: 'bg-emerald-100 text-emerald-700',
      textColor: 'text-emerald-700',
      sub: 'วิชาวิทยาศาสตร์และเทคโนโลยี',
    },
    {
      label: 'ใบงานในระบบ',
      value: worksheets.length,
      icon: '🗂️',
      href: '/admin/worksheets',
      accent: 'border-green-200 hover:border-green-400',
      iconBg: 'bg-green-100 text-green-700',
      textColor: 'text-green-700',
      sub: 'พร้อมระบบตรวจและให้คะแนน',
    },
    {
      label: 'คลังข้อสอบทั้งหมด',
      value: questions.length,
      icon: '❓',
      href: '/admin/questions',
      accent: 'border-amber-200 hover:border-amber-400',
      iconBg: 'bg-amber-100 text-amber-700',
      textColor: 'text-amber-700',
      sub: 'ปรนัยและอัตนัยทุกชั้น',
    },
    {
      label: 'นักเรียนในระบบ',
      value: studentCount,
      icon: '👥',
      href: '/admin/users',
      accent: 'border-cyan-200 hover:border-cyan-400',
      iconBg: 'bg-cyan-100 text-cyan-700',
      textColor: 'text-cyan-700',
      sub: 'บัญชีผู้เรียนที่เปิดใช้งาน',
    },
  ];

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <MobileHeader title="แดชบอร์ดครูผู้สอน" />
      <AdminSidebar />

      {/* Main Content Area */}
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-6xl transition-all">
        {/* ============================================================
            1. HERO WELCOME BANNER (Teacher Station)
            ============================================================ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 p-6 md:p-8 text-white shadow-xl shadow-emerald-900/10 mb-6">
          <div className="teacher-glow-overlay" />
          <div className="absolute top-2 right-6 text-6xl opacity-15 pointer-events-none select-none">
            🔬
          </div>
          <div className="absolute bottom-2 right-28 text-4xl opacity-20 pointer-events-none select-none">
            ✨
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span className="bg-emerald-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full shadow-xs">
                👨‍🏫 แผงควบคุมครูผู้สอน
              </span>
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                SciTech Learning Platform
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
              สวัสดีครับ, {user?.full_name || 'คุณครูผู้สอน'} 👋
            </h1>
            <p className="text-emerald-100 text-sm md:text-base font-medium leading-relaxed mb-5">
              ยินดีต้อนรับสู่ระบบบริหารจัดการห้องเรียนวิทยาศาสตร์ สามารถสร้างบทเรียน ออกใบงาน ตรวจงานนักเรียน และจัดการคลังข้อสอบได้อย่างสะดวกครบวงจร
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/admin/create-lesson"
                className="px-5 py-2.5 bg-white text-emerald-800 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-50 hover:shadow-lg transition-all flex items-center gap-2"
              >
                <span>✨</span>
                <span>สร้างบทเรียนใหม่</span>
              </Link>
              <Link
                to="/admin/worksheets"
                className="px-5 py-2.5 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl text-sm font-bold hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <span>🗂️</span>
                <span>จัดการใบงาน</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================
            2. STATS CARDS (4-Columns)
            ============================================================ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {stats.map(stat => (
            <Link
              key={stat.label}
              to={stat.href}
              className={`bg-white rounded-3xl p-4 md:p-5 border-[1.5px] ${stat.accent} shadow-sm hover:shadow-md transition-all active:scale-98 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-11 h-11 ${stat.iconBg} rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs`}>
                  {stat.icon}
                </div>
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-600">
                  ดูข้อมูล →
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">{stat.label}</p>
                <p className={`text-2xl md:text-3xl font-black ${stat.textColor} mt-0.5`}>
                  {stat.value}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 truncate">{stat.sub}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* ============================================================
            3. QUICK ACTIONS (สถานีเมนูลัดสำหรับครู)
            ============================================================ */}
        <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="font-extrabold text-base md:text-lg text-slate-800">
                สถานีเมนูลัดสำหรับครู (Quick Actions)
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              เข้าถึงด่วน
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Link
              to="/admin/create-lesson"
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-sm group-hover:scale-105 transition-transform">
                📝
              </div>
              <h4 className="font-bold text-slate-800 text-sm md:text-base">สร้างบทเรียนใหม่</h4>
              <p className="text-xs text-slate-500 mt-1">บทเรียน 6 ขั้นตอนพร้อมสื่อวิดีโอและแบบทดสอบ</p>
            </Link>

            <Link
              to="/admin/worksheets"
              className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-sm group-hover:scale-105 transition-transform">
                🗂️
              </div>
              <h4 className="font-bold text-slate-800 text-sm md:text-base">จัดการใบงาน & ตรวจงาน</h4>
              <p className="text-xs text-slate-500 mt-1">สร้างใบงานชุดใหม่ และตรวจให้คะแนนนักเรียน</p>
            </Link>

            <Link
              to="/admin/questions"
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-sm group-hover:scale-105 transition-transform">
                ❓
              </div>
              <h4 className="font-bold text-slate-800 text-sm md:text-base">คลังข้อสอบ & นำเข้า CSV</h4>
              <p className="text-xs text-slate-500 mt-1">ข้อสอบบทเรียน, O-NET และข้อสอบเข้า ม.1</p>
            </Link>

            <Link
              to="/admin/announcements"
              className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-sm group-hover:scale-105 transition-transform">
                📢
              </div>
              <h4 className="font-bold text-slate-800 text-sm md:text-base">ประกาศข่าวสารห้องเรียน</h4>
              <p className="text-xs text-slate-500 mt-1">แจ้งเตือนกิจกรรม การบ้าน และการสอบ</p>
            </Link>
          </div>
        </section>

        {/* ============================================================
            4. RECENT LESSONS & UNITS SUMMARY
            ============================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Recent Lessons (2 Cols on lg) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 overflow-hidden">
            {/* Green topbar */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="teacher-glow-overlay" />
              <div className="relative z-10 flex items-center gap-2">
                <span className="text-xl">📖</span>
                <h3 className="font-bold text-base">บทเรียนล่าสุด</h3>
              </div>
              <Link
                to="/admin/lessons"
                className="relative z-10 text-xs font-bold text-white/90 hover:text-white hover:underline bg-white/15 px-3 py-1 rounded-full"
              >
                ดูทั้งหมด ({lessons.length}) →
              </Link>
            </div>

            <div className="p-4 md:p-5">
              {lessons.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  ยังไม่มีบทเรียนในระบบ — เริ่มสร้างบทเรียนแรกได้เลย!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lessons.slice(-5).reverse().map(lesson => {
                    const subject = subjects.find(s => s.id === lesson.subject_unit_id);
                    const gradeInfo = subject ? { label: `ป.${subject.grade_level}` } : null;
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/50 border border-slate-100 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg shrink-0">
                          🔬
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{lesson.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                            {gradeInfo && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-md text-[10px]">
                                {gradeInfo.label}
                              </span>
                            )}
                            <span>•</span>
                            <span>{subject?.unit_code || 'หน่วยเรียน'}</span>
                            <span>•</span>
                            <span>👁 เข้าชม {lesson.view_count} ครั้ง</span>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                            lesson.is_published
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {lesson.is_published ? '🟢 เผยแพร่' : '⚪ ร่าง'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Units Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="relative overflow-hidden bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
                <div className="teacher-glow-overlay" />
                <div className="relative z-10 flex items-center gap-2">
                  <span className="text-xl">📚</span>
                  <h3 className="font-bold text-base">หน่วยการเรียนรู้</h3>
                </div>
                <Link
                  to="/admin/units"
                  className="relative z-10 text-xs font-bold text-white/90 hover:text-white hover:underline bg-white/15 px-3 py-1 rounded-full"
                >
                  จัดการ →
                </Link>
              </div>

              <div className="p-4 md:p-5 space-y-2.5">
                {subjects.slice(0, 4).map(sub => (
                  <div key={sub.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">
                        ป.{sub.grade_level}
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-1 truncate max-w-[170px]">
                        {sub.unit_code} {sub.unit_name}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">
                      {lessons.filter(l => l.subject_unit_id === sub.id).length} บท
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100">
              <Link
                to="/admin/units"
                className="w-full block text-center py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-xs rounded-xl transition-all"
              >
                ดูหน่วยการเรียนรู้ทั้งหมด ({subjects.length} หน่วย) →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

