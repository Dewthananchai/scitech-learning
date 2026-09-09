import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWorksheets, useWorksheetSubmissions } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import { GRADES, Worksheet, WorksheetAnswer, WorksheetQuestion } from '../types';
import StudentSidebar from '../components/StudentSidebar';
import MobileHeader from '../components/MobileHeader';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง'];
const TYPE_LABELS: Record<WorksheetQuestion['type'], string> = {
  mc: '📊 ปรนัย',
  essay: '✍️ อัตนัย',
  fill: '✏️ เติมคำ',
};

export default function StudentWorksheetDo() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { worksheets } = useWorksheets();
  const { submissions, submitWorksheet } = useWorksheetSubmissions();
  const { user } = useAuth();

  const worksheet: Worksheet | undefined = useMemo(
    () => worksheets.find(w => w.id === Number(id) && w.status === 'published'),
    [worksheets, id]
  );

  const alreadySubmitted = useMemo(
    () => submissions.find(s => s.worksheet_id === Number(id) && s.student_id === user?.id),
    [submissions, id, user]
  );
  const viewOnly = !!alreadySubmitted || searchParams.get('done') === '1';

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeDot, setActiveDot] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [submitted, setSubmitted] = useState(viewOnly);
  const [toast, setToast] = useState<string | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState(worksheet ? worksheet.duration_minutes * 60 : 0);
  const submittedRef = useRef(submitted);
  submittedRef.current = submitted;

  // Initialize answers from an existing submission (view mode)
  useEffect(() => {
    if (alreadySubmitted && user) {
      const map: Record<number, string> = {};
      alreadySubmitted.answers.forEach(a => { map[a.question_id] = a.value; });
      setAnswers(map);
    }
  }, [alreadySubmitted, user]);

  // Countdown timer → auto submit at 0
  useEffect(() => {
    if (!worksheet || submitted) return;
    const timer = setInterval(() => {
      setTimeLeftSec(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [worksheet, submitted]);

  // Auto-submit when time hits 0
  useEffect(() => {
    if (worksheet && !submitted && timeLeftSec === 0 && worksheet.duration_minutes > 0) {
      alert('⏰ หมดเวลาทำใบงาน ระบบจะส่งคำตอบอัตโนมัติ');
      doSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSec]);

  if (!worksheet) {
    return (
      <div className="st-page min-h-screen">
        <style>{STUDENT_THEME_CSS}</style>
        <MobileHeader title="ใบงาน" />
        <StudentSidebar />
        <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-6 pb-28 md:pb-12 px-3.5 md:px-6">
          <div className="bg-white rounded-3xl shadow p-12 text-center text-slate-400 max-w-2xl">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-bold text-slate-500 mb-4">ไม่พบใบงานนี้</p>
            <button onClick={() => navigate('/student/worksheets')} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all">
              ← กลับไปหน้าใบงาน
            </button>
          </div>
        </main>
      </div>
    );
  }

  const grade = GRADES.find(g => g.level === worksheet.grade_level);
  const totalScore = worksheet.questions.reduce((s, q) => s + q.score, 0);
  const answeredCount = worksheet.questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;

  const setAnswer = (q: WorksheetQuestion, value: string) => {
    setAnswers(prev => ({ ...prev, [q.id]: value }));
  };

  const isAnswered = (q: WorksheetQuestion) => answers[q.id] !== undefined && answers[q.id] !== '';

  const scrollToQ = (index: number) => {
    setActiveDot(index);
    const el = document.getElementById(`qcard-${index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const doSubmit = (isLate: boolean) => {
    if (submittedRef.current || !worksheet || !user) return;
    const answersArr: WorksheetAnswer[] = worksheet.questions
      .filter(q => answers[q.id] !== undefined && answers[q.id] !== '')
      .map(q => ({ question_id: q.id, value: answers[q.id] }));
    submitWorksheet({
      worksheet_id: worksheet.id,
      student_id: user.id,
      answers: answersArr,
      submitted_at: new Date().toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      is_late: isLate,
    });
    setSubmitted(true);
    setToast('✅ ส่งคำตอบเรียบร้อย!');
    setTimeout(() => setToast(null), 2500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmSubmit = () => setShowSubmitModal(true);

  const timerWarn = timeLeftSec <= 60;
  const timerText = `⏱ ${Math.floor(timeLeftSec / 60).toString().padStart(2, '0')}:${(timeLeftSec % 60).toString().padStart(2, '0')}`;

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <style>{`
        @keyframes ws-pulse { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:.85; transform:scale(1.03);} }
        .ws-timer-warn { background:#dc2626 !important; animation: ws-pulse 1s infinite; }
        .ws-input:focus { outline:none; border-color:#16a34a; box-shadow:0 0 0 4px #dcfce7; background:#fff; }
      `}</style>
      <MobileHeader title="ใบงาน" />
      <StudentSidebar />

      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-4 pb-28 md:pb-12 px-3.5 md:px-6 transition-all max-w-7xl mx-auto">
        {/* Green topbar card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 text-white shadow-xl shadow-green-600/25 border-2 border-white/20 mb-5">
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 90% -10%, rgba(255,255,255,.5), transparent 45%)' }} />
          <div className="relative z-10 flex items-center gap-3 p-5 md:p-6">
            <button
              onClick={() => (submitted ? navigate('/student/worksheets') : setShowExitModal(true))}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white text-lg font-bold transition-all shrink-0"
              aria-label="กลับ"
            >
              ←
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-base md:text-lg truncate">{worksheet.title}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-[11px] md:text-xs opacity-90 font-semibold">
                  {worksheet.subject} {grade ? `• ${grade.label}` : ''}
                </span>
                {worksheet.unit_name && (
                  <span className="text-[11px] bg-white/25 px-2.5 py-0.5 rounded-full font-semibold truncate max-w-[220px]">
                    📘 {worksheet.unit_name}
                  </span>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 bg-white/20 px-3.5 py-2 rounded-xl font-black text-sm md:text-base whitespace-nowrap transition-all ${timerWarn && !submitted ? 'ws-timer-warn' : ''}`}>
              {submitted ? '✔️ ส่งแล้ว' : timerText}
            </div>
          </div>

          {/* Progress */}
          <div className="relative z-10 px-5 md:px-6 pb-5">
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-300 rounded-full transition-all duration-500"
                style={{ width: `${worksheet.questions.length ? (answeredCount / worksheet.questions.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] md:text-xs text-white/80 text-right mt-1.5 font-bold">
              ตอบแล้ว {answeredCount}/{worksheet.questions.length} ข้อ • {totalScore} คะแนน
            </p>
          </div>
        </div>

        {submitted && (
          <div className="bg-green-50 border-2 border-green-200 text-green-800 rounded-2xl p-4 mb-5 text-sm font-bold text-center">
            ✅ คุณส่งคำตอบ{alreadySubmitted ? `เมื่อ ${alreadySubmitted.submitted_at}` : ''} แล้ว — คำตอบของคุณปรากฏด้านล่าง (อ่านอย่างเดียว)
          </div>
        )}

        {/* Question cards */}
        <div className="space-y-5">
          {worksheet.questions.map((q, index) => (
            <div
              key={q.id}
              id={`qcard-${index}`}
              className={`bg-white rounded-2xl border-2 overflow-hidden transition-all scroll-mt-40 ${
                isAnswered(q) ? 'border-green-300 shadow-lg shadow-green-600/10' : 'border-slate-200'
              }`}
            >
              {/* Head */}
              <div className="flex items-center gap-2.5 flex-wrap bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-green-100">
                <span className="font-black text-sm text-green-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-black">{index + 1}</span>
                  ข้อที่ {index + 1}
                </span>
                <span className="text-[11px] text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full font-bold">{TYPE_LABELS[q.type]}</span>
                <span className="ml-auto text-[11px] text-green-800 bg-white px-2.5 py-1 rounded-full font-bold border border-green-100">
                  {q.score} คะแนน
                </span>
              </div>

              {/* Body */}
              <div className="p-4 md:p-5">
                <p className="text-[15px] font-semibold text-slate-800 leading-relaxed mb-4 whitespace-pre-wrap">{q.text}</p>
                {q.image && (
                  <img src={q.image} alt="รูปประกอบคำถาม" className="w-full max-h-72 object-cover rounded-2xl mb-4 shadow-md" />
                )}

                {/* MC */}
                {q.type === 'mc' && (
                  <div className="space-y-2.5">
                    {q.choices.map((choice, ci) => {
                      const selected = answers[q.id] === String(ci);
                      return (
                        <button
                          key={ci}
                          disabled={submitted}
                          onClick={() => setAnswer(q, String(ci))}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? 'bg-green-50 border-green-500 shadow-md shadow-green-600/10'
                              : 'bg-white border-slate-200 hover:bg-green-50/50 hover:border-green-300'
                          } ${submitted ? 'cursor-default' : ''}`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                            selected ? 'bg-green-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-400'
                          }`}>
                            {CHOICE_LABELS[ci]}
                          </span>
                          <span className="text-[14.5px] font-semibold text-slate-800">{choice}</span>
                          {selected && <span className="ml-auto text-green-600 font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Fill */}
                {q.type === 'fill' && (
                  <input
                    type="text"
                    disabled={submitted}
                    value={answers[q.id] || ''}
                    onChange={e => setAnswer(q, e.target.value)}
                    placeholder="พิมพ์คำตอบที่นี่..."
                    className="ws-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50/60 transition-all"
                  />
                )}

                {/* Essay */}
                {q.type === 'essay' && (
                  <>
                    <textarea
                      rows={5}
                      disabled={submitted}
                      value={answers[q.id] || ''}
                      onChange={e => setAnswer(q, e.target.value)}
                      placeholder="พิมพ์คำตอบของคุณที่นี่..."
                      className="ws-input w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50/60 resize-y transition-all"
                    />
                    <p className="text-right text-[11px] text-slate-400 font-semibold mt-1">
                      {(answers[q.id] || '').length} ตัวอักษร
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Nav dots */}
        <div className="flex flex-wrap gap-2.5 mt-6 p-4 bg-white rounded-2xl border-2 border-slate-100">
          {worksheet.questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => scrollToQ(index)}
              className={`w-9 h-9 rounded-xl border-2 text-[13px] font-black flex items-center justify-center transition-all hover:-translate-y-0.5 ${
                isAnswered(q)
                  ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-400'
              } ${activeDot === index ? 'border-green-700 ring-4 ring-green-100' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-center mt-6">
          <button
            disabled={submitted}
            onClick={confirmSubmit}
            className={`px-10 py-4 rounded-2xl text-base font-black text-white shadow-xl transition-all flex items-center gap-2 ${
              submitted
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-green-600/40 hover:-translate-y-0.5 hover:shadow-2xl'
            }`}
          >
            {submitted ? '✔️ ส่งคำตอบแล้ว' : '✅ ส่งคำตอบ'}
          </button>
        </div>
      </main>

      {/* Submit modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">📝</div>
            <h3 className="text-lg font-black text-slate-800 mb-2">ยืนยันส่งคำตอบ?</h3>
            <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">
              {answeredCount < worksheet.questions.length
                ? `คุณตอบไปแล้ว ${answeredCount}/${worksheet.questions.length} ข้อ ยังตอบไม่ครบ ต้องการส่งคำตอบเลยหรือไม่?`
                : 'คุณตอบครบทุกข้อแล้ว หลังส่งคำตอบจะไม่สามารถแก้ไขได้อีก'}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => { setShowSubmitModal(false); doSubmit(false); }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all"
              >
                ยืนยันส่ง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">⚠️</div>
            <h3 className="text-lg font-black text-slate-800 mb-2">ออกจากใบงาน?</h3>
            <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">คำตอบที่ยังไม่ได้ส่งจะไม่ถูกบันทึก ต้องการออกจริงหรือไม่?</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                อยู่ต่อ
              </button>
              <button
                onClick={() => navigate('/student/worksheets')}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all"
              >
                ออกจากหน้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-7 py-3.5 rounded-2xl text-sm font-bold shadow-xl shadow-green-600/40 z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
