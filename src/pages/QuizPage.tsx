import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import type { Question, QuizResult } from '../types';

/* ============================================================
   แบบทดสอบตามบทเรียน — ตกแต่งธีมเดียวกับหน้าข้อสอบ O-NET
   (พื้นหลังไล่สีเคลื่อนไหว + การ์ดกระจก + ปุ่มไล่สี)
   ============================================================ */
const QUIZ_ONET_CSS = `
.quiz-onet {
  min-height: 100vh;
  padding: 20px;
  color: #2d2d2d;
  background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #43cea2);
  background-size: 400% 400%;
  animation: quizOnetShift 15s ease infinite;
}
@keyframes quizOnetShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.quiz-onet .wrap { max-width: 860px; margin: 0 auto; }
.quiz-onet .card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
  animation: quizOnetFade 0.4s ease;
}
@keyframes quizOnetFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.quiz-onet h1 { color: #4a148c; margin: 0 0 6px; font-size: 1.8rem; font-weight: 700; line-height: 1.35; text-align: center; }
.quiz-onet .subtitle { text-align: center; color: #777; margin: 0 0 22px; font-weight: 400; font-size: 1rem; }
.quiz-onet .chip {
  display: inline-block; background: #ede7f6; color: #4a148c; border-radius: 999px;
  padding: 3px 12px; font-size: 0.8rem; font-weight: 600; margin-left: 6px;
}
.quiz-onet .btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border: none; border-radius: 16px;
  padding: 15px 30px; font-size: 1.05rem; font-weight: 700;
  cursor: pointer; transition: 0.25s; box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
}
.quiz-onet .btn:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 10px 24px rgba(118, 75, 162, 0.5); }
.quiz-onet .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
.quiz-onet .btn-green { background: linear-gradient(135deg, #43a047, #2e7d32); box-shadow: 0 6px 16px rgba(67, 160, 71, 0.3); }
.quiz-onet .btn-teal { background: linear-gradient(135deg, #43cea2, #185a9d); box-shadow: 0 6px 16px rgba(24, 90, 157, 0.35); }
.quiz-onet .btn-pink { background: linear-gradient(135deg, #f093fb, #f5576c); box-shadow: 0 6px 16px rgba(245, 87, 108, 0.3); }
.quiz-onet .btn-wide { width: 100%; padding: 16px; margin-top: 15px; }
.quiz-onet .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 24px; }
.quiz-onet .back-btn { background: #eee; color: #555; padding: 8px 18px; border-radius: 12px; border: none; cursor: pointer; font-weight: 500; transition: 0.2s; }
.quiz-onet .back-btn:hover { background: #ddd; transform: translateX(-3px); }
.quiz-onet .text-link { color: #fff; font-weight: 600; text-decoration: underline; }
.quiz-onet .intro-icon {
  width: 92px; height: 92px; border-radius: 28px; display: flex; align-items: center; justify-content: center;
  font-size: 2.6rem; margin: 0 auto 18px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  box-shadow: 0 10px 22px rgba(118, 75, 162, 0.4);
}
.quiz-onet .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 22px 0 26px; }
.quiz-onet .info-box {
  background: #f8f7ff; border: 1px solid #ede7f6; border-radius: 16px; padding: 14px 10px; text-align: center;
}
.quiz-onet .info-box .info-num { font-size: 1.5rem; font-weight: 800; color: #4a148c; line-height: 1.2; }
.quiz-onet .info-box .info-lbl { font-size: 0.82rem; color: #8b7bb5; }
.quiz-onet .warn-box {
  background: #fff8e1; border: 1px solid #ffe082; border-radius: 14px; padding: 12px 16px;
  margin-bottom: 18px; color: #8a6d00; font-size: 0.9rem; text-align: center;
}
.quiz-onet .timer-bar {
  position: sticky; top: 10px; z-index: 10; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px);
  padding: 12px 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15); margin-bottom: 20px; flex-wrap: wrap;
}
.quiz-onet .timer-bar.warn { background: #ffe0e0; animation: quizOnetPulse 1s infinite; }
@keyframes quizOnetPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.quiz-onet .timer-num { font-size: 1.4rem; font-weight: 800; color: #764ba2; white-space: nowrap; }
.quiz-onet .timer-bar.warn .timer-num { color: #d32f2f; }
.quiz-onet .tb-progress { font-weight: 700; color: #4a148c; font-size: 0.95rem; }
.quiz-onet .qcard {
  border: 1px solid #eee; border-radius: 18px; padding: 20px; margin-bottom: 16px; background: #fff;
}
.quiz-onet .qtext { font-size: 1.05rem; margin-bottom: 16px; font-weight: 500; display: flex; align-items: flex-start; gap: 12px; }
.quiz-onet .qnum {
  display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; width: 34px; height: 34px;
  border-radius: 50%; text-align: center; line-height: 34px; font-weight: 600; flex-shrink: 0;
}
.quiz-onet .qtext-inner { padding-top: 3px; }
.quiz-onet .choice {
  display: block; width: 100%; text-align: left; padding: 13px 18px; border-radius: 12px; border: 2px solid #ddd;
  background: #fafafa; margin-bottom: 10px; cursor: pointer; font-size: 0.98rem; transition: 0.2s;
}
.quiz-onet .choice:hover { border-color: #764ba2; transform: translateX(3px); }
.quiz-onet .choice.selected { border-color: #764ba2; background: #ede7f6; color: #4a148c; font-weight: 600; }
.quiz-onet .choice.correct { border-color: #43a047; background: #e8f5e9; color: #2e7d32; font-weight: 600; cursor: default; }
.quiz-onet .choice.wrong { border-color: #e53935; background: #ffebee; color: #c62828; font-weight: 600; cursor: default; }
.quiz-onet .explain {
  background: #fff8e1; border-left: 4px solid #ffb300; padding: 13px 16px; border-radius: 10px;
  margin-top: 10px; font-size: 0.93rem; color: #5d4037; line-height: 1.6;
}
.quiz-onet .score-box {
  text-align: center; padding: 30px; background: linear-gradient(135deg, #43cea2, #185a9d); color: #fff;
  border-radius: 20px; margin-bottom: 24px; box-shadow: 0 10px 24px rgba(24, 90, 157, 0.35);
}
.quiz-onet .score-box.fail { background: linear-gradient(135deg, #f093fb, #f5576c); box-shadow: 0 10px 24px rgba(245, 87, 108, 0.35); }
.quiz-onet .score-box .badge { font-size: 2.6rem; margin-bottom: 4px; }
.quiz-onet .score-box .big { font-size: 2.4rem; font-weight: 800; line-height: 1.2; }
.quiz-onet .score-box .note { opacity: 0.92; font-size: 0.95rem; margin-top: 2px; }
.quiz-onet .empty-state { text-align: center; padding: 40px 20px; color: #999; }
.quiz-onet .empty-state .icon { font-size: 3rem; margin-bottom: 10px; }
@media (max-width: 560px) {
  .quiz-onet .info-grid { gap: 8px; }
  .quiz-onet .card { padding: 22px; }
  .quiz-onet .timer-bar { flex-direction: column; align-items: stretch; text-align: center; }
  .quiz-onet .actions { flex-direction: column; }
  .quiz-onet .actions .btn { width: 100%; }
}
`;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface ShuffledQuestion extends Question {
  shuffledOptions: { label: string; text: string }[];
  correctLabel: string;
}

