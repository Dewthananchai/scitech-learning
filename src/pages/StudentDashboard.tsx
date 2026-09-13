import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { useLessonSession, useLessonProgress, useMissions, useAnnouncements, useWorksheets, useWorksheetSubmissions, useCalendarEvents } from '../store/useStore';
import { getStarConditionStates, getTotalStarsForStudent, starConditionsTotal } from '../lib/starAchievements';
import { useAuth } from '../store/AuthContext';
import StudentNavigationBar from '../components/StudentSidebar';
import MobileHeader from '../components/MobileHeader';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

export default function StudentDashboard() {
  const { lessons , subjects } = useAppStore();
  const { user } = useAuth();
  const { getStatus } = useLessonSession();
  const { isLessonCompleted } = useLessonProgress();
  const { completions } = useMissions();
  const { announcements } = useAnnouncements();
  const { worksheets } = useWorksheets();
  const { submissions } = useWorksheetSubmissions();
  const { events: calendarEvents } = useCalendarEvents();

  // Find the latest in-progress lesson
  const latestInProgress = useMemo(() => {
    if (!user) return null;
    const inProgressLessons = lessons.filter(l => {
      const status = getStatus(l.id, user.id);
      return status === 'in_progress';
    });
    if (inProgressLessons.length === 0) return null;
    return inProgressLessons.sort((a, b) => b.id - a.id)[0];
  }, [lessons, user, getStatus]);

  // Count stats — use session status as single source of truth
  const completedCount = useMemo(() => {
    if (!user) return 0;
    return lessons.filter(l => getStatus(l.id, user.id) === 'completed').length;
  }, [lessons, user, getStatus]);

  const inProgressCount = useMemo(() => {
    if (!user) return 0;
    return lessons.filter(l => getStatus(l.id, user.id) === 'in_progress').length;
  }, [lessons, user, getStatus]);

  // Stars earned = ภารกิจ (quiz missions) + เงื่อนไข 3 ข้อ (เรียนครบ/ข้อสอบ 100%/ส่งใบงานครบ)
  const totalStars = useMemo(() => {
    if (!user) return 0;
    const missionStars = completions.filter(c => c.student_id === user.id).reduce((sum, c) => sum + c.stars_earned, 0);
    return getTotalStarsForStudent(user.id, missionStars);
  }, [completions, user]);

  // เงื่อนไขดาว 3 ข้อ — สถานะจริง (อ่านจากข้อมูลปัจจุบันทุกครั้งที่การ์ดเรนเดอร์)
  const starConditions = useMemo(
    () => (user ? getStarConditionStates(user.id) : []),
    [user, completedCount, submissions.length]
  );
  const starGoal = useMemo(() => starConditionsTotal(), [starConditions]);

  // Active announcements for student
  const myAnnouncements = useMemo(() => {
    return announcements
      .filter(a => a.is_active)
      .slice(0, 3);
  }, [announcements]);

  // Real worksheets for this student (published + matching grade), pending first
  const myWorksheets = useMemo(() => {
    const mine = worksheets.filter(
      w => w.status === 'published' && (!user?.grade_level || w.grade_level === 0 || w.grade_level === user.grade_level)
    );
    const isSubmitted = (wid: number) => submissions.some(s => s.worksheet_id === wid && s.student_id === user?.id);
    return [...mine].sort((a, b) => Number(isSubmitted(a.id)) - Number(isSubmitted(b.id)) || b.id - a.id);
  }, [worksheets, submissions, user]);
  const worksheetIsSubmitted = (wid: number) =>
    submissions.some(s => s.worksheet_id === wid && s.student_id === user?.id);

  // ปฏิทินของฉัน — ข้อมูลจริงจากหน้าจัดการปฏิทิน (กรองตามชั้นของนักเรียน)
  const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const CAL_TYPE_ICONS: Record<string, string> = { lesson: '📚', exam: '📝', holiday: '🏖️', assignment: '📋', event: '🎉' };

  const myCalendarEvents = useMemo(() => {
    if (!user) return [];
    return calendarEvents.filter(e => {
      // กรองตามชั้นเรียน: ไม่ระบุ = ทุกชั้น
      if (e.grade_levels && e.grade_levels.length > 0 && !e.grade_levels.includes(user.grade_level || 0)) return false;
      return true;
    });
  }, [calendarEvents, user]);

  const todayDate = new Date();
  const calYear = todayDate.getFullYear();
  const calMonth = todayDate.getMonth();
  const todayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const firstWeekday = new Date(calYear, calMonth, 1).getDay(); // 0=อาทิตย์
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const isEventOnDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return myCalendarEvents.some(e => e.date === dateStr || (e.end_date && dateStr >= e.date && dateStr <= e.end_date));
  };

  // เซลล์ปฏิทิน: ช่องว่างหน้าแรก + วันที่ 1..สิ้นเดือน (โชว์ไม่เกิน 5 แถว = 35 ช่อง)
  const calendarCells = useMemo(() => {
    const cells: { d: number | null; ev: boolean }[] = [];
    for (let i = 0; i < firstWeekday && cells.length < 35; i++) cells.push({ d: null, ev: false });
    for (let day = 1; day <= daysInMonth && cells.length < 35; day++) cells.push({ d: day, ev: isEventOnDay(day) });
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstWeekday, daysInMonth, myCalendarEvents]);

  const upcomingMyEvents = useMemo(() => {
    return myCalendarEvents
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, [myCalendarEvents, todayStr]);

  const formatEventDate = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS_TH[(m || 1) - 1]?.slice(0, 3) ?? ''}`;
  };

  // Science facts for kids
  const funFact = "รู้หรือไม่? แสงอาทิตย์เดินทางมาถึงโลกเรา ใช้เวลาเพียง 8 นาที 20 วินาที เท่านั้นนะ! ☀️🚀";

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="หน้าแรก" />
      <StudentNavigationBar />

      {/* Main Content Area */}
      {/* iPad/tablet (md): MobileHeader is fixed & full-width → pt-16 keeps content below it.
          lg: header hidden, sidebar 64 → pt-4. */}
      <main className="pt-16 md:pt-16 lg:pt-4 pb-28 md:pb-12 px-3.5 md:px-6 md:ml-20 lg:ml-64 transition-all">
        {/* ============================================================
            1. HERO WELCOME BANNER (Kid-Friendly Cosmic Station)
            ============================================================ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 md:p-7 text-white shadow-xl mb-6">
          {/* Background Decorative Emojis */}
          <div className="absolute top-2 right-4 text-4xl md:text-6xl opacity-25 animate-float select-none pointer-events-none">
            🪐
          </div>
          <div className="absolute bottom-2 right-24 text-3xl md:text-5xl opacity-20 animate-wiggle select-none pointer-events-none">
            ✨
          </div>
          <div className="absolute -left-4 -bottom-4 text-6xl opacity-10 select-none pointer-events-none">
            🚀
          </div>

          <div className="relative z-10 max-w-2xl">
            {/* Grade and Status Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full shadow-xs">
                {user?.grade_level ? `ชั้น ป.${user.grade_level}` : 'ประถมศึกษา'}
              </span>
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
                <span className="animate-bounce-slow">🚀</span>
                <span>นักสำรวจดวงดาว • เลเวล 3</span>
              </span>
              <span className="bg-emerald-400/30 text-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>🔥 สตรีค 3 วัน!</span>
              </span>
            </div>

            {/* Cheerful Greeting */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm mb-2">
              สวัสดีจ้า, {user?.full_name || 'น้องนักเรียน'} <span className="inline-block animate-wiggle">👋</span>
            </h1>
            <p className="text-white/90 text-sm md:text-base font-medium leading-relaxed mb-4 max-w-xl">
              พร้อมออกผจญภัยในโลกวิทยาศาสตร์แสนสนุกหรือยัง? วันนี้มีบทเรียนน่าตื่นเต้นรออยู่นะ! 🌟
            </p>

            {/* XP Level Progress Bar */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold text-white/90 mb-1.5">
                <span className="flex items-center gap-1">
                  <span>⚡ เลเวล 3</span>
                  <span className="text-[10px] text-amber-300">(นักวิทยาศาสตร์ตัวน้อย)</span>
                </span>
                <span className="text-amber-300 font-extrabold">350 / 500 XP</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3 p-0.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: '70%' }}
                />
              </div>
              <p className="text-[11px] text-white/80 mt-1">
                🎯 อีก 150 XP เพื่อปลดล็อกเลเวล 4 และรับเหรียญตราพิเศษ!
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            2. GAMIFIED STATS CARDS (High Contrast & Sharp Typography)
            ============================================================ */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {/* Card 1: Total Stars */}
          <Link
            to="/student/profile"
            className="group card-kid bg-white border-2 border-amber-300/80 p-4 shadow-sm hover:shadow-md hover:border-amber-400 transition-all active:scale-98 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl badge-star-glow">⭐</span>
              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                สะสม
              </span>
            </div>
            <p className="text-xs text-slate-600 font-extrabold mt-1">ดาวของฉัน</p>
            <p className="text-2xl md:text-3xl font-black text-amber-600 mt-0.5">
              {totalStars} <span className="text-xs font-bold text-slate-500">ดวง</span>
            </p>
            <p className="text-[11px] text-amber-700 font-bold mt-1">ไปที่โปรไฟล์ →</p>
          </Link>

          {/* Card 2: Daily Streak */}
          <div className="card-kid bg-white border-2 border-orange-300/80 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl animate-wiggle">🔥</span>
              <span className="text-[10px] font-extrabold bg-orange-100 text-orange-900 px-2 py-0.5 rounded-full">
                ต่อเนื่อง
              </span>
            </div>
            <p className="text-xs text-slate-600 font-extrabold mt-1">สตรีคการเรียน</p>
            <p className="text-2xl md:text-3xl font-black text-orange-600 mt-0.5">
              3 <span className="text-xs font-bold text-slate-500">วันติดกัน</span>
            </p>
            <p className="text-[11px] text-orange-700 font-bold mt-1">เรียนทุกวันนะ 🌟</p>
          </div>

          {/* Card 3: Lessons Completed (High Contrast Colors) */}
          <Link
            to="/student/lessons"
            className="group card-kid bg-white border-2 border-emerald-300/80 p-4 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all active:scale-98 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl">✅</span>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                สำเร็จ
              </span>
            </div>
            <p className="text-xs text-slate-700 font-extrabold mt-1">บทเรียนที่เรียนจบแล้ว</p>
            <p className="text-2xl md:text-3xl font-black text-emerald-700 mt-0.5">
              {completedCount} <span className="text-xs font-bold text-slate-500">บท</span>
            </p>
            <p className="text-[11px] text-emerald-800 font-bold mt-1 group-hover:underline">ดูบทเรียนทั้งหมด →</p>
          </Link>

          {/* Card 4: In Progress (High Contrast Colors) */}
          <Link
            to="/student/lessons"
            className="group card-kid bg-white border-2 border-blue-300/80 p-4 shadow-sm hover:shadow-md hover:border-blue-400 transition-all active:scale-98 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl">📖</span>
              <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                ค้างอยู่
              </span>
            </div>
            <p className="text-xs text-slate-700 font-extrabold mt-1">บทเรียนที่กำลังเรียน</p>
            <p className="text-2xl md:text-3xl font-black text-blue-700 mt-0.5">
              {inProgressCount} <span className="text-xs font-bold text-slate-500">บท</span>
            </p>
            <p className="text-[11px] text-blue-800 font-bold mt-1 group-hover:underline">คลิกเรียนต่อเลย →</p>
          </Link>
        </section>

        {/* ============================================================
            3. KID QUICK ACTION STATION (4 Prominent Buttons)
            ============================================================ */}
        <section className="card-kid p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between mb-3.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">🚀</span>
              <h3 className="font-extrabold text-base md:text-lg text-slate-800 truncate">
                สถานีการเรียนรู้ (เมนูลัดสำหรับเด็กๆ)
              </h3>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
              แตะเพื่อเริ่ม
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/student/lessons"
              className="btn-kid-3d flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white text-center group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">📘</span>
              <span className="text-sm font-extrabold mt-1.5">ห้องเรียนบทเรียน</span>
              <span className="text-[10px] text-sky-100 mt-0.5">เนื้อหาวิทยาศาสตร์</span>
            </Link>

            <Link
              to="/student/quizzes"
              className="btn-kid-3d flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white text-center group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">📝</span>
              <span className="text-sm font-extrabold mt-1.5">ห้องทำข้อสอบ</span>
              <span className="text-[10px] text-pink-100 mt-0.5">ทบทวนความรู้ & O-NET</span>
            </Link>

            <Link
              to="/student/announcements"
              className="btn-kid-3d flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-center group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">📢</span>
              <span className="text-sm font-extrabold mt-1.5">ข่าวประกาศจากครู</span>
              <span className="text-[10px] text-indigo-100 mt-0.5">ข่าวสารและกิจกรรม</span>
            </Link>

            <Link
              to="/student/worksheets"
              className="btn-kid-3d flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-white text-center group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">📋</span>
              <span className="text-sm font-extrabold mt-1.5">ใบงานของฉัน</span>
              <span className="text-[10px] text-amber-100 mt-0.5">ตอบคำถามและกิจกรรม</span>
            </Link>
          </div>
        </section>

        {/* ============================================================
            4. CALENDAR & MISSIONS CARDS (📅 ปฏิทิน + 🎯 ภารกิจดาว)
            ============================================================ */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 min-w-0">
          {/* ── 📅 ปฏิทิน ─────────────────────────────────────────── */}
          <Link
            to="/student/calendar"
            className="group card-kid p-4 md:p-5 flex flex-col justify-between hover:shadow-lg transition-all active:scale-98 border-2 border-violet-200/70 hover:border-violet-400 min-w-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-md shrink-0">
                  📅
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-base text-slate-800 truncate">ปฏิทินของฉัน</h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">กิจกรรมและกำหนดการ</p>
                </div>
              </div>
              <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full group-hover:underline shrink-0">
                ดูปฏิทิน →
              </span>
            </div>

            {/* Mini Calendar Preview — ข้อมูลจริงจากระบบปฏิทิน */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-3 mb-3">
              {/* Month label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-violet-700">{MONTHS_TH[calMonth]} {calYear + 543}</span>
                <span className="text-[10px] bg-violet-200 text-violet-800 font-bold px-2 py-0.5 rounded-full">เดือนนี้</span>
              </div>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-violet-400">{d}</div>
                ))}
              </div>
              {/* Dates — วันที่มีกิจกรรมจริงไฮไลต์ */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarCells.map((cell, i) => (
                  <div
                    key={i}
                    className={`text-center text-[10px] font-bold leading-5 w-5 h-5 mx-auto rounded-full ${
                      cell.ev ? 'bg-violet-500 text-white' : cell.d ? 'text-slate-600' : ''
                    }`}
                  >
                    {cell.d ?? ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming events — จากระบบจริง */}
            <div className="space-y-1.5">
              {upcomingMyEvents.length === 0 ? (
                <div className="p-2 bg-slate-50 rounded-xl text-center">
                  <span className="text-xs text-slate-400 font-medium">ยังไม่มีกิจกรรมที่จะถึง</span>
                </div>
              ) : upcomingMyEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                  <span className="text-base">{CAL_TYPE_ICONS[ev.type] || '🎉'}</span>
                  <span className="text-xs font-bold text-slate-700 flex-1 truncate">{ev.title}</span>
                  <span className="text-[10px] font-extrabold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-lg shrink-0">{formatEventDate(ev.date)}</span>
                </div>
              ))}
            </div>
          </Link>

          {/* ── 🎯 ภารกิจดาว ───────────────────────────────────────── */}
          <Link
            to="/student/missions"
            className="group card-kid p-4 md:p-5 flex flex-col justify-between hover:shadow-lg transition-all active:scale-98 border-2 border-amber-200/70 hover:border-amber-400 min-w-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl shadow-md shrink-0">
                  🎯
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-base text-slate-800 truncate">ภารกิจดาว</h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">สะสมดาวรับรางวัล</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full group-hover:underline shrink-0">
                ดูภารกิจ →
              </span>
            </div>

            {/* Star Progress Banner */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-3.5 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-extrabold text-amber-800">ดาวที่สะสมได้</p>
                  <p className="text-2xl font-black text-amber-600">
                    {totalStars} <span className="text-sm font-bold text-amber-500">ดวง</span>
                  </p>
                </div>
                <div className="text-4xl animate-bounce-slow">⭐</div>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, starGoal > 0 ? (totalStars / starGoal) * 100 : 0)}%` }}
                />
              </div>
              <p className="text-[10px] text-amber-700 font-bold mt-1 text-right">
                เป้าหมาย {starGoal} ดาว 🏆
              </p>
            </div>

            {/* Mission List — เงื่อนไขดาว 3 ข้อ (สถานะจริง) */}
            <div className="space-y-1.5">
              {starConditions.map((m) => (
                <div
                  key={m.key}
                  className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                    m.done ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span className={`text-xs font-bold flex-1 truncate ${m.done ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {m.label}
                  </span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-lg shrink-0 ${
                    m.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {m.done ? `✅ +${m.reward}⭐` : `+${m.reward}⭐ • ${m.progressText}`}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        </section>

        {/* ============================================================
            5. MAIN CONTENT GRID (Tablet 2 cols, Desktop 3 cols)
            Spacious, balanced, and responsive for Mobile, iPad & Desktop!
            ============================================================ */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6 min-w-0">
          {/* Column 1: Continue Learning (เรียนต่อ) */}
          <div className="card-kid p-4 md:p-5 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">📖</span>
                  <h3 className="font-extrabold text-base md:text-lg text-slate-800 truncate">
                    เรียนต่อจากเดิม
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                  บทเรียนล่าสุด
                </span>
              </div>

              {latestInProgress ? (
                (() => {
                  const subject = subjects.find(s => s.id === latestInProgress.subject_unit_id);
                  const gradeLabel = subject?.grade_level ? `ป.${subject.grade_level}` : '';
                  return (
                    <div>
                      <div className="h-32 bg-gradient-to-br from-indigo-400 via-blue-500 to-teal-400 rounded-2xl mb-3 flex items-center justify-center relative overflow-hidden shadow-inner">
                        {latestInProgress.cover_image ? (
                          <img src={latestInProgress.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-6xl animate-float select-none">🔬</span>
                        )}
                        <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-black text-indigo-700 shadow-xs">
                          กำลังเรียนอยู่
                        </div>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base line-clamp-1">{latestInProgress.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {gradeLabel}{subject?.unit_name ? ` • ${subject.unit_name}` : ''}
                      </p>
                      <div className="mt-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full w-2/3 rounded-full" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-medium text-right">เรียนไปแล้วประมาณ 65%</p>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-6">
                  <div className="h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-3 flex items-center justify-center text-4xl">
                    📚
                  </div>
                  <p className="font-bold text-slate-700 text-sm">ยังไม่มีบทเรียนที่เปิดค้างไว้</p>
                  <p className="text-xs text-slate-500 mt-1">เลือกบทเรียนวิทยาศาสตร์สนุกๆ เพื่อเริ่มเรียนรู้</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              {latestInProgress ? (
                <Link
                  to={`/lesson/${latestInProgress.id}`}
                  className="btn-kid-3d w-full block text-center py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-sm shadow-md"
                >
                  🚀 เรียนต่อตอนนี้เลย!
                </Link>
              ) : (
                <Link
                  to="/student/lessons"
                  className="btn-kid-3d w-full block text-center py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-sm shadow-md"
                >
                  📘 เลือกบทเรียนใหม่
                </Link>
              )}
            </div>
          </div>

          {/* Column 2: Worksheets (ใบงานจริงจากครู) */}
          <div className="card-kid p-4 md:p-5 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">📋</span>
                  <h3 className="font-extrabold text-base md:text-lg text-slate-800 truncate">
                    ใบงาน
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                  {myWorksheets.length} รายการ
                </span>
              </div>

              {myWorksheets.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                  <p className="text-2xl mb-1">📭</p>
                  <p className="text-xs text-slate-400 font-semibold">ยังไม่มีใบงาน — เมื่อครูส่งจะปรากฏที่นี่</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myWorksheets.slice(0, 3).map(w => {
                    const done = worksheetIsSubmitted(w.id);
                    return (
                      <Link
                        key={w.id}
                        to={done ? `/student/worksheets/${w.id}?done=1` : `/student/worksheets/${w.id}`}
                        className={`p-3 rounded-2xl transition-all border flex items-center gap-3 ${
                          done ? 'bg-slate-50 border-slate-100 hover:bg-slate-100' : 'bg-green-50/60 border-green-200 hover:bg-green-100/60'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shrink-0 shadow-xs ${
                          done ? 'bg-gradient-to-br from-slate-300 to-slate-400' : 'bg-gradient-to-br from-green-400 to-emerald-500'
                        }`}>
                          {done ? '✅' : '📋'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 truncate">{w.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{w.subject} • {w.questions.length} ข้อ • {w.duration_minutes} นาที</p>
                        </div>
                        <span className={`font-bold text-[10px] py-1 px-2.5 rounded-xl shrink-0 ${
                          done ? 'bg-slate-200 text-slate-600' : 'bg-green-600 text-white'
                        }`}>
                          {done ? 'ส่งแล้ว' : 'ทำต่อ'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                to="/student/worksheets"
                className="text-center block text-xs font-extrabold text-indigo-600 hover:underline"
              >
                📘 ใบงานของฉัน →
              </Link>
            </div>
          </div>

          {/* Column 3: Announcements & Science Tip */}
          <div className="card-kid p-4 md:p-5 flex flex-col justify-between md:col-span-2 lg:col-span-1 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">📢</span>
                  <h3 className="font-extrabold text-base md:text-lg text-slate-800 truncate">
                    ประกาศล่าสุดจากครู
                  </h3>
                </div>
                <Link
                  to="/student/announcements"
                  className="text-xs font-bold text-indigo-600 hover:underline shrink-0"
                >
                  ดูทั้งหมด →
                </Link>
              </div>

              {myAnnouncements.length > 0 ? (
                <div className="space-y-2.5">
                  {myAnnouncements.map((ann) => (
                    <Link
                      key={ann.id}
                      to="/student/announcements"
                      className="block p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-extrabold text-slate-800 truncate">{ann.title}</span>
                        {ann.type === 'urgent' && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">ด่วน</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{ann.content}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-2xl">
                  <span className="text-3xl block mb-1">📭</span>
                  <p className="text-xs text-slate-500">ยังไม่มีประกาศใหม่ในขณะนี้</p>
                </div>
              )}
            </div>

            {/* Science Tip of the Day */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl flex items-start gap-2.5">
                <span className="text-2xl animate-bounce-slow shrink-0">🦉</span>
                <div className="text-xs text-amber-900 leading-relaxed font-medium">
                  <p className="font-extrabold text-amber-950 mb-0.5">เกร็ดวิทย์น่ารู้จากน้องไซเทค:</p>
                  <p>{funFact}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
