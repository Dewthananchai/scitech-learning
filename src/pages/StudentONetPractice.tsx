import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import MobileHeader from '../components/MobileHeader';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';
import MathText from '../components/MathText';
import { ensureOnetBankData, loadOnetYearList, ONET_HISTORY_KEY } from '../data/onetBankData';
import type { OnetBankQuestion } from '../data/onetBankData';

interface HistoryEntry {
  id: string;
  date: string;
  summary: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  isTimer: boolean;
}

export default function StudentONetPractice() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load bank data from database
  const bankQuestions: OnetBankQuestion[] = useMemo(() => ensureOnetBankData(), []);
  const availableYears: string[] = useMemo(() => loadOnetYearList(), []);

  // Filter States
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isTimer, setIsTimer] = useState<boolean>(true);

  // Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'stats' | 'leaderboard'>('none');

  // Exam States
  const [examState, setExamState] = useState<'setup' | 'testing' | 'result'>('setup');
  const [examQuestions, setExamQuestions] = useState<OnetBankQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History Persistence
  const histKey = `scitech_onet_history_${user?.id ?? 0}`;

  const loadHistory = useCallback((): HistoryEntry[] => {
    try {
      const raw = localStorage.getItem(histKey) || localStorage.getItem(ONET_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [histKey]);

  useEffect(() => {
    setHistory(loadHistory());
  }, [loadHistory]);

  const saveHistoryEntry = useCallback((entry: HistoryEntry) => {
    try {
      const list = loadHistory();
      const updated = [entry, ...list].slice(0, 50);
      localStorage.setItem(histKey, JSON.stringify(updated));
      localStorage.setItem(ONET_HISTORY_KEY, JSON.stringify(updated));
      setHistory(updated);
    } catch { /* ignore */ }
  }, [histKey, loadHistory]);

  const clearHistory = () => {
    if (window.confirm('ต้องการลบประวัติการทำข้อสอบทั้งหมดหรือไม่?')) {
      localStorage.removeItem(histKey);
      localStorage.removeItem(ONET_HISTORY_KEY);
      setHistory([]);
    }
  };

  // Level Options Extraction
  const levelOptions = useMemo(() => {
    const set = new Set<string>();
    bankQuestions.forEach(q => {
      if ((q as any).level && (q as any).level !== 'ทั่วไป') {
        set.add((q as any).level);
      }
    });
    return Array.from(set);
  }, [bankQuestions]);

  // Set Options Extraction
  const setOptions = useMemo(() => {
    const set = new Set<string>();
    bankQuestions.forEach(q => {
      const matchSubj = selectedSubject === 'all' || q.subject === selectedSubject;
      const matchYear = selectedYear === 'all' || q.year === selectedYear;
      if (matchSubj && matchYear && q.set) {
        set.add(q.set);
      }
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [bankQuestions, selectedSubject, selectedYear]);

  // Filter Pool
  const filteredPool = useMemo(() => {
    return bankQuestions.filter(q => {
      const matchLevel = selectedLevel === 'all' || (q as any).level === selectedLevel;
      const matchSubj = selectedSubject === 'all' || q.subject === selectedSubject;
      const matchYear = selectedYear === 'all' || q.year === selectedYear;
      const matchSet = selectedSet === 'all' || q.set === selectedSet;
      return matchLevel && matchSubj && matchYear && matchSet;
    });
  }, [bankQuestions, selectedLevel, selectedSubject, selectedYear, selectedSet]);

  // Sync count on pool update
  useEffect(() => {
    const poolLen = filteredPool.length;
    if (poolLen > 0) {
      setQuestionCount(prev => (prev > poolLen || prev <= 0 ? Math.min(10, poolLen) : prev));
    } else {
      setQuestionCount(0);
    }
  }, [filteredPool.length]);

  // Summary Text Labels
  const getLevelLabel = () => selectedLevel === 'all' ? 'สุ่มทุกระดับ' : selectedLevel;
  const getSubjectLabel = useCallback((subjKey = selectedSubject) => {
    if (subjKey === 'all') return 'สุ่มทุกวิชา';
    const info: Record<string, string> = {
      science: 'วิทยาศาสตร์',
      math: 'คณิตศาสตร์',
      thai: 'ภาษาไทย',
      english: 'ภาษาอังกฤษ',
    };
    return info[subjKey] || subjKey;
  }, [selectedSubject]);

  const getYearLabel = () => selectedYear === 'all' ? 'สุ่มทุกปี' : `ปี ${selectedYear}`;
  const getSetLabel = () => selectedSet === 'all' ? 'สุ่มทุกชุด' : `ชุดที่ ${selectedSet}`;

  const liveSummaryText = `${getLevelLabel()} / ${getSubjectLabel()} / ${getYearLabel()} / ${getSetLabel()} / ${questionCount} ข้อ / ${isTimer ? 'จับเวลา' : 'ไม่จับเวลา'}`;

  // Start Exam Action
  const handleStartExam = () => {
    if (filteredPool.length === 0) {
      alert('ไม่มีข้อสอบในเงื่อนไขที่เลือก กรุณาเลือกเงื่อนไขใหม่');
      return;
    }
    const targetCount = Math.max(1, questionCount);

    const shuffled = [...filteredPool].sort(() => Math.random() - 0.5);
    let selectedQ: OnetBankQuestion[] = [];
    while (selectedQ.length < targetCount) {
      selectedQ = selectedQ.concat(shuffled);
    }
    selectedQ = selectedQ.slice(0, targetCount);

    setExamQuestions(selectedQ);
    setUserAnswers({});
    setCurrentQIndex(0);

    if (isTimer) {
      setTimeLeft(selectedQ.length * 120); // 2 นาทีต่อข้อ
    } else {
      setTimeLeft(0);
    }

    setExamState('testing');
  };

  // Finish Exam Action (บังคับตอบครบทุกข้อ)
  const handleFinishExam = useCallback((isTimeOut = false) => {
    // ค้นหาข้อที่ยังไม่ได้ทำ
    const unansweredIndices: number[] = [];
    examQuestions.forEach((_, idx) => {
      if (userAnswers[idx] === undefined) {
        unansweredIndices.push(idx + 1);
      }
    });

    // หากยังตอบไม่ครบ และไม่ได้หมดเวลา จะแจ้งเตือนและย้ายไปยังข้อแรกที่ยังไม่ได้ตอบ
    if (unansweredIndices.length > 0 && !isTimeOut) {
      const firstUnansweredIndex = unansweredIndices[0] - 1;
      alert(`คุณยังไม่ได้ตอบข้อ ${unansweredIndices.join(', ')} กรุณาทำข้อสอบให้ครบทุกข้อก่อนส่งคำตอบครับ`);
      setCurrentQIndex(firstUnansweredIndex);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const total = examQuestions.length;
    let score = 0;
    examQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) {
        score++;
      }
    });

    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const entry: HistoryEntry = {
      id: Date.now().toString(),
      date: dateStr,
      summary: liveSummaryText,
      subject: getSubjectLabel(),
      score,
      total,
      percentage: pct,
      isTimer,
    };

    saveHistoryEntry(entry);
    setExamState('result');
  }, [examQuestions, userAnswers, liveSummaryText, getSubjectLabel, isTimer, saveHistoryEntry]);

  // Timer Effect
  useEffect(() => {
    if (examState !== 'testing' || !isTimer) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleFinishExam(true); // ส่งธง true บอกว่าหมดเวลาสอบ
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState, isTimer, handleFinishExam]);

  const getBadge = (pct: number) => pct >= 90 ? '🏆' : pct >= 70 ? '🥇' : pct >= 50 ? '🥈' : '📖';
  const getComment = (pct: number) => {
    if (pct >= 90) return 'ยอดเยี่ยมมาก! เก่งสุดๆ ⭐';
    if (pct >= 70) return 'ดีมาก! เกือบสมบูรณ์แบบแล้ว 👍';
    if (pct >= 50) return 'ทำได้ดี ฝึกฝนเพิ่มอีกนิดนะ 💪';
    return 'ไม่เป็นไร ลองฝึกทำเพิ่มอีกครั้ง! ✌️';
  };
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Score stats summary for leaderboard
  const topScores = useMemo(() => {
    return [...history].sort((a, b) => b.percentage - a.percentage).slice(0, 10);
  }, [history]);

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      {/* ใช้ฟอนต์ปกติ (ระบบ) — ไม่ใช้ Noto Sans Thai Looped แบบหน้านักเรียนหลัก */}
      <style>{`
        .st-page, .st-page h1, .st-page h2, .st-page h3, .st-page p,
        .st-page span, .st-page label, .st-page button, .st-page select,
        .st-page input, .st-page textarea, .st-page a, .st-page div {
          font-family: 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        /* ยกเว้นสูตรคณิตศาสตร์ (KaTeX ต้องใช้ฟอนต์ของตัวเอง) */
        .st-page .katex, .st-page .katex * {
          font-family: KaTeX_Main, 'Times New Roman', serif !important;
        }
      `}</style>
      <MobileHeader title="ฝึกทำข้อสอบ O-NET" />
      <StudentSidebar />

      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-6 pb-28 md:pb-12 px-3.5 md:px-6 transition-all">
        <div className="max-w-2xl mx-auto">

          {/* ==================== SETUP VIEW ==================== */}
          {examState === 'setup' && (
            <>
              {/* Back to Arena Button */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => navigate('/student/quizzes')}
                  className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-2xl font-bold border-2 border-slate-200 shadow-sm hover:bg-slate-50 transition"
                >
                  <span>⬅️ กลับสู่ลานประลองข้อสอบ</span>
                </button>
              </div>

              {/* 1. Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-blue-600 drop-shadow-sm flex items-center justify-center gap-2">
                  <span>🚀 ตะลุยโจทย์ O-NET ป.6 สนุกคิด!</span>
                </h1>
              </div>

              {/* 2. Shortcut Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveModal('stats')}
                  className="py-4 bg-yellow-400 text-white font-black rounded-3xl shadow-[0_6px_0_#d97706] transition hover:scale-[1.02] active:translate-y-1 flex items-center justify-center gap-2"
                >
                  <span>📊 สถิติของหนู</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('leaderboard')}
                  className="py-4 bg-pink-400 text-white font-black rounded-3xl shadow-[0_6px_0_#be185d] transition hover:scale-[1.02] active:translate-y-1 flex items-center justify-center gap-2"
                >
                  <span>🏆 ตารางอันดับ</span>
                </button>
              </div>

              {/* 3. Dashboard */}
              <div className="bg-indigo-500 text-white p-6 rounded-[2rem] shadow-xl mb-6 border-b-8 border-indigo-700 text-center">
                <p className="text-indigo-100 font-bold">คลังข้อสอบทั้งหมดในระบบ</p>
                <h2 className="text-5xl font-black mt-1">
                  {filteredPool.length} <span className="text-2xl font-normal opacity-80">ข้อ</span>
                </h2>
                {filteredPool.length < bankQuestions.length && (
                  <p className="text-xs text-indigo-200 mt-2 font-medium">
                    (จากข้อสอบทั้งหมด {bankQuestions.length} ข้อในฐานข้อมูล)
                  </p>
                )}
              </div>

              {/* 4. Filter Zone */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 border-4 border-white">
                <h2 className="text-xl font-black text-slate-700 mb-6 text-center">⚙️ เลือกเงื่อนไขการสอบ</h2>

                <div className="space-y-6">
                  {/* Dropdowns Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="level" className="text-xs font-black text-slate-400 uppercase ml-2 block mb-1">
                        ระดับชั้น / ประเภท
                      </label>
                      <select
                        id="level"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-slate-700 border-2 border-slate-200 focus:outline-none focus:border-blue-400"
                      >
                        <option value="all">สุ่มทุกระดับ</option>
                        <option value="ทั่วไป">ทั่วไป</option>
                        {levelOptions.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="subject" className="text-xs font-black text-slate-400 uppercase ml-2 block mb-1">
                        วิชา
                      </label>
                      <select
                        id="subject"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-slate-700 border-2 border-slate-200 focus:outline-none focus:border-blue-400"
                      >
                        <option value="all">สุ่มทุกวิชา</option>
                        <option value="science">🔬 วิทยาศาสตร์</option>
                        <option value="math">➗ คณิตศาสตร์</option>
                        <option value="thai">🇹🇭 ภาษาไทย</option>
                        <option value="english">🇬🇧 ภาษาอังกฤษ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="year" className="text-xs font-black text-slate-400 uppercase ml-2 block mb-1">
                        ปี พ.ศ.
                      </label>
                      <select
                        id="year"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-slate-700 border-2 border-slate-200 focus:outline-none focus:border-blue-400"
                      >
                        <option value="all">สุ่มทุกปี</option>
                        <option value="ทั่วไป">ทั่วไป</option>
                        {availableYears.filter(y => y !== 'ทั่วไป').map(y => (
                          <option key={y} value={y}>{`พ.ศ. ${y}`}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="set" className="text-xs font-black text-slate-400 uppercase ml-2 block mb-1">
                        ชุดข้อสอบ
                      </label>
                      <select
                        id="set"
                        value={selectedSet}
                        onChange={(e) => setSelectedSet(e.target.value)}
                        className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-slate-700 border-2 border-slate-200 focus:outline-none focus:border-blue-400"
                      >
                        <option value="all">สุ่มทุกชุด</option>
                        {setOptions.map(st => (
                          <option key={st} value={st}>ชุดที่ {st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ปุ่มลัดจำนวนข้อ */}
                  <div>
                    <label htmlFor="count" className="text-xs font-black text-slate-400 uppercase ml-2 mb-2 block">
                      จำนวนข้อที่ต้องการ
                    </label>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {[10, 15, 20, 25].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          className={`py-3 rounded-2xl font-black transition ${
                            questionCount === num
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-blue-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setQuestionCount(filteredPool.length > 0 ? filteredPool.length : 10)}
                        className={`py-3 rounded-2xl font-black transition ${
                          questionCount === filteredPool.length && filteredPool.length > 0
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-blue-100'
                        }`}
                      >
                        ทั้งหมด
                      </button>
                    </div>
                    <input
                      type="number"
                      id="count"
                      min={1}
                      max={Math.max(1, filteredPool.length)}
                      value={questionCount || ''}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-slate-700 border-2 border-slate-200 focus:outline-none focus:border-blue-400"
                      placeholder="ระบุจำนวนข้อ..."
                    />
                  </div>

                  {/* โหมดจับเวลา */}
                  <div>
                    <span className="text-xs font-black text-slate-400 uppercase ml-2 mb-2 block">
                      โหมดการสอบ
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setIsTimer(true)}
                        className={`py-4 rounded-2xl font-black border-2 transition ${
                          isTimer
                            ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        ⏱️ จับเวลา (2 นาที/ข้อ)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTimer(false)}
                        className={`py-4 rounded-2xl font-black border-2 transition ${
                          !isTimer
                            ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        🎯 ไม่จับเวลา
                      </button>
                    </div>
                  </div>

                  {/* Live Summary */}
                  <div className="bg-sky-100 p-6 rounded-[2rem] text-center border-2 border-dashed border-sky-300">
                    <p className="text-sky-600 font-bold mb-1">สรุปการตั้งค่า:</p>
                    <p className="font-black text-base md:text-lg text-sky-800 break-words">
                      {liveSummaryText}
                    </p>
                  </div>

                  {/* Start Exam Button */}
                  <button
                    type="button"
                    onClick={handleStartExam}
                    disabled={filteredPool.length === 0}
                    className={`w-full py-5 text-white font-black text-xl rounded-full transition shadow-[0_8px_0_#15803d] ${
                      filteredPool.length > 0
                        ? 'bg-green-500 hover:translate-y-1 hover:scale-[1.01] active:translate-y-2 cursor-pointer'
                        : 'bg-slate-400 opacity-60 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {filteredPool.length > 0 ? 'เริ่มทำข้อสอบเลย! 🚀' : 'ไม่มีข้อสอบในเงื่อนไขนี้'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ==================== TESTING VIEW ==================== */}
          {examState === 'testing' && examQuestions.length > 0 && (
            <div className="space-y-6">
              {/* Header Bar: Timer & Progress */}
              <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">วิชา O-NET</span>
                  <span className="text-lg font-black text-slate-800">
                    {getSubjectLabel(examQuestions[currentQIndex]?.subject)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {isTimer ? (
                    <div className={`px-4 py-2 rounded-2xl font-black text-lg ${
                      timeLeft <= 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-purple-100 text-purple-700'
                    }`}>
                      ⏱️ {fmtTime(timeLeft)}
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-sm">
                      🎯 ไม่จับเวลา
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('ต้องการออกจากการทำข้อสอบหรือไม่?')) {
                        setExamState('setup');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-2xl font-bold text-sm transition"
                  >
                    ❌ ออก
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-100">
                <div className="flex justify-between items-center text-xs font-black text-slate-500 mb-2">
                  <span>ข้อที่ {currentQIndex + 1} จาก {examQuestions.length}</span>
                  <span>ตอบแล้ว {Object.keys(userAnswers).length} / {examQuestions.length} ข้อ</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${((currentQIndex + 1) / examQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              {(() => {
                const q = examQuestions[currentQIndex];
                const selectedChoice = userAnswers[currentQIndex];

                return (
                  <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 border-4 border-white space-y-6">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        ข้อที่ {currentQIndex + 1}
                      </span>
                      {q.year && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                          {q.year === 'ทั่วไป' ? 'ทั่วไป' : `ปี ${q.year}`}
                        </span>
                      )}
                      {q.set && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                          ชุดที่ {q.set}
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <MathText as="h2" className="text-lg md:text-xl font-black text-slate-800 leading-relaxed whitespace-pre-line">
                      {q.q}
                    </MathText>

                    {/* Question Image if exists */}
                    {q.q_image && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-80 flex justify-center bg-slate-50 p-2">
                        <img src={q.q_image} alt="โจทย์ข้อสอบ" className="max-h-72 object-contain" />
                      </div>
                    )}

                    {/* Choices Grid */}
                    <div className="space-y-3 pt-2">
                      {q.choices.map((choice, cIdx) => {
                        const isSelected = selectedChoice === cIdx;
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => {
                              setUserAnswers(prev => ({ ...prev, [currentQIndex]: cIdx }));
                            }}
                            className={`w-full p-4 rounded-2xl font-bold text-left border-2 transition flex items-start gap-3.5 ${
                              isSelected
                                ? 'bg-blue-500 text-white border-blue-600 shadow-md translate-x-1'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                              isSelected ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + cIdx)}
                            </span>
                            <MathText className="pt-1 leading-normal text-sm md:text-base flex-1 whitespace-pre-line">
                              {choice}
                            </MathText>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Bottom Quick Navigation & Actions */}
              <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-slate-100 space-y-4">
                {/* Question Numbers Palette */}
                <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-1">
                  {examQuestions.map((_, idx) => {
                    const isAnswered = userAnswers[idx] !== undefined;
                    const isCurrent = currentQIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentQIndex(idx)}
                        className={`w-10 h-10 rounded-xl font-bold text-xs transition border-2 ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
                            : isAnswered
                            ? 'bg-emerald-500 text-white border-emerald-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Nav Buttons */}
                <div className="flex items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex(prev => prev - 1)}
                    className="px-5 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 disabled:opacity-40 transition"
                  >
                    ⬅️ ข้อก่อนหน้า
                  </button>

                  {currentQIndex < examQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQIndex(prev => prev + 1)}
                      className="px-6 py-3 bg-blue-500 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition shadow-md"
                    >
                      ข้อถัดไป ➡️
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFinishExam(false)}
                      className="px-6 py-3 bg-green-500 text-white rounded-2xl font-black text-sm hover:bg-green-600 transition shadow-lg animate-bounce"
                    >
                      ✅ ส่งคำตอบ 🚀
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== RESULT VIEW ==================== */}
          {examState === 'result' && (
            <div className="space-y-6">
              {/* Score Box */}
              {(() => {
                const total = examQuestions.length;
                let score = 0;
                examQuestions.forEach((q, idx) => {
                  if (userAnswers[idx] === q.answer) score++;
                });
                const pct = total > 0 ? Math.round((score / total) * 100) : 0;

                return (
                  <div className="bg-indigo-500 text-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-indigo-700 text-center space-y-3">
                    <div className="text-6xl animate-bounce">{getBadge(pct)}</div>
                    <h2 className="text-3xl font-black">สรุปผลคะแนน O-NET</h2>
                    <div className="text-5xl font-black my-2">
                      {score} / {total} <span className="text-2xl font-bold opacity-90">ข้อ</span>
                    </div>
                    <p className="text-xl font-bold text-indigo-100">
                      {getComment(pct)} ({pct}%)
                    </p>

                    <div className="pt-4 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExamState('setup')}
                        className="px-6 py-3 bg-yellow-400 text-slate-900 font-black rounded-2xl shadow-md hover:bg-yellow-300 transition"
                      >
                        🏠 ทำข้อสอบชุดอื่น
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal('stats')}
                        className="px-6 py-3 bg-white/20 text-white font-black rounded-2xl hover:bg-white/30 transition"
                      >
                        📊 สถิติของหนู
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Detailed Solutions */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 border-4 border-white space-y-6">
                <h3 className="text-xl font-black text-slate-800 text-center flex items-center justify-center gap-2">
                  <span>📋 เฉลยข้อสอบอย่างละเอียด</span>
                </h3>

                <div className="space-y-6">
                  {examQuestions.map((q, idx) => {
                    const userAns = userAnswers[idx];
                    const isCorrect = userAns === q.answer;

                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-3xl border-2 ${
                          isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm ${
                            isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className={`font-black text-sm ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isCorrect ? '✅ ตอบถูกต้อง' : '❌ ตอบผิด'}
                          </span>
                        </div>

                        <MathText as="p" className="font-bold text-slate-800 mb-4 whitespace-pre-line">{q.q}</MathText>

                        <div className="space-y-2 text-sm font-medium">
                          {q.choices.map((c, ci) => {
                            let choiceCls = 'bg-white text-slate-600 border-slate-200';
                            if (ci === q.answer) {
                              choiceCls = 'bg-emerald-500 text-white border-emerald-600 font-bold';
                            } else if (ci === userAns && !isCorrect) {
                              choiceCls = 'bg-rose-500 text-white border-rose-600 font-bold';
                            }

                            return (
                              <div key={ci} className={`p-3 rounded-2xl border flex items-center gap-2 ${choiceCls}`}>
                                <span className="font-black">{String.fromCharCode(65 + ci)}.</span>
                                <span>{c}</span>
                                {ci === q.answer && <span className="ml-auto text-xs font-black">✓ เฉลย</span>}
                                {ci === userAns && ci !== q.answer && <span className="ml-auto text-xs font-black">✗ คำตอบของคุณ</span>}
                              </div>
                            );
                          })}
                        </div>

                        {q.explain && (
                          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs md:text-sm text-amber-900 leading-relaxed">
                            💡 <strong>คำอธิบาย:</strong><MathText className="whitespace-pre-line">{q.explain}</MathText>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ==================== MODAL: MY STATS ==================== */}
      {activeModal === 'stats' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 md:p-8 shadow-2xl border-4 border-white max-h-[90vh] overflow-y-auto relative animate-fadeIn">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="absolute top-6 right-6 w-10 h-10 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full font-bold flex items-center justify-center text-lg transition"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-slate-800 text-center mb-1">📊 สถิติของหนู</h3>
            <p className="text-slate-500 text-xs font-bold text-center mb-6">ประวัติการทำข้อสอบ O-NET ทั้งหมด</p>

            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <span className="text-4xl block mb-2">📋</span>
                <p className="font-bold">ยังไม่มีประวัติการทำข้อสอบ</p>
                <p className="text-xs">เริ่มทำข้อสอบเพื่อเก็บสถิตินะคะ!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getBadge(h.percentage)}</span>
                        <span className="font-black text-sm text-slate-800">{h.subject}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{h.date}</p>
                      <p className="text-[11px] text-slate-400 font-medium truncate max-w-xs">{h.summary}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-blue-600 block">
                        {h.score}/{h.total}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        ({h.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold underline transition"
                  >
                    🗑️ ลบประวัติทั้งหมด
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: LEADERBOARD ==================== */}
      {activeModal === 'leaderboard' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 md:p-8 shadow-2xl border-4 border-white max-h-[90vh] overflow-y-auto relative animate-fadeIn">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="absolute top-6 right-6 w-10 h-10 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full font-bold flex items-center justify-center text-lg transition"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-slate-800 text-center mb-1">🏆 ตารางอันดับความเก่ง</h3>
            <p className="text-slate-500 text-xs font-bold text-center mb-6">คะแนนสูงสุดของหนูในการสอบ O-NET</p>

            {topScores.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <span className="text-4xl block mb-2">🏆</span>
                <p className="font-bold">ยังไม่มีอันดับความเก่ง</p>
                <p className="text-xs">ทำข้อสอบให้ได้คะแนนสูงๆ เพื่อติดอันดับนะคะ!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topScores.map((h, idx) => (
                  <div
                    key={h.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                        : idx === 1
                        ? 'bg-slate-100 border-slate-300'
                        : idx === 2
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        idx === 0
                          ? 'bg-amber-400 text-white'
                          : idx === 1
                          ? 'bg-slate-400 text-white'
                          : idx === 2
                          ? 'bg-orange-400 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-800">{h.subject}</span>
                          <span className="text-xs">{getBadge(h.percentage)}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{h.date}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-indigo-600 block">
                        {h.percentage}%
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {h.score}/{h.total} ข้อ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}