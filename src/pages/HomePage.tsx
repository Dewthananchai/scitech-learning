import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { useMissions, useAnnouncements } from '../store/useStore';
import { asset } from '../lib/asset';

// Lesson cover CSS themes
const coverThemes = [
  {
    type: 'plant',
    label: '🌿 ธรรมชาติรอบตัว',
    bg: 'from-sky-200 to-sky-300',
    bottomBg: 'from-sky-300 to-green-400',
    content: (
      <>
        <div className="absolute top-4 right-6 w-10 h-10 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.25)]"></div>
        <div className="absolute top-7 left-5 w-14 h-4 rounded-full bg-white/80 before:absolute before:bottom-0 before:left-2 before:w-6 before:h-6 before:rounded-full before:bg-white/80 after:absolute after:bottom-0 after:right-2 after:w-8 after:h-8 after:rounded-full after:bg-white/80"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-16 rounded-t-[10px] bg-amber-800"></div>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-20 h-16 rounded-full bg-green-500 shadow-[-36px 18px_0_-8px_#4ade80,36px_18px_0_-8px_#16a34a]"></div>
        <div className="absolute bottom-3 left-6 w-7 h-7 rounded-full bg-pink-400 shadow-[0_0_0_7px_#f9a8d4] before:absolute before:top-2 before:left-2 before:w-3 before:h-3 before:rounded-full before:bg-yellow-300"></div>
        <div className="absolute bottom-3 right-6 w-7 h-7 rounded-full bg-violet-400 shadow-[0_0_0_7px_#c4b5fd] before:absolute before:top-2 before:left-2 before:w-3 before:h-3 before:rounded-full before:bg-yellow-300"></div>
      </>
    ),
    iconBg: 'bg-emerald-100',
    icon: '🌿',
    progressColor: 'bg-green-500',
  },
  {
    type: 'material',
    label: '🔬 ทดลองและค้นพบ',
    bg: 'from-sky-200 to-violet-200',
    content: (
      <>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-amber-800"></div>
        <div className="absolute bottom-7 left-8 w-14 h-16 border-[5px] border-white border-t-0 rounded-b-[16px] bg-gradient-to-t from-emerald-400 to-transparent -skew-x-3"></div>
        <div className="absolute bottom-23 left-11 w-6 h-5 border-[5px] border-white border-b-0"></div>
        <div className="absolute bottom-7 right-8 w-12 h-12 rounded-lg bg-yellow-400 shadow-[inset_-8px_-8px_0_rgba(180,83,9,0.2)] rotate-12"></div>
        <div className="absolute top-4 left-28 w-10 h-10 border-[10px] border-red-500 border-b-0 rounded-t-[28px] -rotate-14"></div>
        <div className="absolute top-13 left-[116px] w-3 h-4 bg-white shadow-[40px_0_0_white]"></div>
      </>
    ),
    iconBg: 'bg-blue-100',
    icon: '🔬',
    progressColor: 'bg-blue-500',
  },
  {
    type: 'space',
    label: '🪐 ผจญภัยในอวกาศ',
    bg: 'from-slate-900 via-indigo-950 to-violet-800',
    content: (
      <>
        {[
          { cls: 'top-4 left-5', delay: '0s' },
          { cls: 'top-8 right-6', delay: '0.5s' },
          { cls: 'bottom-6 left-7', delay: '0.8s' },
          { cls: 'top-16 left-1/2', delay: '0.2s' },
        ].map((s, i) => (
          <span key={i} className={`absolute text-white text-sm ${s.cls}`} style={{ animation: `twinkle 1.8s ${s.delay} infinite alternate` }}>✦</span>
        ))}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-10 border border-white/30 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-14 border border-white/30 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-yellow-300 shadow-[0_0_18px_#fbbf24]"></div>
        <div className="absolute top-8 left-11 w-5 h-5 rounded-full bg-sky-400 shadow-[inset_-5px_-4px_0_rgba(30,64,175,0.35)]"></div>
        <div className="absolute bottom-6 right-7 w-7 h-7 rounded-full bg-rose-400 shadow-[inset_-7px_-5px_0_rgba(159,18,57,0.35)]"></div>
        <div className="absolute top-5 right-14 w-7 h-7 rounded-full bg-violet-300 before:absolute before:top-2 before:-left-2 before:w-10 before:h-2 before:border-2 before:border-amber-100 before:rounded-full before:-rotate-15"></div>
      </>
    ),
    iconBg: 'bg-orange-100',
    icon: '🪐',
    progressColor: 'bg-orange-500',
  },
];



export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lessons, subjects } = useAppStore();
  const { user, logout } = useAuth();
  const { missions, completions } = useMissions();
  const { announcements } = useAnnouncements();
  const [confetti, setConfetti] = useState<{ id: number; icon: string; x: number; y: number }[]>([]);

  // Real missions for today
  const todayMissions = useMemo(() => {
    const active = missions.filter(m => m.is_active);
    return active.slice(0, 3);
  }, [missions]);

  // Real announcements from teachers
  const visibleAnnouncements = useMemo(() => {
    return announcements
      .filter(a => a.is_active && (a.target_audience === 'all' || a.target_audience === 'students'))
      .slice(0, 5);
  }, [announcements]);

  const typeEmoji: Record<string, string> = {
    info: '📢', urgent: '🚨', event: '🎉', assignment: '📝',
  };

  const featuredLessons = useMemo(() => {
    return lessons
      .filter(l => l.is_published)
      .slice(0, 3)
      .map((l, idx) => {
        const unit = subjects.find(s => s.id === l.subject_unit_id);
        const theme = coverThemes[idx % coverThemes.length];
        return {
          id: l.id,
          title: l.title,
          grade: unit?.grade_level || 1,
          unitName: unit?.unit_name || '',
          difficulty: l.difficulty,
          cover_image: l.cover_image,
          theme,
        };
      });
  }, [lessons, subjects]);

  // Fill remaining slots with defaults
  while (featuredLessons.length < 3) {
    const idx = featuredLessons.length;
    const defaults = [
      { id: 0, title: 'พืชและสิ่งรอบตัว', grade: 1, unitName: 'สิ่งมีชีวิตกับสิ่งแวดล้อม', difficulty: 1, cover_image: null, theme: coverThemes[0] },
      { id: 0, title: 'วัสดุรอบตัว', grade: 1, unitName: 'วัสดุรอบตัว', difficulty: 1, cover_image: null, theme: coverThemes[1] },
      { id: 0, title: 'ระบบสุริยะ', grade: 4, unitName: 'โลกและอวกาศ', difficulty: 2, cover_image: null, theme: coverThemes[2] },
    ];
    featuredLessons.push(defaults[idx] as any);
  }

  const celebrate = () => {
    const icons = ['⭐', '✨', '🌈', '🪐', '🚀', '🧪', '💙', '💚', '🎉'];
    const items = Array.from({ length: 18 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 18;
      const dist = 80 + Math.random() * 160;
      return {
        id: Date.now() + i,
        icon: icons[Math.floor(Math.random() * icons.length)],
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      };
    });
    setConfetti(items);
    setTimeout(() => setConfetti([]), 1200);
  };

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(circle at 8% 12%, rgba(125,211,252,0.35), transparent 23%), radial-gradient(circle at 88% 18%, rgba(167,243,208,0.42), transparent 24%), radial-gradient(circle at 70% 76%, rgba(253,230,138,0.3), transparent 20%), #f5fcfb'
    }}>
      {/* Floating bubbles */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <span className="absolute top-[15%] left-[4%] text-4xl opacity-40 animate-[drift_7s_ease-in-out_infinite]">🫧</span>
        <span className="absolute top-[44%] right-[4%] text-[35px] opacity-40 animate-[drift_7s_2s_ease-in-out_infinite]">✨</span>
        <span className="absolute bottom-[12%] left-[7%] text-[28px] opacity-40 animate-[drift_7s_4s_ease-in-out_infinite]">⭐</span>
        <span className="absolute bottom-[20%] right-[7%] text-4xl opacity-40 animate-[drift_7s_1s_ease-in-out_infinite]">🧬</span>
      </div>

      {/* Confetti */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 z-[999] pointer-events-none">
          {confetti.map(c => (
            <span
              key={c.id}
              className="absolute top-1/2 left-1/2 text-2xl"
              style={{ animation: 'burst 1.1s ease-out forwards', ['--x' as any]: `${c.x}px`, ['--y' as any]: `${c.y}px` }}
            >{c.icon}</span>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1180px] mx-auto px-5 flex items-center justify-between h-[72px]">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={asset('logo.png')} alt="SciTech" className="w-[43px] h-[43px] rounded-[14px] shadow-[0_6px_14px_rgba(59,130,246,0.24)] object-cover" />
            <div>
              <strong className="block text-sm text-slate-800">SciTech Learning</strong>
              <small className="block text-xs text-slate-400">สนุกกับวิทยาศาสตร์</small>
            </div>
          </Link>

          <nav className="hidden md:flex gap-6 text-sm font-bold text-slate-500">
            <a href="#home" className="text-blue-700 border-b-2 border-blue-600 pb-0.5">🏠 หน้าแรก</a>
            <a href="#lessons" className="hover:text-blue-700 transition">📚 บทเรียน</a>
            <a href="#mission" className="hover:text-blue-700 transition">🎯 ภารกิจ</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">
                  {user.role === 'admin' ? '👨‍🏫' : '🎒'} {user.full_name}
                </Link>
                <button onClick={logout} className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition font-bold">ออก</button>
              </div>
            ) : (
              <Link to="/login" className="hidden sm:inline-block px-5 py-3 rounded-[14px] text-white bg-gradient-to-br from-blue-500 to-teal-500 shadow-[0_7px_16px_rgba(59,130,246,0.25)] font-extrabold text-sm hover:-translate-y-[3px] transition-transform">
                👤 เข้าสู่ระบบ
              </Link>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden w-10 h-10 grid place-items-center rounded-xl hover:bg-blue-50 text-xl">☰</button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="fixed top-0 right-0 w-72 h-full bg-white shadow-2xl z-10 p-6 animate-slide-in rounded-l-3xl">
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full bg-slate-100 text-slate-500">✕</button>
            <div className="flex items-center gap-2 mb-8 mt-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl grid place-items-center text-white text-lg">🔬</div>
              <span className="font-bold text-blue-700">SciTech</span>
            </div>
            <nav className="flex flex-col gap-2">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-blue-600 font-medium py-3 px-4 rounded-xl bg-blue-50">🏠 หน้าแรก</a>
              <a href="#lessons" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-slate-600 py-3 px-4 rounded-xl hover:bg-slate-50">📚 บทเรียน</a>
              <a href="#mission" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-slate-600 py-3 px-4 rounded-xl hover:bg-slate-50">🎯 ภารกิจ</a>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3"></div>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 px-4 rounded-xl text-white bg-gradient-to-br from-blue-500 to-teal-500 font-bold text-sm">👤 เข้าสู่ระบบ</Link>
            </nav>
          </div>
        </div>
      )}

      <main className="relative z-10">
        {/* Hero */}
        <section id="home" className="py-8 md:py-12">
          <div className="max-w-[1180px] mx-auto px-5">
            <div className="grid md:grid-cols-[1.2fr_0.8fr] items-center gap-8 p-8 md:p-14 rounded-[34px] bg-gradient-to-br from-blue-100 via-blue-50/80 to-emerald-100 overflow-hidden">
              <div>
                <h1 className="text-3xl md:text-[55px] font-extrabold leading-tight" style={{ fontFamily: 'Prompt, sans-serif' }}>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500" style={{ WebkitTextStroke: '2px white', textShadow: '2px 2px 4px rgba(0,0,0,0.15)' }}>
                    สวัสดีค่ะ นักเรียน
                  </span>
                  <span className="text-4xl md:text-6xl"> 👋</span>
                  <br />
                  <span className="text-xl md:text-[28px] font-bold">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-500" style={{ WebkitTextStroke: '1px white', textShadow: '2px 2px 4px rgba(220,38,38,0.2)' }}>มาเรียนวิทยาศาสตร์</span>
                    <span className="text-slate-700"> กับ </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500" style={{ WebkitTextStroke: '1px white', textShadow: '2px 2px 4px rgba(249,115,22,0.2)' }}>ครูป็อบ</span>
                    <span className="text-slate-700"> กันเถอะ</span>
                  </span>
                </h1>
                <p className="text-base md:text-lg text-slate-500 mt-5 max-w-[600px] font-medium">
                  <span className="text-orange-500 font-bold">เรียน</span>วิทยาศาสตร์และเทคโนโลยีอย่างสนุก
                  <span className="text-blue-500 font-bold"> เข้าใจง่าย</span>
                  <span className="text-emerald-500 font-bold"> พร้อมสะสมดาว</span>และรางวัล
                </p>
                <div className="flex flex-wrap gap-3 mt-7">
                  <button
                    onClick={() => { celebrate(); setTimeout(() => document.getElementById('lessons')?.scrollIntoView({ behavior: 'smooth' }), 350); }}
                    className="relative overflow-hidden px-6 py-3.5 rounded-[14px] text-white bg-gradient-to-br from-blue-500 to-teal-500 shadow-[0_7px_16px_rgba(59,130,246,0.25)] font-extrabold text-base animate-[gentle-bounce_2.4s_ease-in-out_infinite] hover:-translate-y-[3px] transition-transform after:content-[''] after:absolute after:top-[-110%] after:left-[-40%] after:w-[35%] after:h-[300%] after:bg-white/35 after:rotate-[25deg] hover:after:left-[125%] after:transition-[left] after:duration-500"
                  >
                    🚀 เริ่มเรียนเลย
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="relative animate-[float_3s_ease-in-out_infinite]">
                  <img src={asset('mascot.png')} alt="นักวิทยาศาสตร์" className="w-[350px] h-[350px] md:w-[420px] md:h-[420px] object-contain drop-shadow-2xl" />
                  <span className="absolute text-[35px] top-0 -left-4">🪐</span>
                  <span className="absolute text-[35px] right-[-16px] bottom-4">🚀</span>
                  <span className="absolute text-[25px] top-2 right-4">✨</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lessons */}
        <section id="lessons" className="py-10">
          <div className="max-w-[1180px] mx-auto px-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-[clamp(23px,4vw,30px)] font-extrabold text-slate-800">📚 บทเรียนแนะนำสำหรับคุณ</h2>
              <Link to="/student/lessons" className="text-blue-700 font-extrabold hover:underline text-sm">ดูทั้งหมด →</Link>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {featuredLessons.map((lesson, idx) => {
                const theme = lesson.theme;
                return (
                  <article
                    key={idx}
                    className="relative overflow-hidden p-5 border border-white/80 rounded-[25px] bg-white shadow-[0_10px_25px_rgba(59,130,246,0.14)] transition-[transform,box-shadow] duration-300 hover:-translate-y-[7px] hover:shadow-[0_17px_32px_rgba(59,130,246,0.2)]"
                  >
                    {/* Cover */}
                    <div className={`relative h-[175px] -mx-5 -mt-5 mb-5 overflow-hidden rounded-t-[24px] ${lesson.cover_image ? '' : `bg-gradient-to-br ${theme.bg}`}`}>
                      {lesson.cover_image ? (
                        <img src={lesson.cover_image} alt={lesson.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        theme.content
                      )}
                      <span className="absolute z-10 bottom-3 left-3.5 px-2.5 py-1 rounded-full text-white text-xs font-extrabold bg-slate-900/50 backdrop-blur-sm">{theme.label}</span>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-800 min-h-[54px]">{lesson.title}</h3>

                    <div className="flex gap-2 my-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold">ป.{lesson.grade}</span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold">{lesson.difficulty === 1 ? 'ง่าย' : lesson.difficulty === 2 ? 'ปานกลาง' : 'ยาก'}</span>
                    </div>

                    <div className="flex justify-between text-sm text-slate-500 font-bold mb-1.5">
                      <span>ความคืบหน้า</span>
                      <span>{lesson.id ? Math.floor(Math.random() * 40 + 20) : 0}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 mb-3">
                      <div className={`h-full rounded-full ${theme.progressColor}`} style={{ width: lesson.id ? `${Math.floor(Math.random() * 40 + 20)}%` : '0%' }}></div>
                    </div>

                    <p className="text-sm text-slate-500 font-bold mb-4">⭐ เรียนจบรับ {lesson.difficulty === 1 ? 15 : lesson.difficulty === 2 ? 20 : 25} ดาว</p>

                    <button
                      onClick={() => { celebrate(); if (lesson.id) window.location.href = `/lesson/${lesson.id}`; }}
                      className="w-full py-3 rounded-[13px] text-blue-700 bg-blue-50 font-extrabold text-sm hover:text-white hover:bg-blue-500 transition-colors"
                    >
                      {lesson.id ? '🎮 เรียนต่อ' : '🚀 เริ่มเรียน'}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section id="mission" className="py-10">
          <div className="max-w-[1180px] mx-auto px-5">
            <h2 className="text-[clamp(23px,4vw,30px)] font-extrabold text-slate-800 mb-5">🎯 ภารกิจวันนี้</h2>
            {todayMissions.length === 0 ? (
              <div className="p-8 border border-orange-200 rounded-[28px] bg-gradient-to-r from-orange-50 to-amber-50 shadow-[0_10px_25px_rgba(59,130,246,0.14)] text-center">
                <p className="text-3xl mb-2">🎯</p>
                <p className="text-slate-500 font-bold">ยังไม่มีภารกิจวันนี้ — ลองกลับมาใหม่นะ!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayMissions.map(mission => {
                  const isCompleted = completions.some(c => c.mission_id === mission.id && c.student_id === user?.id);
                  const completion = completions.find(c => c.mission_id === mission.id && c.student_id === user?.id);
                  return (
                    <div key={mission.id} className="p-6 border border-orange-200 rounded-[28px] bg-gradient-to-r from-orange-50 to-amber-50 shadow-[0_10px_25px_rgba(59,130,246,0.14)]">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-orange-600 text-sm font-extrabold">🧪 ภารกิจ</span>
                            {isCompleted && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ สำเร็จแล้ว</span>}
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800 mb-1">{mission.title}</h3>
                          <p className="text-sm text-slate-500 mb-2">{mission.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs font-bold">
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">⭐ {mission.stars_reward} ดาว</span>
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">📝 {mission.question_count} ข้อ</span>
                            {completion && (
                              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700">ได้ {completion.score} คะแนน</span>
                            )}
                          </div>
                        </div>
                        {!isCompleted && user && (
                          <Link
                            to="/student/missions"
                            className="px-5 py-3 rounded-[14px] text-white bg-orange-500 shadow-[0_7px_14px_rgba(249,115,22,0.25)] font-extrabold text-sm shrink-0 hover:-translate-y-[2px] transition-transform text-center"
                          >
                            เริ่มทำเลย
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* News / Announcements */}
        <section className="py-10">
          <div className="max-w-[800px] mx-auto px-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[clamp(23px,4vw,30px)] font-extrabold text-slate-800">📰 ข่าวสารจากคุณครู</h2>
              {visibleAnnouncements.length > 0 && (
                <Link to="/student/announcements" className="text-blue-700 font-extrabold hover:underline text-sm">ดูทั้งหมด →</Link>
              )}
            </div>
            {visibleAnnouncements.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white shadow text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-slate-400 font-bold">ยังไม่มีประกาศใหม่</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleAnnouncements.map(item => (
                  <Link
                    key={item.id}
                    to="/student/announcements"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-lg transition-all"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-2xl grid place-items-center text-2xl shrink-0">
                      {typeEmoji[item.type] || '📢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.content}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{item.created_at}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-8 text-center text-slate-400 bg-slate-800">
        <p className="m-0">© 2569 SciTech Learning • สร้างด้วย ❤️ สำหรับนักเรียนทุกคน</p>
      </footer>
    </div>
  );
}
