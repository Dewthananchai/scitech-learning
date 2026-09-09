import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { useWorksheets, useWorksheetSubmissions } from '../store/useStore';
import { ONET_SUBJECTS, M1_SUBJECTS } from '../types';
import { getM1BankCount } from '../data/m1BankData';
import { getOnetBankCount } from '../data/onetBankData';
import StudentSidebar from '../components/StudentSidebar';
import MobileHeader from '../components/MobileHeader';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

export default function StudentQuizzes() {
  const { lessons, questions } = useAppStore();
  const { user } = useAuth();

  const publishedLessons = useMemo(() => lessons.filter(l => l.is_published), [lessons]);

  // Get lessons that have questions
  const lessonsWithQuizzes = useMemo(() => {
    return publishedLessons.filter(lesson => {
      const qCount = questions.filter(q => q.lesson_id === lesson.id).length;
      return qCount > 0;
    });
  }, [publishedLessons, questions]);

  const totalQuizzes = lessonsWithQuizzes.length;
  const lessonQuestionsCount = useMemo(() => questions.filter(q => q.lesson_id && q.lesson_id > 0).length, [questions]);
  const onetCount = useMemo(() => getOnetBankCount(), []);
  const m1Count = useMemo(() => getM1BankCount(), []);
  const { worksheets } = useWorksheets();
  const { submissions } = useWorksheetSubmissions();

  // Worksheets for this student (published + matching grade) and how many are still pending
  const myWorksheets = useMemo(
    () => worksheets.filter(w => w.status === 'published' && (!user?.grade_level || w.grade_level === 0 || w.grade_level === user.grade_level)),
    [worksheets, user]
  );
  const pendingWorksheets = useMemo(
    () => myWorksheets.filter(w => !submissions.some(s => s.worksheet_id === w.id && s.student_id === user?.id)).length,
    [myWorksheets, submissions, user]
  );

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="ข้อสอบ" />
      <StudentSidebar />

      {/* Main Content */}
      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-6 pb-28 md:pb-12 px-3.5 md:px-6 transition-all">
        
        {/* Kid Hero Welcome Header */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 rounded-3xl p-5 md:p-7 text-white shadow-xl shadow-indigo-500/25 mb-6 overflow-hidden border-2 border-white/20">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute top-2 right-1/4 text-4xl opacity-20 select-none animate-bounce">🎯</div>
          <div className="absolute bottom-3 right-1/3 text-3xl opacity-20 select-none">🏆</div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-yellow-400 text-slate-950 px-3.5 py-1 rounded-full text-xs font-black mb-2.5 shadow-sm">
                <span>🏆 ศูนย์รวมข้อสอบ</span>
                <span>•</span>
                <span>สะสมคะแนนเต็ม 100%</span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                <span>📝 ลานประลองข้อสอบ</span>
              </h1>
              <p className="text-blue-100 text-xs md:text-sm mt-1 max-w-xl font-semibold">
                เลือกสนามสอบที่ต้องการฝึกฝน ท้าทายความรู้ และรับเหรียญรางวัลเพื่ออัปเลเวล! ⭐
              </p>
            </div>
          </div>
        </div>

        {/* 3 Gamified Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Stat 1: Lesson Quizzes */}
          <div className="card-kid p-5 border-2 border-blue-200 hover:border-blue-400 transition flex items-center gap-4 bg-white shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
              📚
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-600">แบบทดสอบตามบท</p>
              <p className="text-2xl lg:text-3xl font-black text-blue-800">
                {totalQuizzes} <span className="text-xs font-bold text-slate-500">ชุด ({lessonQuestionsCount} ข้อ)</span>
              </p>
            </div>
          </div>

          {/* Stat 2: O-NET */}
          <div className="card-kid p-5 border-2 border-orange-200 hover:border-orange-400 transition flex items-center gap-4 bg-white shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
              🎯
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-600">ข้อสอบ O-NET ป.6</p>
              <p className="text-2xl lg:text-3xl font-black text-orange-700">
                {onetCount} <span className="text-xs font-bold text-slate-500">ข้อ ({ONET_SUBJECTS.length} วิชา)</span>
              </p>
            </div>
          </div>

          {/* Stat 3: M.1 Entrance */}
          <div className="card-kid p-5 border-2 border-purple-200 hover:border-purple-400 transition flex items-center gap-4 bg-white shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
              🏫
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-600">ข้อสอบเข้า ม.1</p>
              <p className="text-2xl lg:text-3xl font-black text-purple-800">
                {m1Count} <span className="text-xs font-bold text-slate-500">ข้อ ({M1_SUBJECTS.length} วิชา)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🎪</span>
          <h2 className="text-lg md:text-xl font-black text-slate-900">เลือกสนามประลองข้อสอบ</h2>
        </div>

        {/* Main Quizzes Selection Area - All Clean High-Contrast White Cards */}
        <div className="space-y-5 mb-8">
          
          {/* Portal 1: ข้อสอบตามบทเรียน (Clean White Card) */}
          <Link
            to="/student/quizzes/lessons"
            className="card-kid group p-6 md:p-7 block bg-white hover:border-blue-500 hover:shadow-xl transition-all duration-200 relative overflow-hidden border-2 border-blue-200"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl shadow-md group-hover:scale-105 transition duration-200 shrink-0 font-black">
                  📚
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 text-[11px] font-black px-2.5 py-0.5 rounded-full mb-1 border border-blue-300">
                    <span>🌟 แนะนำสำหรับทบทวน</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition">
                    ข้อสอบตามบทเรียนวิทยาศาสตร์
                  </h3>
                  <p className="text-xs md:text-sm text-slate-700 mt-1 max-w-xl font-semibold leading-relaxed">
                    แบบทดสอบท้ายบทเรียน แยกตามระดับชั้น ป.1 - ป.6 มีระบบตรวจคำตอบทันที รู้คะแนนทันใจ!
                  </p>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                    <span className="bg-emerald-100 text-emerald-950 font-black px-3 py-1 rounded-xl border border-emerald-300">
                      ✅ ครบทั้ง {totalQuizzes} ชุด
                    </span>
                    <span className="bg-blue-100 text-blue-950 font-black px-3 py-1 rounded-xl border border-blue-300">
                      📝 {lessonQuestionsCount} ข้อในคลังบทเรียน
                    </span>
                    <span className="bg-purple-100 text-purple-950 font-black px-3 py-1 rounded-xl border border-purple-300">
                      ⭐ ป.1 - ป.6
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="self-end md:self-center">
                <span className="btn-kid-3d inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black text-sm rounded-2xl shadow-md group-hover:bg-blue-700">
                  <span>เลือกทำแบบทดสอบ</span>
                  <span>➜</span>
                </span>
              </div>
            </div>
          </Link>

          {/* Portal 2 & 3: O-NET and M.1 Grid (All Clean White Cards with High-Contrast Text) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* O-NET Exam Card - Clean White Card with Orange Accent */}
            <Link
              to="/student/quiz-practice/onet"
              className="card-kid group p-6 block bg-white hover:border-orange-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative overflow-hidden border-2 border-orange-300"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0 font-black">
                      🚀
                    </div>
                    <div>
                      <span className="bg-orange-100 text-orange-950 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-orange-300">
                        เตรียมสอบระดับชาติ
                      </span>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition mt-0.5">
                        ข้อสอบ O-NET ป.6
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 mb-4 font-semibold leading-relaxed">
                    คลังข้อสอบ O-NET วิทยาศาสตร์และวิชาอื่นๆ ฝึกทำจับเวลาจริง พร้อมเฉลยละเอียดทุกข้อ
                  </p>

                  {/* Subject Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {ONET_SUBJECTS.map(s => (
                      <span key={s} className="bg-orange-50 text-orange-950 text-[11px] font-extrabold px-3 py-1 rounded-xl border border-orange-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                    📝 คลังโจทย์ {onetCount} ข้อ
                  </span>
                  <span className="btn-kid-3d bg-orange-600 hover:bg-orange-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md flex items-center gap-1">
                    <span>ลุยข้อสอบ O-NET</span>
                    <span>➜</span>
                  </span>
                </div>
              </div>
            </Link>

            {/* M.1 Exam Card - Clean White Card with Purple Accent */}
            <Link
              to="/student/m1-practice"
              className="card-kid group p-6 block bg-white hover:border-purple-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative overflow-hidden border-2 border-purple-300"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0 font-black">
                      🎓
                    </div>
                    <div>
                      <span className="bg-purple-100 text-purple-950 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-purple-300">
                        สอบคัดเลือก ม.1
                      </span>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-purple-600 transition mt-0.5">
                        ข้อสอบเข้า ม.1
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 mb-4 font-semibold leading-relaxed">
                    ตะลุยโจทย์สอบเข้าโรงเรียนดัง ม.1 ดึงข้อสอบสดตรงจากระบบจัดการคลังข้อสอบเข้า ม.1
                  </p>

                  {/* Subject Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {M1_SUBJECTS.map(s => (
                      <span key={s} className="bg-purple-50 text-purple-950 text-[11px] font-extrabold px-3 py-1 rounded-xl border border-purple-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    📝 คลังโจทย์ {m1Count} ข้อ
                  </span>
                  <span className="btn-kid-3d bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md flex items-center gap-1">
                    <span>เข้าห้องสอบ ม.1</span>
                    <span>➜</span>
                  </span>
                </div>
              </div>
            </Link>
          </div>  
        </div>

        {/* Mascot Science Tip Box */}
        <div className="card-kid p-5 bg-amber-50/90 border-2 border-amber-300 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0 font-bold">
            🦉
          </div>
          <div>
            <h4 className="font-black text-amber-950 text-sm">💡 เคล็ดลับทำข้อสอบจากน้องไซเทค</h4>
            <p className="text-xs text-amber-900 mt-0.5 font-bold leading-relaxed">
              ก่อนเลือกคำตอบ ให้อ่านโจทย์ให้จบทุกข้อ ตัดตัวเลือกที่มั่นใจว่าผิดออกก่อน จะช่วยเพิ่มโอกาสได้คะแนนเต็ม 100% นะครับ! สู้ๆ นะคนเก่ง ✨
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}