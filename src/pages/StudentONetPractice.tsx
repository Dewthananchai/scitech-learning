import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { ensureOnetBankData, subjectInfo as onetSubjectInfo } from '../data/onetBankData';
import type { OnetBankQuestion } from '../data/onetBankData';

/* ============================================================
   ระบบฝึกทำข้อสอบ O-NET  (ออกแบบตามตัวอย่าง HTML)
   - ดึงข้อสอบจาก "คลังข้อสอบ 🎯 O-NET" ในระบบ (category: 'onet')
   - 4 โหมด: ทดสอบจับเวลา / ข้อสอบจริงตามปี พ.ศ. / ทำทีละข้อ / ประวัติคะแนน
   ============================================================ */

const ONET_CSS = `
/* ===== Base ===== */
.onet-practice {
  min-height: 100vh;
  padding: 12px;
  color: #2d2d2d;
  background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #43cea2);
  background-size: 400% 400%;
  animation: onetGradientShift 15s ease infinite;
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
}
@keyframes onetGradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.onet-practice .onet-wrap { max-width: 920px; margin: 0 auto; }
.onet-practice .card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 20px 16px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
  animation: onetFadeIn 0.4s ease;
}
@keyframes onetFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.onet-practice h1 { text-align: center; color: #4a148c; margin: 0 0 6px; font-size: 1.45rem; font-weight: 700; line-height: 1.3; }
.onet-practice .subtitle { text-align: center; color: #777; margin: 0 0 18px; font-weight: 400; font-size: 0.9rem; }

/* ===== Grid & Buttons ===== */
.onet-practice .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.onet-practice .btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border: none; border-radius: 16px;
  padding: 18px 12px; font-size: 0.95rem; font-weight: 500;
  cursor: pointer; transition: 0.25s; display: flex; flex-direction: column;
  align-items: center; gap: 6px; box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
  min-height: 90px; justify-content: center;
}
.onet-practice .btn:hover { transform: translateY(-6px) scale(1.03); box-shadow: 0 10px 24px rgba(118, 75, 162, 0.5); }
.onet-practice .btn:active { transform: scale(0.97); box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); }
.onet-practice .btn .icon { font-size: 1.8rem; }
.onet-practice .btn-secondary { background: linear-gradient(135deg, #43cea2, #185a9d); box-shadow: 0 6px 16px rgba(24, 90, 157, 0.3); }
.onet-practice .btn-pink { background: linear-gradient(135deg, #f093fb, #f5576c); box-shadow: 0 6px 16px rgba(245, 87, 108, 0.3); }
.onet-practice .btn-gold { background: linear-gradient(135deg, #f7971e, #ffd200); box-shadow: 0 6px 16px rgba(247, 151, 30, 0.3); }
.onet-practice .btn-green { background: linear-gradient(135deg, #43a047, #2e7d32); box-shadow: 0 6px 16px rgba(67, 160, 71, 0.3); }
.onet-practice .btn-wide { width: 100%; padding: 14px; margin-top: 12px; font-size: 1rem; }
.onet-practice .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
.onet-practice .btn-outline {
  background: #fff; color: #764ba2; border: 2px solid #764ba2; box-shadow: none;
  min-height: 0; display: inline-flex; flex-direction: row; align-items: center; justify-content: center;
  padding: 12px 20px; font-size: 0.9rem; font-weight: 700; width: auto; margin: 18px auto 0;
}
.onet-practice .btn-outline:active { transform: scale(0.97); box-shadow: none; }

/* ===== Navigation ===== */
.onet-practice .back-btn { background: #eee; color: #555; padding: 8px 18px; border-radius: 12px; border: none; cursor: pointer; margin-bottom: 15px; transition: 0.2s; font-size: 0.9rem; font-weight: 500; }
.onet-practice .back-btn:hover { background: #ddd; transform: translateX(-3px); }
.onet-practice .back-btn:active { background: #ddd; transform: translateX(-2px); }

/* ===== Number grid (count pick) ===== */
.onet-practice .num-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.onet-practice .num-btn {
  width: 76px; height: 76px; border-radius: 14px; border: 2px solid #764ba2; background: #fff; color: #764ba2;
  font-size: 1rem; font-weight: 600; cursor: pointer; transition: 0.2s; line-height: 1.3;
}
.onet-practice .num-btn small { font-size: 0.68rem; font-weight: 400; color: #8b8b8b; }
.onet-practice .num-btn:hover { background: #764ba2; color: #fff; transform: scale(1.05); }
.onet-practice .num-btn:active { background: #764ba2; color: #fff; transform: scale(0.95); }
.onet-practice .num-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* ===== Timer ===== */
.onet-practice .timer-bar {
  position: sticky; top: 8px; z-index: 10; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px);
  padding: 10px 14px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12); margin-bottom: 14px; font-size: 0.85rem;
}
.onet-practice .timer-bar.warn { background: #ffe0e0; animation: onetPulse 1s infinite; }
@keyframes onetPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.onet-practice .timer-num { font-size: 1.2rem; font-weight: 700; color: #764ba2; }
.onet-practice .timer-bar.warn .timer-num { color: #d32f2f; }

/* ===== Progress ===== */
.onet-practice .progress { height: 8px; background: #eee; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.onet-practice .progress-fill { height: 100%; background: linear-gradient(90deg, #43cea2, #764ba2); transition: 0.3s; }

/* ===== Question cards ===== */
.onet-practice .qcard { border: 1px solid #eee; border-radius: 16px; padding: 16px 14px; margin-bottom: 14px; background: #fff; }
.onet-practice .qnum {
  display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; width: 30px; height: 30px;
  border-radius: 50%; text-align: center; line-height: 30px; margin-right: 8px; font-weight: 600; flex-shrink: 0; font-size: 0.85rem;
}
.onet-practice .qtext { font-size: 0.95rem; margin-bottom: 14px; font-weight: 500; display: flex; align-items: flex-start; gap: 4px; }
.onet-practice .qtext .qtext-inner { padding-top: 2px; }
.onet-practice .choice {
  display: block; width: 100%; text-align: left; padding: 12px 14px; border-radius: 12px; border: 2px solid #ddd;
  background: #fafafa; margin-bottom: 8px; cursor: pointer; font-size: 0.9rem; transition: 0.15s;
  line-height: 1.45; word-break: break-word;
}
.onet-practice .choice:hover { border-color: #764ba2; transform: translateX(3px); }
.onet-practice .choice:active { transform: scale(0.98); }
.onet-practice .choice.selected { border-color: #764ba2; background: #ede7f6; }
.onet-practice .choice.correct { border-color: #43a047; background: #e8f5e9; color: #2e7d32; font-weight: 600; }
.onet-practice .choice.wrong { border-color: #e53935; background: #ffebee; color: #c62828; font-weight: 600; }
.onet-practice .explain {
  background: #fff8e1; border-left: 4px solid #ffb300; padding: 12px 14px; border-radius: 10px;
  margin-top: 10px; font-size: 0.85rem; color: #5d4037; white-space: pre-line; line-height: 1.5;
}

/* ===== Score ===== */
.onet-practice .score-box {
  text-align: center; padding: 22px 16px; background: linear-gradient(135deg, #43cea2, #185a9d); color: #fff;
  border-radius: 20px; margin-bottom: 22px; box-shadow: 0 10px 24px rgba(24, 90, 157, 0.35);
}
.onet-practice .score-box .badge { font-size: 2.5rem; margin-bottom: 6px; }
.onet-practice .score-box .big { font-size: 2rem; font-weight: 700; line-height: 1.2; }

/* ===== Year grid ===== */
.onet-practice .year-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.onet-practice .year-btn {
  padding: 14px 22px; border-radius: 14px; border: 2px solid #764ba2; background: #fff; color: #764ba2;
  font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.95rem;
}
.onet-practice .year-btn:hover { background: #764ba2; color: #fff; transform: scale(1.05); }
.onet-practice .year-btn:active { background: #764ba2; color: #fff; transform: scale(0.95); }

/* ===== History ===== */
.onet-practice .history-item {
  display: flex; justify-content: space-between; align-items: center; background: #f8f7ff; border-radius: 12px;
  padding: 12px 14px; margin-bottom: 8px; border-left: 5px solid #764ba2;
}
.onet-practice .history-item .hi-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.onet-practice .history-item .hi-subj { font-weight: 600; color: #4a148c; font-size: 0.85rem; }
.onet-practice .history-item .hi-date { font-size: 0.75rem; color: #999; }
.onet-practice .history-item .hi-score { font-size: 1rem; font-weight: 700; color: #43a047; white-space: nowrap; margin-left: 8px; }

/* ===== Misc ===== */
.onet-practice .empty-state { text-align: center; padding: 40px 20px; color: #999; }
.onet-practice .empty-state .icon { font-size: 3rem; margin-bottom: 10px; }
.onet-practice .clear-history-btn {
  background: #ffebee; color: #c62828; border: none; padding: 10px 18px; border-radius: 10px;
  cursor: pointer; margin-top: 12px; font-size: 0.85rem;
}
.onet-practice .clear-history-btn:active { background: #ffcdd2; }
.onet-practice .chip {
  display: inline-block; background: #ede7f6; color: #4a148c; border-radius: 999px; padding: 3px 12px;
  font-size: 0.78rem; font-weight: 600;
}
.onet-practice .footer-link { text-align: center; margin-top: 16px; font-size: 0.78rem; }
.onet-practice .footer-link a { color: #fff; text-decoration: underline; }

/* ===== Tablet (≥600px) ===== */
@media (min-width: 600px) {
  .onet-practice { padding: 20px; }
  .onet-practice .card { padding: 28px 24px; border-radius: 24px; }
  .onet-practice h1 { font-size: 1.7rem; }
  .onet-practice .subtitle { font-size: 0.95rem; margin-bottom: 22px; }
  .onet-practice .grid { grid-template-columns: 1fr 1fr; gap: 16px; }
  .onet-practice .btn { padding: 20px 16px; font-size: 1rem; min-height: 100px; }
  .onet-practice .btn .icon { font-size: 2rem; }
  .onet-practice .num-btn { width: 85px; height: 85px; font-size: 1.05rem; }
  .onet-practice .timer-bar { padding: 14px 22px; border-radius: 16px; font-size: 0.9rem; }
  .onet-practice .timer-num { font-size: 1.5rem; }
  .onet-practice .qcard { padding: 20px; border-radius: 18px; }
  .onet-practice .qtext { font-size: 1rem; }
  .onet-practice .choice { padding: 13px 16px; font-size: 0.95rem; }
  .onet-practice .score-box { padding: 28px 20px; }
  .onet-practice .score-box .badge { font-size: 3rem; }
  .onet-practice .score-box .big { font-size: 2.4rem; }
  .onet-practice .year-btn { padding: 16px 26px; font-size: 1rem; }
  .onet-practice .history-item { padding: 14px 16px; }
  .onet-practice .history-item .hi-subj { font-size: 0.9rem; }
  .onet-practice .history-item .hi-score { font-size: 1.1rem; }
  .onet-practice .explain { font-size: 0.9rem; padding: 14px 16px; }
}

/* ===== Desktop (≥900px) ===== */
@media (min-width: 900px) {
  .onet-practice { padding: 24px; }
  .onet-practice .card { padding: 32px; border-radius: 24px; }
  .onet-practice .subtitle { font-size: 1rem; margin-bottom: 25px; }
  .onet-practice .grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }
  .onet-practice .btn { padding: 22px; font-size: 1.05rem; min-height: auto; }
  .onet-practice .btn .icon { font-size: 2.1rem; }
  .onet-practice .num-btn { width: 88px; height: 88px; font-size: 1.1rem; }
  .onet-practice .timer-bar { padding: 14px 22px; font-size: 1rem; }
  .onet-practice .qcard { padding: 22px; }
  .onet-practice .qnum { width: 34px; height: 34px; line-height: 34px; font-size: 0.9rem; }
  .onet-practice .qtext { font-size: 1.05rem; }
  .onet-practice .choice { padding: 13px 18px; font-size: 1rem; }
  .onet-practice .score-box { padding: 30px; }
  .onet-practice .score-box .badge { font-size: 3rem; }
  .onet-practice .score-box .big { font-size: 2.6rem; }
  .onet-practice .year-btn { padding: 16px 26px; font-size: 1.05rem; }
  .onet-practice .explain { font-size: 0.95rem; padding: 14px 18px; }
}
`;

