import { useState, useEffect, useCallback, useRef } from 'react';
import { ensureBankData, loadSchoolList, loadYearList } from '../data/m1BankData';
import { useNavigate } from 'react-router-dom';

/* ---------- constants ---------- */
const HISTORY_KEY = 'm1_exam_history_v1';
const GENERAL = 'ทั่วไป';

const subjectInfo: Record<string, { name: string; icon: string }> = {
  random: { name: 'สุ่มทุกวิชา', icon: '🎲' },
  science: { name: 'วิทยาศาสตร์', icon: '🔬' },
  math:   { name: 'คณิตศาสตร์', icon: '➗' },
  thai:   { name: 'ภาษาไทย', icon: '🇹🇭' },
  english:{ name: 'ภาษาอังกฤษ', icon: '🇬🇧' },
  social: { name: 'สังคมศึกษา', icon: '🌍' },
};
const examSubjects = ['science','math','thai','english','social'];

/* ---------- localStorage helpers ---------- */
const loadBank = (): any[] => ensureBankData();
const getHistory = (): any[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') || []; } catch { return []; } };
const saveHistory = (entry: any) => {
  const h = getHistory();
  (h as any[]).unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify((h as any[]).slice(0, 50)));
};
const clearHistory = () => { if (confirm('ต้องการลบประวัติทั้งหมดหรือไม่?')) { localStorage.removeItem(HISTORY_KEY); } };

const badgeFor = (pct: number) => pct >= 90 ? '🏆' : pct >= 70 ? '🥇' : pct >= 50 ? '🥈' : '📖';
const commentFor = (pct: number) =>
  pct >= 90 ? 'ยอดเยี่ยมมาก! เก่งสุดๆ' :
  pct >= 70 ? 'ดีมาก! เกือบสมบูรณ์แบบแล้ว' :
  pct >= 50 ? 'ทำได้ดี ฝึกฝนเพิ่มอีกนิดนะ' :
  'ไม่เป็นไร ลองฝึกทำเพิ่มอีกครั้ง!';
