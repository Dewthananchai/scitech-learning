import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { GRADES } from '../types';
import StudentSidebar from '../components/StudentSidebar';
import MobileHeader from '../components/MobileHeader';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

const GRADE_CONFIG: Record<number, { 
  icon: string; 
  name: string; 
  theme: string; 
  cardBg: string; 
  border: string; 
  text: string; 
  gradient: string;
  badgeBg: string;
}> = {
  1: { icon: '🌱', name: 'ประถมศึกษาปีที่ 1', theme: 'emerald', cardBg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-700', gradient: 'from-emerald-300 via-teal-400 to-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
  2: { icon: '💧', name: 'ประถมศึกษาปีที่ 2', theme: 'sky', cardBg: 'bg-sky-50/70', border: 'border-sky-200', text: 'text-sky-700', gradient: 'from-sky-300 via-cyan-400 to-blue-500', badgeBg: 'bg-sky-100 text-sky-800' },
  3: { icon: '⚡', name: 'ประถมศึกษาปีที่ 3', theme: 'amber', cardBg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-700', gradient: 'from-amber-300 via-orange-400 to-amber-500', badgeBg: 'bg-amber-100 text-amber-800' },
  4: { icon: '🔬', name: 'ประถมศึกษาปีที่ 4', theme: 'violet', cardBg: 'bg-violet-50/70', border: 'border-violet-200', text: 'text-violet-700', gradient: 'from-violet-300 via-purple-400 to-indigo-500', badgeBg: 'bg-violet-100 text-violet-800' },
  5: { icon: '🧪', name: 'ประถมศึกษาปีที่ 5', theme: 'rose', cardBg: 'bg-rose-50/70', border: 'border-rose-200', text: 'text-rose-700', gradient: 'from-pink-300 via-rose-400 to-red-500', badgeBg: 'bg-rose-100 text-rose-800' },
  6: { icon: '🚀', name: 'ประถมศึกษาปีที่ 6', theme: 'blue', cardBg: 'bg-blue-50/70', border: 'border-blue-200', text: 'text-blue-700', gradient: 'from-blue-400 via-indigo-500 to-violet-600', badgeBg: 'bg-blue-100 text-blue-800' },
};

export default function StudentLessonQuizzes() {
  const { lessons, subjects, questions, quizzes } = useAppStore();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const publishedLessons = useMemo(() => lessons.filter(l => l.is_published), [lessons]);

  // Get lessons that have questions
  const lessonsWithQuizzes = useMemo(() => {
    return publishedLessons.filter(lesson => {
      const qCount = questions.filter(q => q.lesson_id === lesson.id).length;
      if (qCount === 0) return false;

      if (!searchQuery.trim()) return true;
      return lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lesson.summary && lesson.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [publishedLessons, questions, searchQuery]);

  // Group by grade > unit
  const gradeGroups = useMemo(() => {
    const groups: Record<number, Record<number, typeof lessonsWithQuizzes>> = {};
    lessonsWithQuizzes.forEach(lesson => {
      const unit = subjects.find(s => s.id === lesson.subject_unit_id);
      if (!unit) return;
      const grade = unit.grade_level;
      if (!groups[grade]) groups[grade] = {};
      if (!groups[grade][unit.id]) groups[grade][unit.id] = [];
      groups[grade][unit.id].push(lesson);
    });
    return groups;
  }, [lessonsWithQuizzes, subjects]);

  const sortedGrades = Object.keys(gradeGroups).map(Number).sort((a, b) => a - b);
  const activeGrades = selectedGrade ? sortedGrades.filter(g => g === selectedGrade) : sortedGrades;

  const totalQuizzes = lessonsWithQuizzes.length;

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="ข้อสอบตามบทเรียน" />
      <StudentSidebar />

      {/* Main Content Area */}
      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-6 pb-28 md:pb-12 px-3.5 md:px-6 transition-all">
        
        {/* Back Link & Header */}
        <div className="mb-4">
          <Link 
            to="/student/quizzes" 
            className="btn-kid-3d inline-flex items-center gap-1.5 text-xs font-black text-slate-700 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl mb-3 hover:bg-white shadow-xs border border-white"
          >
            <span>← กลับศูนย์รวมข้อสอบ</span>
          </Link>
        </div>

        {/* Kid Hero Welcome Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 rounded-3xl p-5 md:p-7 text-white shadow-xl shadow-cyan-500/20 mb-6 overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute top-2 right-1/4 text-4xl opacity-20 select-none animate-bounce">📝</div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-yellow-300 mb-2.5 shadow-xs">
                <span>📚 ทดสอบความรู้ท้ายบทเรียน</span>
                <span>•</span>
                <span>ป.1 - ป.6</span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                <span>📝 ข้อสอบตามบทเรียน</span>
              </h1>
              <p className="text-cyan-100 text-xs md:text-sm mt-1 max-w-xl font-medium">
                ทำแบบทดสอบเพื่อทบทวนความเข้าใจ มีเฉลยและอธิบายคำตอบท้ายบททันที!
              </p>
            </div>

            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 self-start md:self-auto">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-[10px] text-cyan-200 leading-tight">แบบทดสอบพร้อมให้ทำ</p>
                <p className="text-base font-extrabold text-white">{totalQuizzes} <span className="text-xs font-normal">ชุด</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="card-kid p-4 md:p-5 mb-6">
          {/* Search Input */}
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อแบบทดสอบ หรือบทเรียน..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-sm rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition font-medium text-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Grade Selector Pills - Mobile Grid & Desktop Flex */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                <span>🎓 เลือกระดับชั้นเรียน:</span>
              </span>
              {selectedGrade && (
                <button 
                  onClick={() => setSelectedGrade(null)} 
                  className="text-[11px] font-bold text-cyan-600 hover:underline"
                >
                  แสดงทุกชั้นเรียน ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedGrade(null)}
                className={`btn-kid-3d min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                  !selectedGrade
                    ? 'bg-cyan-600 text-white shadow-md border-2 border-cyan-400'
                    : 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🌟 ทั้งหมด</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  !selectedGrade ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {totalQuizzes}
                </span>
              </button>

              {GRADES.map(g => {
                const count = Object.values(gradeGroups[g.level] || {}).flat().length;
                const gConf = GRADE_CONFIG[g.level] || GRADE_CONFIG[1];
                const isSelected = selectedGrade === g.level;
                return (
                  <button
                    key={g.level}
                    onClick={() => setSelectedGrade(g.level)}
                    className={`btn-kid-3d min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `bg-gradient-to-r ${gConf.gradient} text-white shadow-md border-2 border-white/60`
                        : `bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50`
                    }`}
                  >
                    <span>{gConf.icon}</span>
                    <span>{g.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quiz List */}
        {activeGrades.length === 0 ? (
          <div className="card-kid p-12 text-center text-slate-400 max-w-lg mx-auto">
            <div className="w-20 h-20 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center text-4xl animate-pulse">
              📝
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบแบบทดสอบที่ค้นหา</h3>
            <p className="text-xs text-slate-500 mb-4">ลองเปลี่ยนคำค้นหา หรือเลือกระดับชั้นอื่นดูนะครับ</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedGrade(null); }}
              className="btn-kid-3d px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-2xl"
            >
              แสดงแบบทดสอบทั้งหมด
            </button>
          </div>
        ) : (
          activeGrades.map(grade => {
            const units = gradeGroups[grade];
            const unitIds = Object.keys(units).map(Number).sort((a, b) => a - b);
            const gradeTotal = unitIds.reduce((sum, uid) => sum + units[uid].length, 0);
            const gConf = GRADE_CONFIG[grade] || GRADE_CONFIG[1];

            return (
              <div key={grade} className="mb-10">
                {/* Grade Section Banner */}
                <div className="flex items-center justify-between gap-3 mb-4 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{gConf.icon}</span>
                    <div>
                      <h2 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2">
                        <span>{gConf.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {GRADES.find(g => g.level === grade)?.label || `ป.${grade}`}
                        </span>
                      </h2>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${gConf.badgeBg}`}>
                    {gradeTotal} ชุดแบบทดสอบ
                  </span>
                </div>

                {/* Units */}
                {unitIds.map(unitId => {
                  const unit = subjects.find(s => s.id === unitId);
                  const unitLessons = units[unitId];

                  return (
                    <div key={unitId} className="mb-6">
                      {/* Unit Header */}
                      <div className="flex items-center gap-2 mb-3 ml-1">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-sm">
                          📂
                        </div>
                        <h3 className="font-extrabold text-sm md:text-base text-slate-800">
                          <span className="text-blue-600 font-black">{unit?.unit_code || 'หน่วยที่'}</span> {unit?.unit_name || 'หน่วยการเรียนรู้'}
                        </h3>
                        <span className="text-[11px] font-bold bg-white/90 text-slate-600 px-2 py-0.5 rounded-full shadow-2xs">
                          {unitLessons.length} ชุด
                        </span>
                      </div>

                      {/* Quiz Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                        {unitLessons.map(lesson => {
                          const qCount = questions.filter(q => q.lesson_id === lesson.id).length;
                          const quizConfig = quizzes.find(q => q.lesson_id === lesson.id);

                          return (
                            <Link
                              key={lesson.id}
                              to={`/quiz/${lesson.id}`}
                              className="card-kid group overflow-hidden flex flex-col hover:-translate-y-1.5 transition-all duration-200 border-2 border-white hover:border-cyan-300"
                            >
                              {/* Cover */}
                              <div className={`h-32 bg-gradient-to-br ${gConf.gradient} relative overflow-hidden flex items-center justify-center`}>
                                <span className="text-5xl drop-shadow-md select-none group-hover:scale-110 transition duration-300">📝</span>
                                
                                <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md text-xs px-2.5 py-1 rounded-full font-black text-slate-800 shadow-sm flex items-center gap-1">
                                  <span>📝</span>
                                  <span>{qCount} ข้อ</span>
                                </div>

                                <div className="absolute bottom-2 left-2.5 z-10">
                                  <span className="bg-white/90 backdrop-blur-md text-slate-800 text-[10px] px-2 py-0.5 rounded-md font-extrabold shadow-xs">
                                    {GRADES.find(g => g.level === grade)?.label || `ป.${grade}`}
                                  </span>
                                </div>
                              </div>

                              {/* Info */}
                              <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                                <div>
                                  <h4 className="font-extrabold text-sm md:text-base text-slate-900 group-hover:text-cyan-600 transition line-clamp-1 mb-1.5">
                                    แบบทดสอบ: {lesson.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                                    {quizConfig?.description || lesson.summary || 'แบบทดสอบประเมินความรู้ท้ายบทเรียน พร้อมเฉลยและบันทึกคะแนน'}
                                  </p>
                                </div>

                                {/* Footer & Metadata */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    {quizConfig?.time_limit_minutes && (
                                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                        ⏱️ {quizConfig.time_limit_minutes} น.
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                      lesson.difficulty === 1 ? 'bg-emerald-100 text-emerald-700' :
                                      lesson.difficulty === 2 ? 'bg-amber-100 text-amber-700' :
                                      'bg-rose-100 text-rose-700'
                                    }`}>
                                      {lesson.difficulty === 1 ? '🌱 ง่าย' : lesson.difficulty === 2 ? '⚡ ปานกลาง' : '🔥 ท้าทาย'}
                                    </span>
                                  </div>

                                  <span className="btn-kid-3d font-extrabold text-xs text-cyan-600 group-hover:text-white group-hover:bg-cyan-600 px-2.5 py-1 rounded-xl transition flex items-center gap-1">
                                    <span>เริ่มทำ</span>
                                    <span>➜</span>
                                  </span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}