/* ---------- Question helpers ---------- */
type Mode =
  | 'home' | 'timedSubject' | 'timedSet' | 'timedCount' | 'timedTest'
  | 'year' | 'yearSubject' | 'yearTest'
  | 'oneSubject' | 'oneSet' | 'oneCount' | 'oneTest'
  | 'result' | 'summary' | 'history';

interface QItem {
  id: number;
  subject: string;
  text: string;
  choices: string[];
  answer: number; // index into choices
  explain: string;
}

interface HistoryEntry {
  mode: string;
  subject: string;
  score: number;
  total: number;
  date: string;
}

const SUBJECT_META: { id: string; name: string; icon: string }[] = [
  { id: 'all', name: 'ทั้งหมด', icon: '🎲' },
  { id: 'science', name: 'วิทยาศาสตร์', icon: '🔬' },
  { id: 'math', name: 'คณิตศาสตร์', icon: '➗' },
  { id: 'thai', name: 'ภาษาไทย', icon: '🇹🇭' },
  { id: 'english', name: 'ภาษาอังกฤษ', icon: '🇬🇧' },
  { id: 'social', name: 'สังคมศึกษา', icon: '🌍' },
];

const YEARS = (() => {
  try {
    const raw = localStorage.getItem('onet_years_v1');
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) return d.filter((y: string) => y !== 'ทั่วไป').map(Number).filter((n: number) => !isNaN(n)).sort((a: number, b: number) => b - a);
    }
  } catch { /* ignore */ }
  return [2568, 2567, 2566];
})();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(pool: QItem[], count: number): QItem[] {
  if (pool.length === 0) return [];
  const shuffled = shuffle(pool);
  // เลือกแบบไม่ซ้ำ ถ้าข้อไม่พอจึงวนใช้ใหม่ (เพื่อให้ครบจำนวนที่เลือก)
  const result: QItem[] = [];
  while (result.length < count) result.push(...shuffled);
  return result.slice(0, count);
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function badgeFor(pct: number): string {
  if (pct >= 90) return '🏆';
  if (pct >= 70) return '🥇';
  if (pct >= 50) return '🥈';
  return '📖';
}

function commentFor(pct: number): string {
  if (pct >= 90) return 'ยอดเยี่ยมมาก! เก่งสุดๆ';
  if (pct >= 70) return 'ดีมาก! เกือบสมบูรณ์แบบแล้ว';
  if (pct >= 50) return 'ทำได้ดี ฝึกฝนเพิ่มอีกนิดนะ';
  return 'ไม่เป็นไร ลองฝึกทำเพิ่มอีกครั้ง!';
}

function nowThai(): string {
  const d = new Date();
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function StudentONetPractice() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ---------- state ----------
  const [screen, setScreen] = useState<Mode>('home');
  const [subjectKey, setSubjectKey] = useState<string | null>(null); // null = ทั้งหมด
  const [selectedSet, setSelectedSet] = useState('1');
  const [year, setYear] = useState(2569);
  const [count, setCount] = useState<number | null>(null);
  const [qItems, setQItems] = useState<QItem[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const [cur, setCur] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [resultMeta, setResultMeta] = useState<{ mode: string; subjectLabel: string }>({ mode: '', subjectLabel: '' });
  const [histTick, setHistTick] = useState(0);
  const finishedRef = useRef(false);

  // ---------- bank pool (from shared localStorage bank) ----------
  const bankQuestions: OnetBankQuestion[] = useMemo(() => ensureOnetBankData(), []);

  const toQItem = (q: OnetBankQuestion): QItem => ({
    id: parseInt(q.id.replace(/\D/g, ''), 10) || 0,
    subject: q.subject,
    text: q.q,
    choices: q.choices,
    answer: q.answer,
    explain: q.explain,
  });

  const GENERAL = 'ทั่วไป';

  const getSetsForSubject = useCallback((subjKey: string | null): string[] => {
    const sets = [...new Set(
      bankQuestions
        .filter(q => q.year === GENERAL && (subjKey === null || subjKey === 'all' || q.subject === subjKey))
        .map(q => q.set || '1')
    )];
    return sets.sort((a, b) => Number(a) - Number(b));
  }, [bankQuestions]);

  const getCountForSet = useCallback((subjKey: string | null, set: string): number => {
    return bankQuestions.filter(q =>
      q.year === GENERAL && (q.set || '1') === set && (subjKey === null || subjKey === 'all' || q.subject === subjKey)
    ).length;
  }, [bankQuestions]);

  const poolFor = useMemo(() => {
    return (subjKey: string | null, set?: string): QItem[] => {
      const list: QItem[] = [];
      bankQuestions.forEach(q => {
        const matchSubj = !subjKey || subjKey === 'all' || q.subject === subjKey;
        const matchSet = !set || (q.set || '1') === set;
        if (matchSubj && matchSet) list.push(toQItem(q));
      });
      return list;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankQuestions]);

  const subjectOf = (key: string | null) =>
    key === null || key === 'all' ? 'ทั้งหมด' : key;

  // ---------- history (per student) ----------
  const histKey = `scitech_onet_history_${user?.id ?? 0}`;

  const loadHistory = (): HistoryEntry[] => {
    try {
      const raw = localStorage.getItem(histKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const saveHistoryEntry = (entry: HistoryEntry) => {
    try {
      const list = loadHistory();
      list.unshift(entry);
      localStorage.setItem(histKey, JSON.stringify(list.slice(0, 50)));
    } catch { /* ignore */ }
    setHistTick(t => t + 1);
  };

  // ---------- timer ----------
  useEffect(() => {
    if (screen !== 'timedTest' && screen !== 'yearTest') return;
    finishedRef.current = false;
    setTimeLeft(totalSec);
    const iv = setInterval(() => {
      setTimeLeft(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if ((screen === 'timedTest' || screen === 'yearTest') && totalSec > 0 && timeLeft === 0 && !finishedRef.current) {
      finishedRef.current = true;
      finishTest(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, screen, totalSec]);

  // ---------- actions ----------
  const goHome = () => {
    finishedRef.current = true;
    setScreen('home');
  };

  const startTimed = (subjKey: string | null, n: number) => {
    const items = pickQuestions(poolFor(subjKey, selectedSet), n);
    setSubjectKey(subjKey);
    setQItems(items);
    setAnswers(Array(items.length).fill(null));
    const secs = items.length * 120;
    setTotalSec(secs);
    setTimeLeft(secs);
    finishedRef.current = false;
    setScreen('timedTest');
  };

  const startYear = (subjKey: string) => {
    const items = shuffle(poolFor(subjKey));
    setQItems(items);
    setAnswers(Array(items.length).fill(null));
    setTotalSec(60 * 60);
    setTimeLeft(60 * 60);
    finishedRef.current = false;
    setScreen('yearTest');
  };

  const startOne = (subjKey: string | null, n: number) => {
    const items = pickQuestions(poolFor(subjKey, selectedSet), n);
    setSubjectKey(subjKey);
    setQItems(items);
    setAnswers(Array(items.length).fill(null));
    setCur(0);
    setRevealed(false);
    setScreen('oneTest');
  };

  const answerTimed = (qIdx: number, choiceIdx: number) => {
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx] = choiceIdx;
      return next;
    });
  };

  const answerOne = (choiceIdx: number) => {
    if (revealed) return;
    setAnswers(prev => {
      const next = [...prev];
      next[cur] = choiceIdx;
      return next;
    });
    setRevealed(true);
  };

  const nextOne = () => {
    if (cur + 1 >= qItems.length) {
      // จบชุด — สรุปผล
      const score = qItems.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
      saveHistoryEntry({ mode: '📝 ทำทีละชุด', subject: subjectOf(subjectKey), score, total: qItems.length, date: nowThai() });
      setScreen('summary');
    } else {
      setCur(c => c + 1);
      setRevealed(false);
    }
  };

  const finishTest = (manual: boolean) => {
    if (!manual && screen !== 'timedTest' && screen !== 'yearTest') return;
    if (finishedRef.current && screen === 'result') return;
    finishedRef.current = true;
    const score = qItems.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    const isTimed = screen === 'timedTest';
    const mode = isTimed
      ? '⏱️ จับเวลา'
      : `📅 ข้อสอบจริง (พ.ศ.${year})`;
    const subjLabel = isTimed ? subjectOf(subjectKey) : (SUBJECT_META.find(s => s.id === subjectKey)?.name || 'ทั้งหมด');
    saveHistoryEntry({ mode, subject: subjLabel, score, total: qItems.length, date: nowThai() });
    setResultMeta({ mode, subjectLabel: subjLabel });
    setScreen('result');
  };

  const hist = useMemo(() => loadHistory(), [histKey, histTick]);

  // ---------- computed result values ----------
  const correctCount = qItems.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
  const pct = qItems.length > 0 ? Math.round((correctCount / qItems.length) * 100) : 0;

  // ---------- shared bits ----------
  const renderChoices = (q: QItem, qIdx: number, showAnswer: boolean, single: boolean) => {
    const userAns = answers[qIdx];
    return (
      <div>
        {q.choices.map((c, ci) => {
          let cls = 'choice';
          if (showAnswer) {
            if (ci === q.answer) cls += ' correct';
            else if (ci === userAns && userAns !== q.answer) cls += ' wrong';
          } else if (userAns === ci) {
            cls += ' selected';
          }
          const disabled = showAnswer || (single && revealed);
          const clickable = !showAnswer && !(single && revealed);
          return (
            <button
              key={ci}
              type="button"
              className={cls}
              disabled={disabled}
              onClick={clickable ? () => (single ? answerOne(ci) : answerTimed(qIdx, ci)) : undefined}
            >
              {String.fromCharCode(65 + ci)}. {c}
            </button>
          );
        })}
        {showAnswer && (
          <div className="explain">
            💡 <b>เฉลย:</b> {q.choices[q.answer]}
            {q.explain ? `\n${q.explain}` : ''}
          </div>
        )}
      </div>
    );
  };

  const questionCard = (q: QItem, qIdx: number, showAnswer: boolean, single = false) => (
    <div className="qcard" key={`${q.id}-${qIdx}`}>
      <div className="qtext">
        <span className="qnum">{qIdx + 1}</span>
        <span className="qtext-inner">{q.text}</span>
      </div>
      {q.subject && !single && <span className="chip" style={{ marginBottom: 12 }}>{q.subject}</span>}
      {renderChoices(q, qIdx, showAnswer, single)}
    </div>
  );

  // ============================================================
  // SCREENS
  // ============================================================
  const renderHome = () => {
    const total = bankQuestions.length;
    return (
      <div className="card">
        <h1>📚 ระบบฝึกทำข้อสอบ O-NET</h1>
        <p className="subtitle">
          เลือกรูปแบบการฝึกทำข้อสอบที่ต้องการ
          {total > 0 && <span className="chip" style={{ margin: '0 0 0 8px' }}>จำนวนข้อสอบทั้งหมด {total} ข้อ</span>}
        </p>
        <div className="grid">
          <button className="btn" type="button" onClick={() => setScreen('timedSubject')}>
            <span className="icon">⏱️</span>ทดสอบจับเวลา
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setScreen('year')}>
            <span className="icon">📅</span>ข้อสอบจริงตามปี พ.ศ.
          </button>
          <button className="btn btn-pink" type="button" onClick={() => setScreen('oneSubject')}>
            <span className="icon">📝</span>ทำทีละชุด
          </button>
          <button className="btn btn-gold" type="button" onClick={() => setScreen('history')}>
            <span className="icon">📊</span>ประวัติคะแนน
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-outline" type="button" onClick={() => navigate('/student/quizzes')}>
            📝 กลับสู่หน้าลานประลองข้อสอบ
          </button>
        </div>
      </div>
    );
  };

  const renderSubjectPick = (target: 'timedSet' | 'oneSet') => (
    <div className="card">
      <button className="back-btn" type="button" onClick={goHome}>← กลับ</button>
      <h1>{target === 'timedSet' ? '⏱️ ทดสอบจับเวลา' : '📝 ทำทีละชุด'}</h1>
      <p className="subtitle">เลือกวิชาที่ต้องการทดสอบ</p>
      <div className="grid">
        {SUBJECT_META.map(s => {
          const n = poolFor(s.id === 'all' ? null : s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              className="btn"
              onClick={() => {
                setSubjectKey(s.id === 'all' ? null : s.id);
                setCount(null);
                setScreen(target);
              }}
            >
              <span className="icon">{s.icon}</span>
              {s.name}
              <span style={{ fontSize: 12, opacity: 0.85 }}>{n} ข้อ</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSetPick = (isTimed: boolean) => {
    const sets = getSetsForSubject(subjectKey);
    const s = SUBJECT_META.find(x => x.id === (subjectKey ?? 'all')) || SUBJECT_META[0];
    return (
      <div className="card">
        <button className="back-btn" type="button" onClick={() => setScreen(isTimed ? 'timedSubject' : 'oneSubject')}>← กลับ</button>
        <h1>{s.icon} {s.name}</h1>
        <p className="subtitle">เลือกชุดข้อสอบ</p>
        {sets.length === 0 ? (
          <div className="empty-state"><div className="icon">🗒️</div>ยังไม่มีข้อสอบ O-NET ในวิชานี้ (ชุดทั่วไป)</div>
        ) : (
          <div className="grid">
            {sets.map((st: string) => {
              const cnt = getCountForSet(subjectKey, st);
              return (
                <button
                  key={st}
                  type="button"
                  className={isTimed ? 'btn' : 'btn btn-pink'}
                  onClick={() => { setSelectedSet(st); setScreen(isTimed ? 'timedCount' : 'oneCount'); }}
                >
                  <span className="icon">📋</span>ชุดที่ {st}
                  <span style={{ fontSize: 12, opacity: 0.85 }}>{cnt} ข้อ</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCountPick = (isTimed: boolean) => {
    const pool = poolFor(subjectKey, selectedSet);
    const poolLen = pool.length;
    const base = [10, 15, 20, 25, 30];
    const options = poolLen > 0 ? base.filter(n => n < poolLen) : [];
    const s = SUBJECT_META.find(x => x.id === (subjectKey ?? 'all')) || SUBJECT_META[0];
    return (
      <div className="card">
        <button className="back-btn" type="button" onClick={() => setScreen(isTimed ? 'timedSet' : 'oneSet')}>← กลับ</button>
        <h1>{s.icon} {s.name} — ชุดที่ {selectedSet}</h1>
        <p className="subtitle">
          เลือกจำนวนข้อสอบ{isTimed ? ' (ข้อละ 2 นาที)' : ''}
          {poolLen > 0 && <span className="chip" style={{ margin: '0 0 0 8px' }}>{poolLen} ข้อในชุดนี้</span>}
        </p>
        {poolLen === 0 ? (
          <div className="empty-state">
            <div className="icon">🗒️</div>
            ยังไม่มีข้อสอบ O-NET วิชานี้ในคลังข้อสอบ
          </div>
        ) : (
          <>
            <div className="num-grid">
              <button
                type="button"
                className="num-btn"
                onClick={() => setCount(poolLen)}
                style={{ background: 'linear-gradient(135deg,#43cea2,#185a9d)', color: '#fff', borderColor: 'transparent', width: 110 }}
              >
                ทำทั้งหมด<br /><small>{poolLen} ข้อ{isTimed ? ` · ${poolLen * 2} นาที` : ''}</small>
              </button>
              {options.map(n => (
                <button
                  key={n}
                  type="button"
                  className="num-btn"
                  onClick={() => setCount(n)}
                  style={count === n ? { background: '#764ba2', color: '#fff' } : undefined}
                >
                  {n} ข้อ<br />
                  {isTimed ? <small>{n * 2} นาที</small> : <small>&nbsp;</small>}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-green btn-wide"
              disabled={count === null}
              onClick={() => (isTimed ? startTimed(subjectKey, count!) : startOne(subjectKey, count!))}
            >
              {isTimed ? '🚀 เริ่มทดสอบ' : '✏️ เริ่มทำข้อ'} {count ? `(${count} ข้อ)` : ''}
            </button>
          </>
        )}
      </div>
    );
  };

  const renderTestScreen = (isTimed: boolean) => {
    const warn = timeLeft <= 60;
    return (
      <>
        <div className={`timer-bar${warn ? ' warn' : ''}`}>
          <span>{isTimed ? `⏱️ เวลาที่เหลือ (${qItems.length * 2} นาที)` : '⏱️ เวลาที่เหลือ (60 นาที)'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="timer-num">{fmtTime(timeLeft)}</span>
            <button
              type="button"
              className="back-btn"
              style={{ margin: 0 }}
              onClick={() => { if (window.confirm('ต้องการออกจากการทำข้อสอบหรือไม่?')) goHome(); }}
            >
              ออก
            </button>
          </div>
        </div>
        <div className="card">
          <h1>{isTimed ? `⏱️ ${subjectOf(subjectKey)}` : `📅 ข้อสอบ O-NET ปี พ.ศ.${year}`}</h1>
          <p className="subtitle">
            ตอบให้ครบทุกข้อ แล้วกด "ส่งคำตอบ"
            {answers.filter(a => a !== null).length > 0 &&
              <span className="chip" style={{ margin: '0 0 0 8px' }}>
                ตอบแล้ว {answers.filter(a => a !== null).length}/{qItems.length} ข้อ
              </span>}
          </p>
          {qItems.map((q, i) => questionCard(q, i, false))}
          <button type="button" className="btn btn-green btn-wide" onClick={() => finishTest(true)}>
            ✅ ส่งคำตอบ ({answers.filter(a => a !== null).length}/{qItems.length} ข้อ)
          </button>
        </div>
      </>
    );
  };

  const renderResult = () => (
    <div className="card">
      <div className="score-box">
        <div className="badge">{badgeFor(pct)}</div>
        <div className="big">{correctCount} / {qItems.length}</div>
        <div>{commentFor(pct)} ({pct}%)</div>
      </div>
      <p style={{ textAlign: 'center', color: '#777', marginBottom: 10 }}>
        {resultMeta.mode} • {resultMeta.subjectLabel} • {nowThai()}
      </p>
      <h1 style={{ fontSize: '1.3rem' }}>📋 เฉลยข้อสอบ</h1>
      {qItems.map((q, i) => questionCard(q, i, true))}
      <button type="button" className="btn btn-wide" onClick={goHome}>🏠 กลับหน้าหลัก</button>
    </div>
  );

  const renderYear = () => (
    <div className="card">
      <button className="back-btn" type="button" onClick={goHome}>← กลับ</button>
      <h1>📅 ข้อสอบจริงตามปี พ.ศ.</h1>
      <p className="subtitle">เลือกปีของข้อสอบ (จับเวลา 60 นาที)</p>
      <div className="year-grid">
        {YEARS.map(y => (
          <button key={y} type="button" className="year-btn" onClick={() => { setYear(y); setScreen('yearSubject'); }}>
            พ.ศ. {y}
          </button>
        ))}
      </div>
    </div>
  );

  const renderYearSubject = () => (
    <div className="card">
      <button className="back-btn" type="button" onClick={() => setScreen('year')}>← กลับ</button>
      <h1>ข้อสอบ O-NET ปี พ.ศ.{year}</h1>
      <p className="subtitle">เลือกวิชา</p>
      <div className="grid">
        {SUBJECT_META.slice(1).map(s => {
          const n = poolFor(s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              className="btn"
              disabled={n === 0}
              onClick={() => {
                setSubjectKey(s.id);
                startYear(s.id);
              }}
            >
              <span className="icon">{s.icon}</span>
              {s.name}
              <span style={{ fontSize: 12, opacity: 0.85 }}>{n} ข้อ</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderOneTest = () => {
    const q = qItems[cur];
    if (!q) return null;
    const progress = Math.round((cur / qItems.length) * 100);
    return (
      <div className="card">
        <div className="progress"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <p style={{ textAlign: 'right', color: '#888', marginBottom: 10 }}>
          ข้อ {cur + 1} / {qItems.length}
        </p>
        {questionCard(q, cur, revealed, true)}
        {revealed ? (
          <button type="button" className="btn btn-green btn-wide" onClick={nextOne}>
            ➡️ {cur + 1 >= qItems.length ? 'ดูสรุปผล' : 'ข้อถัดไป'}
          </button>
        ) : (
          <button type="button" className="btn btn-wide" disabled onClick={() => undefined}>ตอบข้อนี้ก่อน ➜</button>
        )}
      </div>
    );
  };

  const renderSummary = () => {
    const correct = qItems.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    const p = qItems.length > 0 ? Math.round((correct / qItems.length) * 100) : 0;
    return (
      <div className="card">
        <div className="score-box">
          <div className="badge">{badgeFor(p)}</div>
          <div>🎉 เสร็จสิ้น!</div>
          <div className="big">{correct} / {qItems.length}</div>
          <div>{commentFor(p)} ({p}%)</div>
        </div>
        <p style={{ textAlign: 'center', color: '#777', marginBottom: 15 }}>
          📝 ทำทีละชุด • {subjectOf(subjectKey)} • {nowThai()}
        </p>
        <button type="button" className="btn btn-wide" onClick={goHome}>🏠 กลับหน้าหลัก</button>
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="card">
        <button className="back-btn" type="button" onClick={goHome}>← กลับ</button>
        <h1>📊 ประวัติการทำข้อสอบ</h1>
        <p className="subtitle">ผลคะแนนล่าสุด {hist.length} รายการ</p>
        {hist.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🗒️</div>
            ยังไม่มีประวัติการทำข้อสอบ
          </div>
        ) : (
          <>
            {hist.map((h, i) => {
              const p = h.total > 0 ? Math.round((h.score / h.total) * 100) : 0;
              return (
                <div className="history-item" key={`${h.date}-${i}`}>
                  <div className="hi-left">
                    <span className="hi-subj">{badgeFor(p)} {h.subject} — {h.mode}</span>
                    <span className="hi-date">{h.date}</span>
                  </div>
                  <span className="hi-score">{h.score}/{h.total} ({p}%)</span>
                </div>
              );
            })}
            <button
              className="clear-history-btn"
              type="button"
              onClick={() => {
                if (window.confirm('ต้องการลบประวัติทั้งหมดหรือไม่?')) {
                  localStorage.removeItem(histKey);
                  setHistTick(t => t + 1);
                }
              }}
            >
              🗑️ ลบประวัติทั้งหมด
            </button>
          </>
        )}
      </div>
    );
  };

  // ============================================================
  return (
    <div className="onet-practice">
      <style>{ONET_CSS}</style>
      <div className="onet-wrap">
        {screen === 'home' && renderHome()}
        {(screen === 'timedSubject') && renderSubjectPick('timedSet')}
        {screen === 'timedSet' && renderSetPick(true)}
        {screen === 'timedCount' && renderCountPick(true)}
        {screen === 'timedTest' && renderTestScreen(true)}
        {screen === 'year' && renderYear()}
        {screen === 'yearSubject' && renderYearSubject()}
        {screen === 'yearTest' && renderTestScreen(false)}
        {(screen === 'oneSubject') && renderSubjectPick('oneSet')}
        {screen === 'oneSet' && renderSetPick(false)}
        {screen === 'oneCount' && renderCountPick(false)}
        {screen === 'oneTest' && renderOneTest()}
        {screen === 'result' && renderResult()}
        {screen === 'summary' && renderSummary()}
        {screen === 'history' && renderHistory()}
        
      </div>
    </div>
  );
}
