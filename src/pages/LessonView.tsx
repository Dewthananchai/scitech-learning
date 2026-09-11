import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { useLessonProgress, useQuestions, useLessonSession } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import type { Question } from '../types';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getGoogleDriveEmbedUrl(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  return null;
}

function renderMarkdown(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-gray-800 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-700 mt-6 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-gray-700 mt-4 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-gray-800 mt-3">{line.slice(2, -2)}</p>;
    if (line.match(/^\d+\.\s\*\*/)) {
      const boldPart = line.match(/\*\*(.+?)\*\*/)?.[1] || '';
      const rest = line.replace(/^\d+\.\s\*\*.*?\*\*/, '');
      return <div key={i} className="flex gap-2 mt-2"><span className="text-blue-600 font-bold">{line.match(/^\d+/)?.[0]}.</span><p><span className="font-bold">{boldPart}</span>{rest}</p></div>;
    }
    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-600 mt-1">• {line.slice(2)}</li>;
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="text-gray-600 mt-1">{line}</p>;
  });
}

// Format seconds to mm:ss
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Step = 'pre-quiz' | 'pre-result' | 'content' | 'post-quiz' | 'result';

export default function LessonView() {
  const { id } = useParams();
  const { lessons , subjects } = useAppStore();
  const { questions: allQuestions } = useQuestions();
  const lesson = lessons.find(l => l.id === Number(id));
  const subject = lesson ? subjects.find(s => s.id === lesson.subject_unit_id) : null;
  const { markCompleted } = useLessonProgress();
  const { user, isStudent } = useAuth();
  const { startLesson, completeLesson, getStatus, updateElapsed, getElapsed } = useLessonSession();

  // Check session status
  const sessionStatus = lesson && user ? getStatus(lesson.id, user.id) : 'not_started';
  const isCompleted = sessionStatus === 'completed';
  const isInProgress = sessionStatus === 'in_progress';

  // Step management: completed → post-quiz, in_progress → content, new → pre-quiz
  const getInitialStep = (): Step => {
    if (!isStudent) return 'content';
    if (isCompleted || isInProgress) return 'content'; // skip pre-quiz for in-progress/completed
    return 'pre-quiz'; // new lesson → pre-quiz first
  };
  const [step, setStep] = useState<Step>(getInitialStep);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Timer (countdown) — restore elapsed from store
  const REQUIRED_TIME = (lesson?.estimated_minutes || 5) * 60;
  const savedElapsed = lesson && user ? getElapsed(lesson.id, user.id) : 0;
  const initialTimeLeft = isCompleted ? 0 : Math.max(0, REQUIRED_TIME - savedElapsed);
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [timerActive, setTimerActive] = useState(false);
  const timerDone = timeLeft <= 0;

  // Results
  const [preQuizResult, setPreQuizResult] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [postQuizResult, setPostQuizResult] = useState<{ score: number; correct: number; total: number } | null>(null);

  // Generate quiz questions for pre/post quiz
  const generateQuiz = useCallback((count: number) => {
    if (!lesson) return [];
    const pool = allQuestions.filter(q => q.lesson_id === lesson.id && (!q.category || q.category === 'lesson'));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, pool.length));
  }, [lesson, allQuestions]);

  // Start pre-quiz
  useEffect(() => {
    if (isStudent && step === 'pre-quiz') {
      const qs = generateQuiz(3);
      setQuizQuestions(qs);
      setCurrentQ(0);
      setAnswers({});
    }
  }, [step, isStudent, generateQuiz]);

  // Start timer when entering content (skip for completed lessons)
  useEffect(() => {
    if (step === 'content' && !isCompleted) {
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [step, isCompleted]);

  // Timer countdown + persist elapsed every 5 seconds
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          if (lesson && user) updateElapsed(lesson.id, user.id, REQUIRED_TIME);
          return 0;
        }
        const newElapsed = REQUIRED_TIME - (prev - 1);
        if (lesson && user && newElapsed % 5 === 0) {
          updateElapsed(lesson.id, user.id, newElapsed);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, lesson?.id, user?.id]);

  // Escape fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pdfFullscreen) setPdfFullscreen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [pdfFullscreen]);

  // Submit pre-quiz → show result first
  const handlePreQuizSubmit = () => {
    let correct = 0;
    quizQuestions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const total = quizQuestions.length;
    const score = Math.round((correct / total) * 100);
    setPreQuizResult({ score, correct, total });
    setStep('pre-result');
  };

  // Start lesson after seeing pre-quiz result
  const handleStartLesson = () => {
    if (lesson && user) {
      startLesson(lesson.id, user.id);
      updateElapsed(lesson.id, user.id, 0); // reset elapsed for fresh start
    }
    setTimeLeft(REQUIRED_TIME);
    setStep('content');
    setTimerActive(true);
  };

  // Finish lesson → go to post-quiz (only if timer done)
  const handleFinishLesson = () => {
    if (!timerDone) return;
    // Don't complete lesson here — only after 100% on post-quiz
    const qs = generateQuiz(3);
    if (qs.length === 0) {
      // No questions — auto-complete and go to result
      if (isStudent && lesson && user) {
        completeLesson(lesson.id, user.id);
      }
      setPreQuizResult({ score: 0, correct: 0, total: 0 });
      setPostQuizResult({ score: 0, correct: 0, total: 0 });
      setStep('result');
      return;
    }
    setQuizQuestions(qs);
    setCurrentQ(0);
    setAnswers({});
    // Ensure preQuizResult exists for result page (for in-progress lessons that skipped pre-quiz)
    if (!preQuizResult) {
      setPreQuizResult({ score: 0, correct: 0, total: 0 });
    }
    setStep('post-quiz');
  };

  // Skip to post-quiz directly (for completed lessons)
  const handleGoToPostQuiz = () => {
    const qs = generateQuiz(3);
    if (qs.length === 0) {
      // No questions — show result with no quiz
      setPreQuizResult({ score: 0, correct: 0, total: 0 });
      setPostQuizResult({ score: 0, correct: 0, total: 0 });
      setStep('result');
      return;
    }
    setQuizQuestions(qs);
    setCurrentQ(0);
    setAnswers({});
    // Ensure preQuizResult exists for result page
    if (!preQuizResult) {
      setPreQuizResult({ score: 0, correct: 0, total: 0 });
    }
    setStep('post-quiz');
  };

  // Submit post-quiz
  const handlePostQuizSubmit = () => {
    let correct = 0;
    quizQuestions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const total = quizQuestions.length;
    const score = Math.round((correct / total) * 100);
    setPostQuizResult({ score, correct, total });
    // Only mark lesson as completed if 100%
    if (score === 100 && isStudent && lesson && user) {
      completeLesson(lesson.id, user.id);
    }
    setStep('result');
  };

  // No lesson found
  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4">📖</span>
          <p className="text-gray-500 text-lg mb-4">ไม่พบบทเรียนนี้</p>
          <Link to="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">← กลับหน้าแรก</Link>
        </div>
      </div>
    );
  }

  const renderSingleMedia = (url: string, type: string, title?: string, idx?: number) => {
    switch (type) {
      case 'youtube': {
        const videoId = getYouTubeId(url);
        if (!videoId) return null;
        return (
          <div key={idx} className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🎬 {title || 'วิดีโอประกอบบทเรียน'}</h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl shadow-lg">
              <iframe src={`https://www.youtube.com/embed/${videoId}`} title="YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
            </div>
          </div>
        );
      }
      case 'google_drive': {
        const embedUrl = getGoogleDriveEmbedUrl(url);
        if (!embedUrl) return null;
        return (
          <div key={idx} className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📁 {title || 'วิดีโอจาก Google Drive'}</h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl shadow-lg">
              <iframe src={embedUrl} title="Google Drive" frameBorder="0" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
            </div>
          </div>
        );
      }
      case 'pdf':
        return (
          <div key={idx} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">📄 {title || 'เอกสารประกอบบทเรียน'}</h2>
              <div className="flex gap-2">
                <button onClick={() => setPdfFullscreen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">🔲 ดูเต็มหน้าจอ</button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">📥 ดาวน์โหลด</a>
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
              <iframe src={url} title="PDF viewer" className="w-full h-[700px]" style={{ border: 'none' }}></iframe>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderMedia = () => {
    if (lesson.media_items && lesson.media_items.length > 0) {
      return lesson.media_items.map((item, idx) => renderSingleMedia(item.url, item.type, item.title, idx));
    }
    if (!lesson.media_type || lesson.media_type === 'none' || !lesson.media_url) return null;
    return renderSingleMedia(lesson.media_url, lesson.media_type, undefined, 0);
  };

  // Quiz component (shared for pre and post)
  const renderQuiz = (title: string, subtitle: string, color: string, onSubmit: () => void) => {
    if (quizQuestions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl block mb-4">📝</span>
            <p className="text-gray-500 text-lg mb-4">ยังไม่มีข้อสอบสำหรับบทเรียนนี้</p>
            <button onClick={() => setStep('content')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">ข้าม → เข้าเนื้อหา</button>
          </div>
        </div>
      );
    }

    const q = quizQuestions[currentQ];
    const progress = ((currentQ + 1) / quizQuestions.length) * 100;

    return (
      <div className={`min-h-screen bg-gradient-to-br ${color} p-4 md:p-8`}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-5xl block mb-3">{title === 'คำถามก่อนเรียน' ? '❓' : '📝'}</span>
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-white/70 text-sm">{subtitle}</p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>ข้อ {currentQ + 1} / {quizQuestions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">{currentQ + 1}</span>
            </div>
            <p className="text-lg font-medium mb-6">{q.question_text}</p>
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].filter(opt => q[`option_${opt.toLowerCase()}` as keyof Question]).map(opt => {
                const optionText = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                const isSelected = answers[q.id] === opt;
                return (
                  <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{opt}</span>
                      <span className="text-sm">{optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentQ > 0 && (
              <button onClick={() => setCurrentQ(prev => prev - 1)}
                className="flex-1 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-2xl text-sm font-bold text-white hover:bg-white/30">← ก่อนหน้า</button>
            )}
            {currentQ < quizQuestions.length - 1 ? (
              <button onClick={() => setCurrentQ(prev => prev + 1)}
                className="flex-1 py-3 bg-white rounded-2xl text-sm font-bold text-gray-800 hover:bg-gray-100">ถัดไป →</button>
            ) : (() => {
              const allAnswered = quizQuestions.every(q => answers[q.id]);
              const unanswered = quizQuestions.filter(q => !answers[q.id]).length;
              return (
                <div className="flex-1">
                  <button onClick={onSubmit} disabled={!allAnswered}
                    className={`w-full py-3 rounded-2xl text-sm font-bold transition-all ${
                      allAnswered
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}>
                    {allAnswered ? '✅ ส่งคำตอบ' : `🔒 ยังไม่ตอบอีก ${unanswered} ข้อ`}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  // === STEP: PRE-QUIZ ===
  if (step === 'pre-quiz' && isStudent) {
    return renderQuiz(
      'คำถามก่อนเรียน',
      `ทดสอบความรู้เดิมก่อนเข้าบทเรียน "${lesson.title}"`,
      'from-blue-500 via-indigo-500 to-violet-500',
      handlePreQuizSubmit
    );
  }

  // === STEP: PRE-RESULT (score summary before lesson) ===
  if (step === 'pre-result' && preQuizResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="text-2xl font-bold mb-2">สรุปคะแนนก่อนเรียน</h1>
          <p className="text-slate-500 mb-6">บทเรียน: {lesson.title}</p>

          {/* Score Card */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-2xl">
              <p className="text-3xl font-bold text-blue-600">{preQuizResult.score}%</p>
              <p className="text-xs text-blue-400 mt-1">คะแนน</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <p className="text-3xl font-bold text-emerald-600">{preQuizResult.correct}</p>
              <p className="text-xs text-emerald-400 mt-1">ข้อถูก</p>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl">
              <p className="text-3xl font-bold text-red-600">{preQuizResult.total - preQuizResult.correct}</p>
              <p className="text-xs text-red-400 mt-1">ข้อผิด</p>
            </div>
          </div>

          {/* Message */}
          <div className={`p-4 rounded-2xl mb-6 ${
            preQuizResult.score >= 80 ? 'bg-emerald-50 border border-emerald-200' :
            preQuizResult.score >= 50 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className="text-lg font-bold">
              {preQuizResult.score >= 80 ? '🌟 ยอดเยี่ยม! คุณมีความรู้เดิมดีมาก' :
               preQuizResult.score >= 50 ? '👍 พอใช้! เรียนเพิ่มเติมในบทเรียน' :
               '📖 ไม่เป็นไร! มาเรียนรู้ไปด้วยกัน'}
            </p>
          </div>

          {/* Timer Info */}
          <div className="p-4 bg-violet-50 rounded-2xl mb-6 border border-violet-200">
            <p className="text-sm text-violet-700 font-medium">
              ⏱️ เวลาเรียนที่กำหนด: <span className="font-bold">{lesson.estimated_minutes || 5} นาที</span>
            </p>
            <p className="text-xs text-violet-500 mt-1">
              เรียนให้ครบเวลาจึงจะทำแบบทดสอบท้ายบทได้
            </p>
          </div>

          {/* Start Button */}
          <button onClick={handleStartLesson}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-lg font-bold text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl">
            🚀 เริ่มเรียนเลย!
          </button>

          <p className="text-xs text-slate-400 mt-4">
            เตรียมตัวให้พร้อม แล้วกดเริ่มเรียน!
          </p>
        </div>
      </div>
    );
  }

  // === STEP: POST-QUIZ ===
  if (step === 'post-quiz' && isStudent) {
    return renderQuiz(
      'คำถามท้ายบทเรียน',
      `ทดสอบความรู้หลังเรียน "${lesson.title}"`,
      'from-emerald-500 via-teal-500 to-cyan-500',
      handlePostQuizSubmit
    );
  }

  // === STEP: RESULT ===
  if (step === 'result' && preQuizResult && postQuizResult) {
    const improved = postQuizResult.score - preQuizResult.score;
    const noQuiz = preQuizResult.total === 0 && postQuizResult.total === 0;
    const isPassed = postQuizResult.score === 100;
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 md:p-8">
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 max-w-lg mx-auto text-center">
          <div className="text-7xl mb-4">
            {noQuiz ? '📚' : isPassed ? '🎉' : '💪'}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {noQuiz ? 'เรียนจบแล้ว!' : isPassed ? '🎉 ยอดเยี่ยม! เรียนจบแล้ว!' : 'ต้องตอบให้ถูก 100% ถึงจะเรียนจบ'}
          </h1>
          <p className="text-slate-500 mb-6">{lesson.title}</p>

          {noQuiz ? (
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 mb-6">
              <p className="text-blue-700 font-medium">📖 บทเรียนนี้ไม่มีแบบทดสอบ แต่คุณเรียนจบแล้ว!</p>
              <p className="text-sm text-blue-500 mt-2">ลองทำแบบทดสอบจากบทเรียนอื่นๆ ได้เลย</p>
            </div>
          ) : (
          <>
          {/* Pre vs Post comparison */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-2xl">
              <p className="text-xs text-blue-500 mb-1">ก่อนเรียน</p>
              <p className="text-3xl font-bold text-blue-600">{preQuizResult.score}%</p>
              <p className="text-xs text-blue-400">{preQuizResult.correct}/{preQuizResult.total} ข้อ</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <p className="text-xs text-emerald-500 mb-1">หลังเรียน</p>
              <p className="text-3xl font-bold text-emerald-600">{postQuizResult.score}%</p>
              <p className="text-xs text-emerald-400">{postQuizResult.correct}/{postQuizResult.total} ข้อ</p>
            </div>
          </div>

          {/* Pass/Fail Message */}
          {isPassed ? (
            <div className="p-4 rounded-2xl mb-4 bg-emerald-50 border border-emerald-300">
              <p className="text-lg font-bold text-emerald-700">✅ ตอบถูก 100% — ผ่าน! เรียนจบแล้ว!</p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl mb-4 bg-red-50 border border-red-300">
              <p className="text-lg font-bold text-red-700">❌ ตอบถูก {postQuizResult.correct}/{postQuizResult.total} ข้อ — ยังไม่ผ่าน</p>
              <p className="text-sm text-red-500 mt-1">ต้องตอบถูก 100% เท่านั้น ถึงจะเรียนจบ</p>
            </div>
          )}

          {/* Study time */}
          <div className="p-4 bg-violet-50 rounded-2xl mb-6 border border-violet-200">
            <p className="text-sm text-violet-600">⏱️ เวลาเรียน: <span className="font-bold">{(lesson.estimated_minutes || 5)} นาที</span> (ครบเวลาแล้ว)</p>
          </div>
          </>
          )}
        </div>

        {/* Answer Review - Post Quiz (show when lesson is completed, regardless of score) */}
        {!noQuiz && isCompleted && quizQuestions.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl p-6 max-w-3xl mx-auto mt-4">
          <h3 className="font-bold text-lg mb-4 text-left">📋 เฉลยคำตอบ คำถามท้ายบทเรียน</h3>
          <div className="space-y-4 text-left">
            {quizQuestions.map((q, idx) => {
              const userAnswer = answers[q.id] || '';
              const isCorrect = userAnswer === q.correct_answer;
              const options = [
                { key: 'A', text: q.option_a },
                { key: 'B', text: q.option_b },
                { key: 'C', text: q.option_c },
                { key: 'D', text: q.option_d },
              ].filter(o => o.text);

              return (
                <div key={q.id} className={`p-4 rounded-2xl border-2 ${
                  isCorrect ? 'border-emerald-300 bg-emerald-50/50' : 'border-red-300 bg-red-50/50'
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>{isCorrect ? '✓' : '✗'}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">ข้อ {idx + 1}. {q.question_text}</p>
                      {!isCorrect && userAnswer && (
                        <p className="text-xs text-red-600 mt-1">คำตอบของคุณ: {userAnswer} — {options.find(o => o.key === userAnswer)?.text}</p>
                      )}
                      {!isCorrect && !userAnswer && (
                        <p className="text-xs text-red-600 mt-1">ไม่ได้ตอบ</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isCorrect ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'
                    }`}>{isCorrect ? 'ถูก' : 'ผิด'}</span>
                  </div>

                  {/* Correct answer */}
                  <div className="ml-11 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {options.map(opt => (
                        <span key={opt.key} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                          opt.key === q.correct_answer ? 'bg-emerald-200 text-emerald-800 border border-emerald-400' :
                          opt.key === userAnswer && !isCorrect ? 'bg-red-200 text-red-700 line-through' : 'bg-slate-100 text-slate-500'
                        }`}>{opt.key}. {opt.text}</span>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-xl">
                        <span className="text-sm flex-shrink-0">💡</span>
                        <p className="text-xs text-blue-700">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Actions */}
        <div className="max-w-3xl mx-auto mt-6 mb-8 flex gap-3">
          {isPassed ? (
            <Link to="/student/lessons" className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-sm font-bold text-white text-center">✅ เรียนจบแล้ว — กลับหน้าบทเรียน</Link>
          ) : (
            <>
              <Link to="/student/lessons" className="flex-1 py-3 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 text-center">📘 บทเรียนของฉัน</Link>
              <button onClick={() => {
                const qs = generateQuiz(3);
                if (qs.length === 0) {
                  setStep('content');
                  return;
                }
                setQuizQuestions(qs);
                setPostQuizResult(null);
                setCurrentQ(0);
                setAnswers({});
                setStep('post-quiz');
              }}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl text-sm font-bold text-white">🔄 ลองทำใหม่ (ต้อง 100%)</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // === STEP: CONTENT ===
  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        {/* Study Timer Bar (student only) */}
        {isStudent && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                <span className="w-3 h-3 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '0.6s' }}></span>
              </div>
              <span className="text-sm font-medium text-slate-600">กำลังเรียน...</span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                isCompleted ? 'text-emerald-600 bg-emerald-50' :
                timerDone ? 'text-emerald-600 bg-emerald-50' : 'text-violet-600 bg-violet-50'
              }`}>
                {isCompleted ? '✅ เรียนจบแล้ว' : timerDone ? '⏱️ เวลาครบแล้ว' : `⏱️ ${formatTime(timeLeft)}`}
              </div>
              {preQuizResult && (
                <div className="text-xs text-slate-400">
                  Pre-Quiz: {preQuizResult.correct}/{preQuizResult.total}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-blue-600">หน้าแรก</Link>
          <span>›</span>
          <Link to={isStudent ? '/student/lessons' : '/'} className="hover:text-blue-600">{isStudent ? 'บทเรียนของฉัน' : 'หน้าแรก'}</Link>
          <span>›</span>
          <span className="text-gray-600">{lesson.title}</span>
        </div>

        {/* Lesson Header */}
        {lesson.cover_image ? (
          <div className="rounded-2xl overflow-hidden mb-8">
            <img src={lesson.cover_image} alt={lesson.title} className="w-full h-64 md:h-80 object-cover" />
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 p-8 text-white mb-8">
            <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
            <p className="text-blue-100 text-sm">{subject?.unit_code} · {subject?.unit_name}</p>
          </div>
        )}

        {/* Media Content */}
        {renderMedia()}

        {/* Text Content */}
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <div className="prose max-w-none">
            {renderMarkdown(lesson.content)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Link to={isStudent ? '/student/lessons' : '/'} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">← กลับ</Link>
          {isStudent ? (
            isCompleted ? (
              <button onClick={handleGoToPostQuiz}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-md hover:shadow-lg text-sm">
                📝 ทำแบบทดสอบท้ายบทอีกครั้ง
              </button>
            ) : timerDone ? (
              <button onClick={handleFinishLesson}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-md hover:shadow-lg text-sm">
                ✅ จบบทเรียน → ทำแบบทดสอบท้ายบท
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <button disabled
                  className="bg-slate-300 text-white font-medium py-2 px-6 rounded-xl text-sm cursor-not-allowed">
                  🔒 รอให้เวลาเรียนครบ ({formatTime(timeLeft)})
                </button>
                <p className="text-[10px] text-slate-400">เรียนให้ครบเวลาจึงจะทำข้อสอบท้ายบทได้</p>
              </div>
            )
          ) : (
            <Link to={`/quiz/${lesson.id}`} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors text-sm">✏️ ทำแบบทดสอบ</Link>
          )}
        </div>
      </div>

      {/* PDF Fullscreen Modal */}
      {pdfFullscreen && (() => {
        const pdfUrl = lesson.media_items?.find(m => m.type === 'pdf')?.url || lesson.media_url;
        if (!pdfUrl) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <span className="font-medium text-sm">{lesson.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">📥 ดาวน์โหลด</a>
                <button onClick={() => setPdfFullscreen(false)} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors">✕ ปิด (Esc)</button>
              </div>
            </div>
            <div className="flex-1">
              <iframe src={pdfUrl} title="PDF fullscreen" className="w-full h-full" style={{ border: 'none' }}></iframe>
            </div>
          </div>
        );
      })()}
    </>
  );
}