const nowStr = () => {
  const d = new Date();
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const randomQuestions = (subject: string, count: number, set?: string): any[] => {
  const bank = loadBank();
  let pool = subject === 'random' ? bank : bank.filter(q => q.subject === subject);
  if (set) pool = pool.filter(q => (q.set || '1') === set);
  pool = shuffle(pool);
  if (pool.length === 0) return [];
  let result: any[] = [];
  while (result.length < count) result = result.concat(pool);
  return shuffle(result).slice(0, count).map(q => ({ ...q }));
};

/* ---------- timer hook ---------- */
/**
 * ตัวจับเวลา: จะเริ่มนับถอยหลังเฉพาะเมื่อ active=true และมีเวลา
 * ใช้ startKey เพื่อรีเซ็ตทุกครั้งที่เริ่มชุดข้อสอบใหม่
 */
const useTimer = (active: boolean, seconds: number, startKey: number, onEnd: () => void) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    if (!active || seconds <= 0) return;
    setTimeLeft(seconds); // reset เมื่อเริ่มรอบใหม่
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, seconds, startKey]);

  useEffect(() => {
    if (active && timeLeft === 0 && seconds > 0) endRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  return timeLeft;
};

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/* ---------- render question card ---------- */
const renderQCard = (q: any, idx: number, userAns: number | null, showAnswer: boolean, singleMode?: boolean) => {
  const choicesHtml = q.choices.map((c: string, ci: number) => {
    let cls = 'choice';
    if (singleMode && showAnswer) {
      if (ci === q.answer) cls += ' correct';
      else if (ci === userAns) cls += ' wrong';
    } else if (showAnswer) {
      if (ci === q.answer) cls += ' correct';
      else if (userAns !== null && userAns !== q.answer) cls += ' wrong';
    } else if (userAns === ci) { cls += ' selected'; }
    const clickable = showAnswer ? '' : (singleMode ? `onAnswer(${ci})` : `onAnswer(${idx},${ci})`);
    return (
      <button key={ci} className={cls} onClick={showAnswer ? undefined : () => {}} disabled={showAnswer}>
        {String.fromCharCode(65 + ci)}. {c}
      </button>
    );
  });
  // We'll actually render inline — but the function below handles onclick via closure
  return null; // handled inline below
};

/* ---------- main component ---------- */
type Screen =
  | 'home' | 'history'
  | 'timedSubject' | 'timedSet' | 'timedCount' | 'timedTest' | 'timedResult'
  | 'schoolSelect' | 'examYear' | 'examSubject' | 'examTest' | 'examResult'
  | 'oneSubject' | 'oneSet' | 'oneCount' | 'oneTest' | 'oneSummary';

export default function StudentM1Practice() {
  const [screen, setScreen] = useState<Screen>('home');
  const [subject, setSubject] = useState('random');
  const [school, setSchool] = useState('');
  const [year, setYear] = useState('');
  const [count, setCount] = useState(0);
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [mode, setMode] = useState<'timed'|'exam'|'one'>('timed');
  const [selectedSet, setSelectedSet] = useState('1');
  const navigate = useNavigate();

  const bankCount = loadBank().length;

  const goHome = useCallback(() => { setScreen('home'); setUserAnswers([]); setCurrentQuestions([]); setTimeLeft(0); }, []);
  const goHistory = useCallback(() => setScreen('history'), []);
  const openBank = useCallback(() => {
    navigate('/student/quizzes');
  }, [navigate]);

  /* ---- helpers: get available sets for general (ทั่วไป) questions per subject ---- */
  const getSetsForSubject = useCallback((subj: string): string[] => {
    const bank = loadBank();
    const sets = [...new Set(
      bank
        .filter((q: any) => q.school === GENERAL && q.year === GENERAL && (subj === 'random' || q.subject === subj))
        .map((q: any) => q.set || '1')
    )];
    return sets.sort((a, b) => Number(a) - Number(b));
  }, []);

  const getQuestionCountForSet = useCallback((subj: string, set: string): number => {
    const bank = loadBank();
    return bank.filter((q: any) =>
      q.school === GENERAL && q.year === GENERAL && (q.set || '1') === set && (subj === 'random' || q.subject === subj)
    ).length;
  }, []);

  /* ---- helpers ---- */
  const startTimedTest = useCallback((subj: string, cnt: number) => {
    const qs = randomQuestions(subj, cnt, selectedSet);
    if (qs.length === 0) { alert('ยังไม่มีข้อสอบในคลังสำหรับวิชานี้/ชุดนี้ กรุณาเพิ่มข้อมูลที่หน้าคลังข้อสอบก่อน'); return; }
    setCurrentQuestions(qs);
    setUserAnswers(new Array(qs.length).fill(null));
    setSubject(subj);
    setMode('timed');
    setTimerStartKey(k => k + 1);
    setScreen('timedTest');
  }, []);

  const startExamTest = useCallback((sc: string, yr: string, subj: string) => {
    const bank = loadBank();
    const qs = bank.filter((q: any) => q.school === sc && q.year === yr && q.subject === subj).map((q: any) => ({ ...q }));
    if (qs.length === 0) { alert('ยังไม่มีข้อสอบสำหรับเงื่อนไขนี้'); return; }
    setCurrentQuestions(qs);
    setUserAnswers(new Array(qs.length).fill(null));
    setSchool(sc); setYear(yr); setSubject(subj);
    setMode('exam');
    setTimerStartKey(k => k + 1);
    setScreen('examTest');
  }, []);

  const startOneTest = useCallback((subj: string, cnt: number) => {
    const qs = randomQuestions(subj, cnt, selectedSet);
    if (qs.length === 0) { alert('ยังไม่มีข้อสอบในคลังสำหรับวิชานี้/ชุดนี้ กรุณาเพิ่มข้อมูลที่หน้าคลังข้อสอบก่อน'); return; }
    setCurrentQuestions(qs);
    setUserAnswers(new Array(qs.length).fill(null));
    setCurrentIndex(0);
    setAnswered(false);
    setSubject(subj);
    setMode('one');
    setTimerStartKey(k => k + 1);
    setScreen('oneTest');
  }, []);

  const selectTimedAnswer = useCallback((qIdx: number, choiceIdx: number) => {
    setUserAnswers(prev => { const n = [...prev]; n[qIdx] = choiceIdx; return n; });
  }, []);

  const answerOne = useCallback((choiceIdx: number) => {
    setUserAnswers(prev => { const n = [...prev]; n[currentIndex] = choiceIdx; return n; });
    setAnswered(true);
  }, [currentIndex]);

  const nextOne = useCallback(() => {
    if (currentIndex + 1 >= currentQuestions.length) {
      // Submit
      const score = currentQuestions.reduce((s, q, i) => s + (userAnswers[i] === q.answer ? 1 : 0), 0);
      saveHistory({ mode: '📝 ทำทีละชุด', subject: subjectInfo[subject].name, score, total: currentQuestions.length, date: nowStr() });
      setScreen('oneSummary');
    } else {
      setCurrentIndex(i => i + 1);
      setAnswered(false);
    }
  }, [currentIndex, currentQuestions, userAnswers, subject]);

  const submitTimedTest = useCallback(() => {
    const score = currentQuestions.reduce((s, q, i) => s + (userAnswers[i] === q.answer ? 1 : 0), 0);
    saveHistory({ mode: '⏱️ จับเวลา', subject: subjectInfo[subject].name, score, total: currentQuestions.length, date: nowStr() });
    setScreen('timedResult');
  }, [currentQuestions, userAnswers, subject]);

  const submitExamTest = useCallback(() => {
    const score = currentQuestions.reduce((s, q, i) => s + (userAnswers[i] === q.answer ? 1 : 0), 0);
    saveHistory({ mode: `🏫 ${school} (พ.ศ.${year})`, subject: subjectInfo[subject].name, score, total: currentQuestions.length, date: nowStr() });
    setScreen('examResult');
  }, [currentQuestions, userAnswers, school, year, subject]);

  /* ---- timer setup ---- */
  const [timerStartKey, setTimerStartKey] = useState(0);
  const isTesting = (screen === 'timedTest' || screen === 'examTest') && currentQuestions.length > 0;
  const timedSeconds = mode === 'exam' ? 3600 : currentQuestions.length * 120;
  const timerLeft = useTimer(isTesting, timedSeconds, timerStartKey, () => {
    if (mode === 'timed') submitTimedTest();
    else if (mode === 'exam') submitExamTest();
  });

  /* ---- navigation ---- */
  const goTimedSubject = () => { setSubject('random'); setScreen('timedSubject'); };
  const goTimedSet = (subj: string) => { setSubject(subj); setScreen('timedSet'); };
  const goTimedCount = (subj: string) => { setSubject(subj); setScreen('timedCount'); };
  const goSchoolSelect = () => setScreen('schoolSelect');
  const goExamYear = (sc: string) => { setSchool(sc); setScreen('examYear'); };
  const goExamSubject = (sc: string, yr: string) => { setSchool(sc); setYear(yr); setScreen('examSubject'); };
  const goOneSubject = () => setScreen('oneSubject');
  const goOneSet = (subj: string) => { setSubject(subj); setScreen('oneSet'); };
  const goOneCount = (subj: string) => { setSubject(subj); setScreen('oneCount'); };

  /* ---- derived data ---- */
  const availableSchools = (): string[] => {
    return loadSchoolList().filter((s: string) => s !== GENERAL);
  };
  const availableYears = (sc: string): string[] => {
    return loadYearList().filter((y: string) => y !== GENERAL);
  };
  const availableSubjects = (sc: string, yr: string): string[] => {
    const bank = loadBank();
    return [...new Set(bank.filter((q: any) => q.school === sc && q.year === yr).map((q: any) => q.subject))];
  };

  /* ---------- RENDER ---------- */
  const render = () => {
    const app: React.ReactNode = <div className="m1-exam-app"><div className="card">
      {/* ========== HOME ========== */}
      {screen === 'home' && (
        <>
          <h1>🎒 ระบบฝึกทำข้อสอบเข้า ม.1</h1>
          <p className="subtitle">ข้อสอบเข้า ม.1 ครอบคลุมทุกโรงเรียนดัง
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <span style={{ 
              background: '#e0e7ff', 
              color: '#3730a3', 
              fontSize: '12px', 
              fontWeight: 800, 
              padding: '4px 12px', 
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>จำนวนข้อสอบเข้า ม.1 ทั้ ({bankCount} ข้อ)</span>
            </span>
          </div>
          </p>
          {bankCount === 0 && (
            <div className="empty-state">
              <div className="icon">📭</div>
              ยังไม่มีข้อสอบในระบบ<br />
              <span style={{ fontSize: '14px' }}>กรุณาเพิ่มข้อมูลจากหน้า "ระบบจัดการข้อมูลข้อสอบเข้า ม.1" ก่อนเริ่มใช้งาน</span>
            </div>
          )}
          <div className="grid">
            <button className="btn" onClick={goTimedSubject}><span className="icon">⏱️</span>ทดสอบจับเวลา</button>
            <button className="btn btn-secondary" onClick={goSchoolSelect}><span className="icon">🏫</span>ข้อสอบจริงโรงเรียนดัง</button>
            <button className="btn btn-pink" onClick={goOneSubject}><span className="icon">📝</span>ทำทีละชุด</button>
            <button className="btn btn-gold" onClick={goHistory}><span className="icon">📊</span>ประวัติคะแนน</button>
          </div>
          <div className="bank-link" style={{ textAlign: 'center', marginTop: '18px' }}>
            <button className="btn btn-outline" style={ { display: 'inline-flex', flexDirection: 'row', padding: '12px 20px', fontSize: '13px', fontWeight: 'bold' } } onClick={openBank}>
              📝 กลับสู่หน้าลานประลองข้อสอบ
            </button>
          </div>
        </>
      )}

      {/* ========== HISTORY ========== */}
      {screen === 'history' && (
        <>
          <button className="back-btn" onClick={goHome}>← กลับ</button>
          <h1>📊 ประวัติการทำข้อสอบ</h1>
          <p className="subtitle">ผลคะแนนล่าสุด {getHistory().length} รายการ</p>
          {getHistory().length === 0 ? (
            <div className="empty-state"><div className="icon">🗒️</div>ยังไม่มีประวัติการทำข้อสอบ</div>
          ) : (
            getHistory().map((h: any, i: number) => {
              const pct = Math.round((h.score / h.total) * 100);
              return (
                <div key={i} className="history-item">
                  <div className="hi-left">
                    <span className="hi-subj">{badgeFor(pct)} {h.subject} — {h.mode}</span>
                    <span className="hi-date">{h.date}</span>
                  </div>
                  <span className="hi-score">{h.score}/{h.total} ({pct}%)</span>
                </div>
              );
            })
          )}
          {getHistory().length > 0 && (
            <button className="clear-history-btn" onClick={clearHistory}>🗑️ ลบประวัติทั้งหมด</button>
          )}
        </>
      )}

      {/* ========== TIMED: SUBJECT ========== */}
      {screen === 'timedSubject' && (
        <>
          <button className="back-btn" onClick={goHome}>← กลับ</button>
          <h1>⏱️ ทดสอบจับเวลา</h1>
          <p className="subtitle">เลือกวิชาที่ต้องการทดสอบ</p>
          <div className="grid">
            {Object.entries(subjectInfo).map(([k, v]) => (
              <button key={k} className="btn" onClick={() => goTimedSet(k)}>
                <span className="icon">{v.icon}</span>{v.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ========== TIMED: SET (เลือกชุดข้อสอบ) ========== */}
      {screen === 'timedSet' && (
        <>
          <button className="back-btn" onClick={goTimedSubject}>← กลับ</button>
          <h1>{subjectInfo[subject].icon} {subjectInfo[subject].name}</h1>
          <p className="subtitle">เลือกชุดข้อสอบ</p>
          {getSetsForSubject(subject).length === 0 ? (
            <div className="empty-state"><div className="icon">📭</div>ยังไม่มีข้อสอบในวิชานี้</div>
          ) : (
            <div className="grid">
              {getSetsForSubject(subject).map(s => (
                <button key={s} className="btn" onClick={() => { setSelectedSet(s); setScreen('timedCount'); }}>
                  <span className="icon">📋</span>ชุดที่ {s}
                  <small style={{opacity:.8,fontSize:'.8rem'}}>{getQuestionCountForSet(subject, s)} ข้อ</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== TIMED: COUNT ========== */}
      {screen === 'timedCount' && (() => {
        const totalInSet = getQuestionCountForSet(subject, selectedSet);
        return (
          <>
            <button className="back-btn" onClick={() => setScreen('timedSet')}>← กลับ</button>
            <h1>{subjectInfo[subject].icon} {subjectInfo[subject].name} — ชุดที่ {selectedSet}</h1>
            <p className="subtitle">เลือกจำนวนข้อสอบ (ข้อละ 2 นาที)</p>
            <div className="num-grid">
              <button className="num-btn" style={{background:'linear-gradient(135deg,#43cea2,#185a9d)',color:'#fff',borderColor:'transparent',width:110}} onClick={() => startTimedTest(subject, totalInSet)}>
                ทำทั้งหมด<br /><small>{totalInSet} ข้อ · {totalInSet * 2} นาที</small>
              </button>
              {[10,15,20,25,30].filter(n => n < totalInSet).map(n => (
                <button key={n} className="num-btn" onClick={() => startTimedTest(subject, n)}>
                  {n} ข้อ<br /><small>{n * 2} นาที</small>
                </button>
              ))}
            </div>
          </>
        );
      })()}

      {/* ========== TIMED: TEST ========== */}
      {screen === 'timedTest' && (
        <>
          <div className={`timer-bar ${timerLeft <= 60 ? 'warn' : ''}`}>
            <span>⏱️ เวลาที่เหลือ</span>
            <span className="timer-num">{fmtTime(timerLeft)}</span>
          </div>
          {currentQuestions.map((q, i) => (
            <QuestionCard key={i} q={q} idx={i} userAns={userAnswers[i]} showAnswer={false}
              onAnswer={mode === 'timed' ? selectTimedAnswer : answerOne}
              singleMode={false}
            />
          ))}
          <button className="btn btn-wide" style={{ background: 'linear-gradient(135deg,#43a047,#2e7d32)' }} onClick={submitTimedTest}>
            ✅ ส่งข้อสอบ
          </button>
        </>
      )}

      {/* ========== TIMED RESULT ========== */}
      {screen === 'timedResult' && (
        <ResultScreen questions={currentQuestions} answers={userAnswers} onHome={goHome} />
      )}

      {/* ========== EXAM: SCHOOL SELECT ========== */}
      {screen === 'schoolSelect' && (
        <>
          <button className="back-btn" onClick={goHome}>← กลับ</button>
          <h1>🏫 ข้อสอบจริงโรงเรียนดัง</h1>
          <p className="subtitle">เลือกโรงเรียน (จับเวลา 60 นาที)</p>
          {availableSchools().length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              ยังไม่มีข้อสอบผูกกับโรงเรียนใดในระบบ<br />
              <span style={{ fontSize: '14px' }}>กรุณาเพิ่มผ่านหน้าคลังข้อสอบ</span>
            </div>
          ) : (
            <div className="school-grid">
              {availableSchools().map((s: string) => (
                <button key={s} className="school-btn" onClick={() => goExamYear(s)}>
                  <span className="icon">🏫</span>{s}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== EXAM: YEAR ========== */}
      {screen === 'examYear' && (
        <>
          <button className="back-btn" onClick={goSchoolSelect}>← กลับ</button>
          <div className="breadcrumb">🏫 {school}</div>
          <h1>เลือกปี พ.ศ.</h1>
          <p className="subtitle">เลือกปีของข้อสอบ</p>
          <div className="year-grid">
            {availableYears(school).map((y: string) => (
              <button key={y} className="year-btn" onClick={() => goExamSubject(school, y)}>
                พ.ศ. {y}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ========== EXAM: SUBJECT ========== */}
      {screen === 'examSubject' && (
        <>
          <button className="back-btn" onClick={() => goExamYear(school)}>← กลับ</button>
          <div className="breadcrumb">🏫 {school} • พ.ศ. {year}</div>
          <h1>เลือกวิชา</h1>
          <p className="subtitle">จับเวลา 60 นาที</p>
          <div className="grid">
            {availableSubjects(school, year).map((k: string) => (
              <button key={k} className="btn" onClick={() => startExamTest(school, year, k)}>
                <span className="icon">{subjectInfo[k].icon}</span>{subjectInfo[k].name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ========== EXAM: TEST ========== */}
      {screen === 'examTest' && (
        <>
          <div className="timer-bar">
            <span>⏱️ เวลาที่เหลือ (60 นาที)</span>
            <span className="timer-num">{fmtTime(timerLeft)}</span>
          </div>
          {currentQuestions.map((q, i) => (
            <QuestionCard key={i} q={q} idx={i} userAns={userAnswers[i]} showAnswer={false}
              onAnswer={selectTimedAnswer}
              singleMode={false}
            />
          ))}
          <button className="btn btn-wide" style={{ background: 'linear-gradient(135deg,#43a047,#2e7d32)' }} onClick={submitExamTest}>
            ✅ ทำเสร็จทั้งหมด
          </button>
        </>
      )}

      {/* ========== EXAM RESULT ========== */}
      {screen === 'examResult' && (
        <ResultScreen questions={currentQuestions} answers={userAnswers} onHome={goHome} />
      )}

      {/* ========== ONE: SUBJECT ========== */}
      {screen === 'oneSubject' && (
        <>
          <button className="back-btn" onClick={goHome}>← กลับ</button>
          <h1>📝 ทำทีละชุด</h1>
          <p className="subtitle">เลือกวิชาที่ต้องการทดสอบ</p>
          <div className="grid">
            {Object.entries(subjectInfo).map(([k, v]) => (
              <button key={k} className="btn" onClick={() => goOneSet(k)}>
                <span className="icon">{v.icon}</span>{v.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ========== ONE: SET ========== */}
      {screen === 'oneSet' && (
        <>
          <button className="back-btn" onClick={goOneSubject}>← กลับ</button>
          <h1>{subjectInfo[subject].icon} {subjectInfo[subject].name}</h1>
          <p className="subtitle">เลือกชุดข้อสอบ</p>
          {getSetsForSubject(subject).length === 0 ? (
            <div className="empty-state"><div className="icon">📭</div>ยังไม่มีข้อสอบในวิชานี้</div>
          ) : (
            <div className="grid">
              {getSetsForSubject(subject).map(s => (
                <button key={s} className="btn btn-pink" onClick={() => { setSelectedSet(s); setScreen('oneCount'); }}>
                  <span className="icon">📋</span>ชุดที่ {s}
                  <small style={{opacity:.8,fontSize:'.8rem'}}>{getQuestionCountForSet(subject, s)} ข้อ</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== ONE: COUNT ========== */}
      {screen === 'oneCount' && (() => {
        const totalInSet = getQuestionCountForSet(subject, selectedSet);
        return (
          <>
            <button className="back-btn" onClick={() => setScreen('oneSet')}>← กลับ</button>
            <h1>{subjectInfo[subject].icon} {subjectInfo[subject].name} — ชุดที่ {selectedSet}</h1>
            <p className="subtitle">เลือกจำนวนข้อสอบ ({totalInSet} ข้อในชุดนี้)</p>
            <div className="num-grid">
              <button className="num-btn" style={{background:'linear-gradient(135deg,#43cea2,#185a9d)',color:'#fff',borderColor:'transparent',width:110}} onClick={() => startOneTest(subject, totalInSet)}>
                ทำทั้งหมด<br /><small>{totalInSet} ข้อ</small>
              </button>
              {[10,15,20,25,30].filter(n => n < totalInSet).map(n => (
                <button key={n} className="num-btn" onClick={() => startOneTest(subject, n)}>
                  {n} ข้อ
                </button>
              ))}
            </div>
          </>
        );
      })()}

      {/* ========== ONE: TEST ========== */}
      {screen === 'oneTest' && (
        <>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${(currentIndex / currentQuestions.length) * 100}%` }}></div>
          </div>
          <p style={{ textAlign: 'right', color: '#888', marginBottom: '10px', fontSize: '0.9rem' }}>
            ข้อ {currentIndex + 1} / {currentQuestions.length}
          </p>
          {currentQuestions[currentIndex] && (
            <QuestionCard
              q={currentQuestions[currentIndex]}
              idx={currentIndex}
              userAns={userAnswers[currentIndex]}
              showAnswer={answered}
              onAnswer={answerOne}
              singleMode={true}
              onNext={answered ? nextOne : undefined}
              nextLabel={currentIndex + 1 >= currentQuestions.length ? 'ดูสรุปผล' : 'ข้อถัดไป'}
            />
          )}
        </>
      )}

      {/* ========== ONE SUMMARY ========== */}
      {screen === 'oneSummary' && (
        <>
          {(() => {
            const sc = currentQuestions.reduce((s,q,i)=>s+(userAnswers[i]===q.answer?1:0),0);
            const pct = currentQuestions.length > 0 ? Math.round((sc/currentQuestions.length)*100) : 0;
            return (
              <>
                <div className="score-box">
                  <div className="badge">{badgeFor(pct)}</div>
                  <div>🎉 เสร็จสิ้น!</div>
                  <div className="big">{sc} / {currentQuestions.length}</div>
                  <div>{commentFor(pct)}</div>
                </div>
                <button className="btn btn-wide" onClick={goHome}>🏠 กลับหน้าหลัก</button>
              </>
            );
          })()}
        </>
      )}
    </div></div >;
    return app;
  };

  return (
    <div className="m1-exam-page">
      <style>{`
        .m1-exam-page { min-height:100vh; padding:20px; color:#2d2d2d;
          background:linear-gradient(-45deg,#667eea,#764ba2,#f093fb,#43cea2); background-size:400% 400%;
          animation:g 15s ease infinite; font-family:'Noto Sans Thai Looped',sans-serif; box-sizing:border-box; }
        @keyframes g { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .m1-exam-app { max-width:920px; margin:0 auto; }
        .card { background:rgba(255,255,255,.92); backdrop-filter:blur(12px); border-radius:24px;
          padding:32px; box-shadow:0 15px 40px rgba(0,0,0,.25); animation:fade .4s ease; }
        @keyframes fade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        h1 { text-align:center; color:#4a148c; margin-bottom:6px; font-size:1.9rem; font-weight:700; }
        .subtitle { text-align:center; color:#777; margin-bottom:25px; font-weight:300; }
        .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:18px; }
        .btn { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; border:none; border-radius:16px;
          padding:22px; font-size:1.05rem; font-weight:500; cursor:pointer; transition:.25s;
          display:flex; flex-direction:column; align-items:center; gap:8px;
          box-shadow:0 6px 16px rgba(102,126,234,.3); font-family:'Noto Sans Thai Looped',sans-serif; }
        .btn:hover { transform:translateY(-6px) scale(1.03); box-shadow:0 10px 24px rgba(118,75,162,.5); }
        .btn .icon { font-size:2.1rem; }
        .btn-secondary { background:linear-gradient(135deg,#43cea2,#185a9d); box-shadow:0 6px 16px rgba(24,90,157,.3); }
        .btn-pink { background:linear-gradient(135deg,#f093fb,#f5576c); box-shadow:0 6px 16px rgba(245,87,108,.3); }
        .btn-gold { background:linear-gradient(135deg,#f7971e,#ffd200); box-shadow:0 6px 16px rgba(247,151,30,.3); }
        .btn-outline { background:#fff; color:#764ba2; border:2px solid #764ba2; box-shadow:none; }
        .btn-wide { width:100%; padding:16px; margin-top:15px; font-size:1.05rem; }
        .back-btn { background:#eee; color:#555; padding:8px 18px; border-radius:12px; border:none;
          cursor:pointer; margin-bottom:15px; font-family:'Noto Sans Thai Looped',sans-serif; transition:.2s; }
        .back-btn:hover { background:#ddd; transform:translateX(-3px); }
        .num-grid { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; }
        .num-btn { width:85px; height:85px; border-radius:16px; border:2px solid #764ba2;
          background:#fff; color:#764ba2; font-size:1.3rem; font-weight:600; cursor:pointer;
          transition:.2s; font-family:'Noto Sans Thai Looped',sans-serif; }
        .num-btn:hover { background:#764ba2; color:#fff; transform:scale(1.05); }
        .timer-bar { position:sticky; top:10px; z-index:10; background:rgba(255,255,255,.95);
          backdrop-filter:blur(8px); padding:14px 22px; border-radius:16px;
          display:flex; justify-content:space-between; align-items:center;
          box-shadow:0 6px 18px rgba(0,0,0,.15); margin-bottom:20px; }
        .timer-bar.warn { background:#ffe0e0; animation:pulse 1s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
        .timer-num { font-size:1.5rem; font-weight:700; color:#764ba2; }
        .timer-bar.warn .timer-num { color:#d32f2f; }
        .progress { height:10px; background:#eee; border-radius:8px; overflow:hidden; margin-bottom:20px; }
        .progress-fill { height:100%; background:linear-gradient(90deg,#43cea2,#764ba2); transition:.3s; }
        .qcard { border:1px solid #eee; border-radius:18px; padding:22px; margin-bottom:18px; background:#fff; }
        .qnum { display:inline-block; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff;
          width:34px; height:34px; border-radius:50%; text-align:center; line-height:34px; margin-right:10px; font-weight:600; }
        .qtext { font-size:1.1rem; margin-bottom:16px; font-weight:500; }
        .choice { display:block; width:100%; text-align:left; padding:13px 18px; border-radius:12px;
          border:2px solid #ddd; background:#fafafa; margin-bottom:10px; cursor:pointer; font-family:'Noto Sans Thai Looped',sans-serif; font-size:1rem; transition:.2s; }
        .choice:hover { border-color:#764ba2; transform:translateX(3px); }
        .choice.selected { border-color:#764ba2; background:#ede7f6; }
        .choice.correct { border-color:#43a047; background:#e8f5e9; color:#2e7d32; font-weight:600; }
        .choice.wrong { border-color:#e53935; background:#ffebee; color:#c62828; font-weight:600; }
        .explain { background:#fff8e1; border-left:4px solid #ffb300; padding:14px 18px; border-radius:10px;
          margin-top:12px; font-size:.95rem; color:#5d4037; }
        .score-box { text-align:center; padding:30px; background:linear-gradient(135deg,#43cea2,#185a9d);
          color:#fff; border-radius:20px; margin-bottom:22px; box-shadow:0 10px 24px rgba(24,90,157,.35); }
        .score-box .badge { font-size:3rem; margin-bottom:8px; }
        .score-box .big { font-size:2.6rem; font-weight:700; }
        .school-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
        .school-btn { background:linear-gradient(135deg,#ff9966,#ff5e62); color:#fff; border:none; border-radius:16px;
          padding:22px; font-size:1.05rem; font-weight:600; cursor:pointer; transition:.25s;
          display:flex; flex-direction:column; align-items:center; gap:6px;
          box-shadow:0 6px 16px rgba(255,94,98,.3); font-family:'Noto Sans Thai Looped',sans-serif; }
        .school-btn:hover { transform:translateY(-6px) scale(1.03); box-shadow:0 10px 24px rgba(255,94,98,.5); }
        .school-btn .icon { font-size:2rem; }
        .year-grid { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
        .year-btn { padding:14px 22px; border-radius:14px; border:2px solid #764ba2; background:#fff;
          color:#764ba2; font-weight:600; cursor:pointer; font-family:'Noto Sans Thai Looped',sans-serif; transition:.2s; }
        .year-btn:hover { background:#764ba2; color:#fff; transform:scale(1.05); }
        .history-item { display:flex; justify-content:space-between; align-items:center; background:#f8f7ff;
          border-radius:14px; padding:14px 18px; margin-bottom:10px; border-left:5px solid #764ba2; }
        .history-item .hi-left { display:flex; flex-direction:column; gap:2px; }
        .history-item .hi-subj { font-weight:600; color:#4a148c; }
        .history-item .hi-date { font-size:.82rem; color:#999; }
        .history-item .hi-score { font-size:1.2rem; font-weight:700; color:#43a047; }
        .empty-state { text-align:center; padding:40px 20px; color:#999; }
        .empty-state .icon { font-size:3rem; margin-bottom:10px; }
        .clear-history-btn { background:#ffebee; color:#c62828; border:none; padding:10px 18px; border-radius:10px;
          cursor:pointer; font-family:'Noto Sans Thai Looped',sans-serif; margin-top:15px; }
        .clear-history-btn:hover { background:#ffcdd2; }
        .breadcrumb { text-align:center; color:#999; margin-bottom:10px; font-size:.9rem; }
        .bank-link { text-align:center; margin-top:18px; }
      `}</style>
      {render()}
    </div>
  );
}

/* ---------- sub-components ---------- */
function QuestionCard({ q, idx, userAns, showAnswer, onAnswer, singleMode, onNext, nextLabel }: {
  q: any; idx: number; userAns: number | null; showAnswer: boolean;
  onAnswer: (qIdx: number, ci: number) => void;
  singleMode?: boolean; onNext?: () => void; nextLabel?: string;
}) {
  const choicesHtml = q.choices.map((c: string, ci: number) => {
    let cls = 'choice';
    if (singleMode && showAnswer) {
      if (ci === q.answer) cls += ' correct';
      else if (ci === userAns) cls += ' wrong';
    } else if (showAnswer) {
      if (ci === q.answer) cls += ' correct';
      else if (userAns !== null && userAns !== q.answer) cls += ' wrong';
    } else if (userAns === ci) { cls += ' selected'; }
    return (
      <button
        key={ci}
        className={cls}
        disabled={showAnswer}
        onClick={showAnswer ? undefined : () => onAnswer(idx, ci)}
      >
        {String.fromCharCode(65 + ci)}. {c}
      </button>
    );
  });

  return (
    <div className="qcard">
      <div className="qtext">
        <span className="qnum">{idx + 1}</span>{q.q}
      </div>
      {q.q_image && <img src={q.q_image} alt="รูปคำถาม" style={{maxWidth:'100%',maxHeight:260,borderRadius:12,marginBottom:12,boxShadow:'0 4px 12px rgba(0,0,0,.1)'}} />}
      {choicesHtml}
      {showAnswer && (
        <div className="explain">
          💡 <b>เฉลย:</b> {q.choices[q.answer]}<br />{q.explain}
          {q.explain_image && <img src={q.explain_image} alt="รูปเฉลย" style={{maxWidth:'100%',maxHeight:200,borderRadius:10,marginTop:10}} />}
        </div>
      )}
      {singleMode && showAnswer && onNext && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn btn-wide" onClick={onNext}>➡️ {nextLabel || 'ข้อถัดไป'}</button>
        </div>
      )}
    </div>
  );
}

function ResultScreen({ questions, answers, onHome }: { questions: any[]; answers: (number|null)[]; onHome: () => void }) {
  if (questions.length === 0) {
    return (
      <>
        <div className="score-box">
          <div className="badge">📭</div>
          <div className="big">0 / 0</div>
          <div>ยังไม่มีข้อสอบ</div>
        </div>
        <h1 style={{ fontSize: '1.3rem' }}>📋 เฉลยข้อสอบ</h1>
        <div className="empty-state"><div className="icon">📭</div>ยังไม่มีข้อสอบในระบบ</div>
        <button className="btn btn-wide" onClick={onHome}>🏠 กลับหน้าหลัก</button>
      </>
    );
  }
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
  const pct = Math.round((score / questions.length) * 100);
  return (
    <>
      <div className="score-box">
        <div className="badge">{badgeFor(pct)}</div>
        <div className="big">{score} / {questions.length}</div>
        <div>{commentFor(pct)} ({pct}%)</div>
      </div>
      <h1 style={{ fontSize: '1.3rem' }}>📋 เฉลยข้อสอบ</h1>
      {questions.map((q, i) => (
        <QuestionCard key={i} q={q} idx={i} userAns={answers[i]} showAnswer={true} onAnswer={() => {}} singleMode={false} />
      ))}
      <button className="btn btn-wide" onClick={onHome}>🏠 กลับหน้าหลัก</button>
    </>
  );
}