export default function QuizPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { lessons, questions, quizzes , subjects } = useAppStore();
  const lesson = lessons.find(l => l.id === Number(lessonId));
  const subject = lesson ? subjects.find(s => s.id === lesson.subject_unit_id) : null;
  const quizConfig = quizzes.find(q => q.lesson_id === Number(lessonId));

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  const questionsData = useMemo(() => {
    const available = questions.filter(q => q.lesson_id === Number(lessonId));
    const shuffled = shuffle(available);
    const selected = shuffled.slice(0, Math.min(quizConfig?.total_questions || 5, shuffled.length));

    return selected.map(q => {
      const options = [
        { label: 'A', text: q.option_a || '' },
        { label: 'B', text: q.option_b || '' },
        { label: 'C', text: q.option_c || '' },
        { label: 'D', text: q.option_d || '' },
      ];
      const shuffledOpts = shuffle(options);
      const correctText = (
        q.correct_answer === 'A' ? q.option_a :
        q.correct_answer === 'B' ? q.option_b :
        q.correct_answer === 'C' ? q.option_c : q.option_d
      );
      const correctLabel = shuffledOpts.find(o => o.text === correctText)?.label || q.correct_answer;

      return { ...q, shuffledOptions: shuffledOpts, correctLabel };
    });
  }, [lessonId, quizConfig, questions]);

  useEffect(() => {
    if (!started || submitted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [started, submitted, timeLeft]);

  useEffect(() => {
    if (started && !submitted && timeLeft <= 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  const handleAnswer = useCallback((questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSubmit = useCallback(() => {
    let correct = 0;
    const quizResults: QuizResult[] = questionsData.map(q => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer === q.correctLabel;
      if (isCorrect) correct++;
      return {
        question_id: q.id,
        question: q.question_text,
        user_answer: userAnswer,
        correct_answer: q.correctLabel,
        is_correct: isCorrect,
        explanation: q.explanation,
      };
    });
    setResults(quizResults);
    setScore(Math.round((correct / questionsData.length) * 100));
    setSubmitted(true);
  }, [questionsData, answers]);

  const passed = score >= (quizConfig?.passing_score || 70);

  if (!lesson) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">ไม่พบแบบทดสอบนี้</p>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">กลับหน้าแรก</Link>
      </div>
    );
  }

  // ---------- Intro screen ----------
  if (!started) {
    return (
      <div className="quiz-onet">
        <style>{QUIZ_ONET_CSS}</style>
        <div className="wrap">
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="intro-icon">📝</div>
            <h1>{quizConfig?.quiz_title || `แบบทดสอบ: ${lesson.title}`}</h1>
            <p className="subtitle">
              {quizConfig?.description || lesson.summary}
              {subject && <span className="chip">ป.{subject.grade_level} • {subject.unit_code}</span>}
            </p>

            <div className="info-grid">
              <div className="info-box">
                <div className="info-num">{questionsData.length}</div>
                <div className="info-lbl">จำนวนข้อ</div>
              </div>
              <div className="info-box">
                <div className="info-num">{quizConfig?.passing_score || 70}%</div>
                <div className="info-lbl">เกณฑ์ผ่าน</div>
              </div>
              <div className="info-box">
                <div className="info-num">⏱ {formatTime(timeLeft)}</div>
                <div className="info-lbl">เวลาจำกัด</div>
              </div>
            </div>

            {questionsData.length === 0 && (
              <div className="warn-box">⚠️ ยังไม่มีข้อสอบสำหรับบทเรียนนี้ กรุณาเพิ่มข้อสอบก่อนทำแบบทดสอบ</div>
            )}

            <button
              onClick={() => setStarted(true)}
              disabled={questionsData.length === 0}
              className="btn btn-teal"
            >
              🚀 เริ่มทำแบบทดสอบ
            </button>
            <div className="actions">
              <Link to={`/lesson/${lessonId}`} className="text-link" style={{ color: '#4a148c' }}>← กลับไปบทเรียน</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Result screen ----------
  if (submitted) {
    const correctCount = results.filter(r => r.is_correct).length;
    return (
      <div className="quiz-onet">
        <style>{QUIZ_ONET_CSS}</style>
        <div className="wrap">
          <div className="card">
            <div className={`score-box ${passed ? '' : 'fail'}`}>
              <div className="badge">{passed ? '🏆' : '💪'}</div>
              <div className="big">{score}%</div>
              <div className="note">
                {passed ? '🎉 ยินดีด้วย! คุณผ่านแบบทดสอบ!' : 'ยังไม่ผ่านเกณฑ์ ลองใหม่อีกครั้งนะ'}
                {' • '}ตอบถูก {correctCount}/{results.length} ข้อ
              </div>
            </div>

            <h1 style={{ fontSize: '1.3rem' }}>📋 เฉลยคำตอบ</h1>

            <div className="space-y-4" style={{ marginTop: 18 }}>
              {results.map((result, idx) => {
                const q = questionsData[idx];
                return (
                  <div key={result.question_id} className="qcard">
                    <div className="qtext">
                      <span className="qnum">{idx + 1}</span>
                      <span className="qtext-inner">{result.question}</span>
                    </div>
                    {q?.shuffledOptions.map(opt => {
                      let cls = 'choice';
                      if (opt.label === q.correctLabel) cls += ' correct';
                      else if (opt.label === result.user_answer) cls += ' wrong';
                      return (
                        <div key={opt.label} className={cls}>
                          {opt.label}. {opt.text}
                          {opt.label === result.user_answer && result.is_correct && ' ✓'}
                          {opt.label === result.user_answer && !result.is_correct && ' ✗'}
                        </div>
                      );
                    })}
                    {result.explanation && (
                      <div className="explain">
                        💡 <b>คำอธิบาย:</b> {result.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="actions">
              {!passed && (
                <button
                  className="btn btn-pink"
                  onClick={() => { setStarted(false); setSubmitted(false); setAnswers({}); setResults([]); setScore(0); setTimeLeft(30 * 60); }}
                >
                  🔄 ทำใหม่
                </button>
              )}
              <Link to={`/lesson/${lessonId}`} className="btn" style={{ textDecoration: 'none' }}>← กลับบทเรียน</Link>
              <button className="btn btn-teal" onClick={() => navigate('/dashboard')}>📊 ดูแดชบอร์ด</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Quiz screen ----------
  const warn = timeLeft <= 300;
  return (
    <div className="quiz-onet">
      <style>{QUIZ_ONET_CSS}</style>
      <div className="wrap">
        {/* Sticky header */}
        <div className={`timer-bar ${warn ? 'warn' : ''}`}>
          <span className="tb-progress">
            {quizConfig?.quiz_title || lesson.title} • {answeredCount}/{questionsData.length} ข้อ
          </span>
          <span className="timer-num">⏱ {formatTime(timeLeft)}</span>
        </div>

        <div className="card">
          <h1 style={{ fontSize: '1.3rem' }}>📝 ทำแบบทดสอบ</h1>
          <p className="subtitle">
            ตอบให้ครบทุกข้อ แล้วกด "ส่งคำตอบ"
            {answeredCount > 0 && <span className="chip">ตอบแล้ว {answeredCount}/{questionsData.length} ข้อ</span>}
          </p>

          <div className="space-y-4">
            {questionsData.map((q, idx) => (
              <div key={q.id} className="qcard">
                <div className="qtext">
                  <span className="qnum">{idx + 1}</span>
                  <span className="qtext-inner">{q.question_text}</span>
                </div>
                <div style={{ marginLeft: 0 }}>
                  {q.shuffledOptions.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleAnswer(q.id, opt.label)}
                      className={`choice ${answers[q.id] === opt.label ? 'selected' : ''}`}
                    >
                      {opt.label}. {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={answeredCount === 0}
            className="btn btn-green btn-wide"
          >
            ✅ ส่งคำตอบ ({answeredCount}/{questionsData.length} ข้อ)
          </button>
        </div>
      </div>
    </div>
  );
}