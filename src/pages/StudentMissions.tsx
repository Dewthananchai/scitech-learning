import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMissions, useLessons, useQuestions, generateDailyMissions, useLessonProgress, getCurrentTimeSlot, MISSION_TIME_SLOTS } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import MobileHeader from '../components/MobileHeader';
import StudentSidebar from '../components/StudentSidebar';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';
import type { Mission, Question } from '../types';
import { getStarConditionStates, getTotalStarsForStudent, getStudentAwards, STAR_CONDITIONS_TOTAL } from '../lib/starAchievements';

export default function StudentMissions() {
  const { missions, completions, addMission, addCompletion, getCompletionsForStudent } = useMissions();
  const { lessons } = useLessons();
  const { questions } = useQuestions();
  const { getCompletedLessons } = useLessonProgress();
  const { user } = useAuth();

  const myGrade = user?.grade_level || 3;
  const myId = user?.id || 10;

  // Auto-generate daily missions at each time slot
  const [lastSlot, setLastSlot] = useState(() => {
    try { return localStorage.getItem('scitech_last_mission_slot') || ''; } catch { return ''; }
  });

  useEffect(() => {
    const generateForSlot = (slot: string) => {
      const completedLessonIds = getCompletedLessons(myId);
      const generated = generateDailyMissions(
        myId, myGrade, completedLessonIds, lessons, questions, missions, slot
      );
      if (generated.length > 0) {
        generated.forEach(m => addMission(m));
      }
      return generated;
    };

    // Generate for current slot on first load
    const currentSlot = getCurrentTimeSlot();
    generateForSlot(currentSlot);
    try { localStorage.setItem('scitech_last_mission_slot', currentSlot); } catch {}
    setLastSlot(currentSlot);

    // Check every 30 seconds for new time slots
    const interval = setInterval(() => {
      const now = getCurrentTimeSlot();
      if (now !== lastSlot) {
        generateForSlot(now);
        try { localStorage.setItem('scitech_last_mission_slot', now); } catch {}
        setLastSlot(now);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [myId, myGrade, lessons, questions, missions, getCompletedLessons, addMission, lastSlot]);

  // All available missions (teacher + daily)
  const allMissions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const teacherMissions = missions.filter(m => m.is_active && m.grade_level === myGrade && !m.date);
    const todayMissions = missions.filter(m => m.is_active && m.grade_level === myGrade && m.date === todayStr);
    return [...todayMissions, ...teacherMissions];
  }, [missions, myGrade]);

  // Group daily missions by time slot
  const currentSlot = getCurrentTimeSlot();
  const slotIndex = MISSION_TIME_SLOTS.indexOf(currentSlot);

  // My completions
  const myCompletions = useMemo(() => getCompletionsForStudent(myId), [getCompletionsForStudent, myId]);
  const myCompletedMissionIds = useMemo(() => new Set(myCompletions.map(c => c.mission_id)), [myCompletions]);
  // ดาวรวม = ภารกิจ + เงื่อนไข 3 ข้อ
  const totalStars = useMemo(
    () => getTotalStarsForStudent(myId, myCompletions.reduce((sum, c) => sum + c.stars_earned, 0)),
    [myCompletions, myId]
  );
  // เงื่อนไขดาว 3 ข้อ (สถานะจริง)
  const starConditions = useMemo(() => getStarConditionStates(myId), [myId, myCompletions.length]);
  const starAwards = useMemo(() => getStudentAwards(myId), [myId, myCompletions.length]);

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState<{ mission: Mission; questions: Question[] } | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ score: number; correct: number; total: number; stars: number } | null>(null);

  // Start mission quiz — random questions at the moment of starting
  const startMission = useCallback((mission: Mission) => {
    let pool: Question[] = [];

    if (mission.lesson_id) {
      // Daily mission: questions from THIS specific lesson only
      pool = questions.filter(q => q.lesson_id === mission.lesson_id && (!q.category || q.category === 'lesson'));
    } else {
      // General mission: all lesson questions
      pool = questions.filter(q => !q.category || q.category === 'lesson');
    }

    // Shuffle and pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, mission.question_count);

    if (selected.length === 0) {
      alert('ยังไม่มีข้อสอบสำหรับภารกิจนี้');
      return;
    }

    setActiveQuiz({ mission, questions: selected });
    setCurrentQ(0);
    setAnswers({});
    setShowResult(false);
    setResult(null);
  }, [questions]);

  // Answer question
  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // Submit quiz
  const handleSubmit = () => {
    if (!activeQuiz) return;

    let correct = 0;
    const answerDetails: { question_id: number; answer: string; correct: boolean }[] = [];

    activeQuiz.questions.forEach(q => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correct++;
      answerDetails.push({ question_id: q.id, answer: userAnswer, correct: isCorrect });
    });

    const total = activeQuiz.questions.length;
    const score = Math.round((correct / total) * 100);
    // Stars proportional to score: 50%+ = pass, 100% = full stars
    const starsEarned = score >= 50 ? Math.round((score / 100) * activeQuiz.mission.stars_reward) : 0;

    addCompletion({
      mission_id: activeQuiz.mission.id,
      student_id: myId,
      student_name: user?.full_name || 'Student',
      score,
      total_correct: correct,
      total_questions: total,
      stars_earned: starsEarned,
      answers: answerDetails,
    });

    setResult({ score, correct, total, stars: starsEarned });
    setShowResult(true);
  };

  // Reset quiz
  const resetQuiz = () => {
    setActiveQuiz(null);
    setCurrentQ(0);
    setAnswers({});
    setShowResult(false);
    setResult(null);
  };

  // === QUIZ VIEW ===
  if (activeQuiz && !showResult) {
    const q = activeQuiz.questions[currentQ];
    const progress = ((currentQ + 1) / activeQuiz.questions.length) * 100;

    return (
      <div className="st-page min-h-screen">
        <style>{STUDENT_THEME_CSS}</style>
        <div className="max-w-2xl mx-auto p-4 pt-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={resetQuiz} className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-slate-600 hover:text-slate-800 text-sm font-medium">← กลับหน้าภารกิจ</button>
            <div className="text-sm font-bold text-violet-700 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow">⭐ {activeQuiz.mission.stars_reward} ดาว</div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-white mb-1" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
              <span>ข้อ {currentQ + 1} / {activeQuiz.questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2">
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-sm font-bold">{currentQ + 1}</span>
            </div>
            <p className="text-lg font-medium mb-6">{q.question_text}</p>
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].filter(opt => q[`option_${opt.toLowerCase()}` as keyof Question]).map(opt => {
                const optionText = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                const isSelected = answers[q.id] === opt;
                return (
                  <button key={opt} onClick={() => handleAnswer(q.id, opt)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      isSelected ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{opt}</span>
                      <span className="text-sm">{optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            {currentQ > 0 && (
              <button onClick={() => setCurrentQ(prev => prev - 1)}
                className="flex-1 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50">← ก่อนหน้า</button>
            )}
            {currentQ < activeQuiz.questions.length - 1 ? (
              <button onClick={() => setCurrentQ(prev => prev + 1)}
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl text-sm font-bold text-white">ถัดไป →</button>
            ) : (
              <button onClick={handleSubmit}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-sm font-bold text-white">✅ ส่งคำตอบ</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === RESULT VIEW ===
  if (showResult && result) {
    return (
      <div className="st-page min-h-screen">
        <style>{STUDENT_THEME_CSS}</style>
        <div className="max-w-lg mx-auto p-4 pt-12 text-center">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="text-7xl mb-4">{result.stars > 0 ? '🏆' : '💪'}</div>
            <h2 className="text-2xl font-bold mb-2">{result.stars > 0 ? 'ยอดเยี่ยม!' : 'พยายามต่อไป!'}</h2>
            <p className="text-slate-500 mb-6">{activeQuiz?.mission.title}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-2xl">
                <p className="text-2xl font-bold text-blue-600">{result.score}%</p>
                <p className="text-xs text-blue-500">คะแนน</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl">
                <p className="text-2xl font-bold text-emerald-600">{result.correct}/{result.total}</p>
                <p className="text-xs text-emerald-500">ถูก/ทั้งหมด</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl">
                <p className="text-2xl font-bold text-amber-600">⭐ {result.stars}</p>
                <p className="text-xs text-amber-500">ดาวที่ได้</p>
              </div>
            </div>

            {result.stars > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl mb-6 border border-amber-200">
                <p className="text-lg font-bold text-amber-700">🎉 ได้รับ {result.stars} ดาว!</p>
              </div>
            )}

            <div className="text-left mb-6">
              <p className="text-sm font-bold text-slate-600 mb-3">📋 ผลการทำข้อสอบ:</p>
              {activeQuiz?.questions.map((q, idx) => {
                const userAnswer = answers[q.id] || '';
                const isCorrect = userAnswer === q.correct_answer;
                return (
                  <div key={q.id} className={`p-3 rounded-xl mb-2 text-xs ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      <span>{isCorrect ? '✅' : '❌'}</span>
                      <div className="flex-1">
                        <p className="font-medium">{idx + 1}. {q.question_text}</p>
                        {!isCorrect && <p className="text-slate-500 mt-1">คำตอบของคุณ: {userAnswer || '-'} | คำตอบที่ถูก: {q.correct_answer}</p>}
                        {q.explanation && <p className="text-blue-600 mt-1">💡 {q.explanation}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={resetQuiz}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl text-sm font-bold text-white">กลับหน้าภารกิจ</button>
          </div>
        </div>
      </div>
    );
  }

  // === MISSION LIST VIEW ===
  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="ภารกิจวันนี้" />
      <StudentSidebar />

      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-4 pb-28 md:pb-12 px-3.5 md:px-6 transition-all">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold st-title">🎯 ภารกิจพิชิตดาว</h1>
          <p className="st-sub text-xs md:text-sm mt-1">ทำภารกิจให้สำเร็จเพื่อรับดาวรางวัลและเลเวลอัป!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm opacity-90 mb-1">⭐ ดาวของฉัน</p>
            <p className="text-3xl font-bold">{totalStars}</p>
          </div>
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm opacity-90 mb-1">🎯 ภารกิจที่ทำเสร็จ</p>
            <p className="text-3xl font-bold">{myCompletions.length}</p>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm opacity-90 mb-1">📋 ภารกิจวันนี้</p>
            <p className="text-3xl font-bold">{allMissions.length}</p>
          </div>
        </div>

        {/* 🎯 เงื่อนไขการได้ดาว (3 ข้อ — สถานะจริง) */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">🎯 เงื่อนไขการได้ดาว</h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              ได้แล้ว {starAwards.reduce((s, a) => s + a.stars, 0)}/{STAR_CONDITIONS_TOTAL} ⭐
            </span>
          </div>
          <div className="space-y-2.5">
            {starConditions.map(c => (
              <div key={c.key} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                c.done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  c.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {c.done ? '✅' : c.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${c.done ? 'text-emerald-700' : 'text-slate-700'}`}>{c.label}</p>
                  <p className="text-xs text-slate-500">ความคืบหน้า: {c.progressText}</p>
                </div>
                <span className={`text-sm font-black px-2.5 py-1 rounded-xl shrink-0 ${
                  c.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {c.done ? `+${c.reward} ⭐ สำเร็จ` : `+${c.reward} ⭐`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Auto Banner */}
        <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-3xl p-6 mb-6 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎲</span>
            <div>
              <h2 className="text-xl font-bold">ภารกิจสุ่มประจำวัน</h2>
              <p className="text-white/80 text-sm">สุ่มจากบทเรียนที่เรียนจบแล้ว — สร้างใหม่ทุกช่วงเวลา!</p>
            </div>
          </div>
          {/* Time Slot Schedule */}
          <div className="flex flex-wrap gap-2 mt-3">
            {MISSION_TIME_SLOTS.map((slot, i) => {
              const isActive = slot === currentSlot;
              const isPast = i < slotIndex;
              return (
                <div key={slot} className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white text-purple-600 shadow-lg ring-2 ring-white/50' :
                  isPast ? 'bg-white/30 text-white/90' : 'bg-white/10 text-white/50'
                }`}>
                  {isActive ? '🟢' : isPast ? '✅' : '⏰'} {slot}
                </div>
              );
            })}
          </div>
          <p className="text-white/70 text-sm mt-3">ภารกิจใหม่จะปรากฏอัตโนมัติตามเวลา 07:00, 09:00, 11:00, 13:00, 15:00, 17:00</p>
        </div>

        {/* Mission List */}
        {allMissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-slate-400 text-lg">ยังไม่มีภารกิจวันนี้</p>
            <p className="text-slate-400 text-sm mt-1">ลองเปิดเรียนบทเรียนใหม่ แล้วภารกิจจะปรากฏอัตโนมัติ!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allMissions.map(m => {
              const isCompleted = myCompletedMissionIds.has(m.id);
              const completion = myCompletions.find(c => c.mission_id === m.id);
              const lessonTitle = lessons.find(l => l.id === m.lesson_id)?.title;
              const isDaily = !!m.date;

              return (
                <div key={m.id} className={`bg-white rounded-2xl shadow overflow-hidden border-l-4 ${
                  isCompleted ? 'border-l-emerald-400' : isDaily ? 'border-l-fuchsia-400' : 'border-l-violet-400'
                }`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{isCompleted ? '✅' : '🎯'}</span>
                        <div>
                          <p className="font-bold text-lg">{m.title}</p>
                          <p className="text-sm text-slate-500">{m.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
                        ⭐ {m.stars_reward} ดาว
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        📝 {m.question_count} ข้อ
                      </span>
                      {isDaily && (
                        <span className="px-3 py-1 bg-fuchsia-100 text-fuchsia-700 rounded-full text-xs font-bold">
                          🎲 สุ่มวันนี้
                        </span>
                      )}
                      {(m as any).time_slot && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                          ⏰ {(m as any).time_slot}
                        </span>
                      )}
                      {lessonTitle && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          📖 {lessonTitle}
                        </span>
                      )}
                    </div>

                    {isCompleted && completion ? (
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-600 font-bold">✅ ทำเสร็จแล้ว</span>
                          <span className="text-slate-500">ได้ {completion.total_correct}/{completion.total_questions} ข้อ</span>
                          <span className="text-amber-600 font-bold">⭐ {completion.stars_earned} ดาว</span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(completion.completed_at).toLocaleDateString('th-TH')}</span>
                      </div>
                    ) : (
                      <button onClick={() => startMission(m)}
                        className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl text-sm font-bold text-white hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-md hover:shadow-lg">
                        🚀 เริ่มทำภารกิจ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Star History */}
        {myCompletions.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow p-6">
            <h3 className="font-bold text-lg mb-4">🏆 ประวัติภารกิจ</h3>
            <div className="space-y-3">
              {myCompletions.map(c => {
                const mission = missions.find(m => m.id === c.mission_id);
                return (
                  <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">
                      {c.stars_earned > 0 ? '🏆' : '💪'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{mission?.title || `ภารกิจ #${c.mission_id}`}</p>
                      <p className="text-xs text-slate-500">{c.total_correct}/{c.total_questions} ข้อ • {c.score}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-600 font-bold">⭐ {c.stars_earned}</p>
                      <p className="text-[10px] text-slate-400">{new Date(c.completed_at).toLocaleDateString('th-TH')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
