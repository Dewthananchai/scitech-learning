import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorksheets, useWorksheetSubmissions } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import { GRADES } from '../types';
import StudentSidebar from '../components/StudentSidebar';
import MobileHeader from '../components/MobileHeader';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

export default function StudentWorksheets() {
  const { worksheets } = useWorksheets();
  const { submissions } = useWorksheetSubmissions();
  const { user } = useAuth();

  // Published worksheets for this student's grade (or all grades if none set)
  const myWorksheets = useMemo(
    () => worksheets.filter(w => w.status === 'published' && (!user?.grade_level || w.grade_level === 0 || w.grade_level === user.grade_level)),
    [worksheets, user]
  );

  const submissionFor = (worksheetId: number) =>
    submissions.find(s => s.worksheet_id === worksheetId && s.student_id === user?.id);

  const pendingCount = myWorksheets.filter(w => !submissionFor(w.id)).length;

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="ใบงาน" />
      <StudentSidebar />

      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-6 pb-28 md:pb-12 px-3.5 md:px-6 transition-all max-w-7xl mx-auto">
        {/* Hero */}
        <div className="relative bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 rounded-3xl p-5 md:p-7 text-white shadow-xl shadow-green-600/25 mb-6 overflow-hidden border-2 border-white/20">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-2 right-4 text-4xl opacity-20 select-none animate-float pointer-events-none">📋</div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-slate-950 px-3.5 py-1 rounded-full text-xs font-black mb-2.5 shadow-sm">
              <span>✏️ ใบงานจากคุณครู</span>
              <span>•</span>
              <span>ทำเสร็จรับคะแนน!</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">📋 ใบงานของฉัน</h1>
            <p className="text-green-50 text-xs md:text-sm mt-1 font-semibold">
              ตอบคำถามและกิจกรรมที่ครูส่งมาให้ — ระยะเวลาทำจับเวลาจริง ⏱️
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs font-black">
              <span className="bg-white/20 border border-white/30 px-3 py-1 rounded-xl">รวม {myWorksheets.length} ใบ</span>
              <span className="bg-amber-300 text-amber-950 px-3 py-1 rounded-xl">⏳ รอส่ง {pendingCount} ใบ</span>
              <span className="bg-white/20 border border-white/30 px-3 py-1 rounded-xl">✅ ส่งแล้ว {myWorksheets.length - pendingCount} ใบ</span>
            </div>
          </div>
        </div>

        {/* Worksheet cards */}
        {myWorksheets.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center text-slate-400 border-2 border-dashed border-slate-200">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-bold text-slate-500 mb-1">ยังไม่มีใบงานในตอนนี้</p>
            <p className="text-sm">เมื่อครูเผยแพร่ใบงานจะปรากฏที่นี่นะ 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myWorksheets.map(w => {
              const grade = GRADES.find(g => g.level === w.grade_level);
              const submission = submissionFor(w.id);
              const totalScore = w.questions.reduce((s, q) => s + q.score, 0);
              return (
                <Link
                  key={w.id}
                  to={submission ? `/student/worksheets/${w.id}?done=1` : `/student/worksheets/${w.id}`}
                  className={`block bg-white rounded-3xl p-5 border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                    submission ? 'border-slate-200 hover:border-slate-400' : 'border-green-200 hover:border-green-500 hover:shadow-green-600/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm ${
                      submission ? 'bg-slate-100 text-slate-500' : 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 border border-green-200'
                    }`}>
                      {submission ? '✅' : '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-black text-slate-900">{w.title}</h3>
                        {submission ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            ส่งแล้ว {submission.submitted_at}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                            รอส่ง
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-semibold">
                        {w.subject} {grade ? `• ${grade.label}` : ''} {w.unit_name ? `• ${w.unit_name}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px] font-extrabold">
                        <span className="bg-blue-50 text-blue-950 px-2.5 py-1 rounded-xl border border-blue-200">
                          📝 {w.questions.length} ข้อ
                        </span>
                        <span className="bg-amber-50 text-amber-950 px-2.5 py-1 rounded-xl border border-amber-200">
                          ⭐ {totalScore} คะแนน
                        </span>
                        <span className="bg-purple-50 text-purple-950 px-2.5 py-1 rounded-xl border border-purple-200">
                          ⏱️ {w.duration_minutes} นาที
                        </span>
                      </div>
                    </div>
                    <span className={`btn-kid-3d hidden sm:flex items-center gap-1 px-4 py-2 text-white text-xs font-black rounded-xl shadow-md shrink-0 ${
                      submission ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'
                    }`}>
                      <span>{submission ? 'ดูใบงาน' : 'เริ่มทำ'}</span>
                      <span>➜</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
