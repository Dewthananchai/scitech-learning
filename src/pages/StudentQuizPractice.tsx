import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/AppContext';
import { ONET_SUBJECTS, M1_SUBJECTS } from '../types';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

import type { Question, QuizResult } from '../types';

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

export default function StudentQuizPractice() {
  const { category } = useParams<{ category: string }>();
  const { questions } = useAppStore();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  const isOnet = category === 'onet';
  const isM1 = category === 'm1';
  const title = isOnet ? '🎯 ข้อสอบ O-NET' : '🏫 ข้อสอบเข้า ม.1';
  const subjects = isOnet ? ONET_SUBJECTS : M1_SUBJECTS;

  const allCategoryQuestions = useMemo(() => {
    return questions.filter(q => (q as any).category === category);
  }, [questions, category]);

  const filteredBySubject = useMemo(() => {
    if (!selectedSubject) return allCategoryQuestions;
    return allCategoryQuestions.filter(q => (q as any).subject === selectedSubject);
  }, [allCategoryQuestions, selectedSubject]);

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subjects.forEach(s => { counts[s] = 0; });
    allCategoryQuestions.forEach(q => {
      const s = (q as any).subject || '';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [allCategoryQuestions, subjects]);

  const questionsData = useMemo(() => {
    const shuffled = shuffle(filteredBySubject);
    const selected = shuffled.slice(0, Math.min(numQuestions, shuffled.length));
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
  }, [filteredBySubject, numQuestions]);

  // Timer
  useState(() => {
    const timer = setInterval(() => {
      if (started && !submitted) {
        setTimeLeft(t => t > 0 ? t - 1 : 0);
      }
    }, 1000);
    return () => clearInterval(timer);
  });

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

  const passed = score >= 70;

  // Not started - show setup
  if (!started) {
    return (
      <div className="st-page min-h-screen">
        <style>{STUDENT_THEME_CSS}</style>
        <main className="p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <Link to="/student/quizzes" className="text-sm mb-4 inline-block bg-white/20 backdrop-blur text-white px-3 py-1.5 rounded-full hover:bg-white/30">← กลับหน้าข้อสอบ</Link>
            <div className="bg-white rounded-2xl shadow text-center py-10 px-6">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">{isOnet ? '🎯' : '🏫'}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
              <p className="text-gray-500 mb-6">{isOnet ? 'ทดสอบความรู้สำหรับการสอบ O-NET' : 'เตรียมความพร้อมสำหรับข้อสอบเข้า ม.1'}</p>

              {/* Subject Selection */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">เลือกวิชา (ถ้าไม่เลือกจะสุ่มทุกวิชา)</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      !selectedSubject ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >ทั้งหมด</button>
                  {subjects.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSubject(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        selectedSubject === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >{s} ({subjectCounts[s] || 0})</button>
                  ))}
                </div>
              </div>

              {/* Number of questions */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">จำนวนข้อสอบ</p>
                <div className="flex justify-center gap-2">
                  {[5, 10, 20, 30, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setNumQuestions(n)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        numQuestions === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >{n} ข้อ</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-blue-600 font-bold text-lg">{Math.min(numQuestions, filteredBySubject.length)}</p>
                  <p className="text-gray-500">จำนวนข้อ</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-green-600 font-bold text-lg">70%</p>
                  <p className="text-gray-500">เกณฑ์ผ่าน</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-orange-600 font-bold text-lg">{formatTime(timeLeft)}</p>
                  <p className="text-gray-500">เวลาจำกัด</p>
                </div>
              </div>

              {filteredBySubject.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-700 text-sm">⚠️ ยังไม่มีข้อสอบ{isOnet ? ' O-NET' : ' ข้อสอบเข้า ม.1'}{selectedSubject ? ` วิชา${selectedSubject}` : ''} กรุณาเพิ่มข้อสอบก่อน</p>
                </div>
              ) : (
                <button onClick={() => setStarted(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg transition text-lg">
                  เริ่มทำแบบทดสอบ
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Submitted - show results
  if (submitted) {
    const correctCount = results.filter(r => r.is_correct).length;
    return (
      <div className="st-page min-h-screen">
        <style>{STUDENT_THEME_CSS}</style>
        <main className="p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <div className={`rounded-2xl shadow text-center mb-6 p-8 ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {score}%
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {passed ? '🎉 ยินดีด้วย! คุณผ่านแบบทดสอบ!' : '💪 ลองใหม่อีกครั้งนะ'}
              </h1>
              <p className="text-gray-500">ตอบถูก {correctCount}/{results.length} ข้อ</p>
            </div>

            <h2 className="font-bold st-title mb-4">📋 รายละเอียดคำตอบ</h2>
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={result.question_id} className={`bg-white rounded-2xl shadow p-5 border-l-4 ${result.is_correct ? 'border-green-500' : 'border-red-500'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${result.is_correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {result.is_correct ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-2">ข้อ {idx + 1}. {result.question}</p>
                      <div className="flex items-center gap-4 text-sm mb-2">
                        <span className={result.is_correct ? 'text-green-600' : 'text-red-600'}>
                          คำตอบของคุณ: {result.user_answer || '(ไม่ได้ตอบ)'}
                        </span>
                        {!result.is_correct && <span className="text-green-600 font-medium">คำตอบที่ถูก: {result.correct_answer}</span>}
                      </div>
                      {result.explanation && (
                        <div className="bg-blue-50 rounded-lg p-3 mt-2">
                          <p className="text-sm text-blue-800">💡 <strong>คำอธิบาย:</strong> {result.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8">
              <Link to="/student/quizzes" className="px-4 py-2 rounded-lg bg-white/90 backdrop-blur text-slate-600 text-sm hover:bg-white">← กลับหน้าข้อสอบ</Link>
              <div className="flex gap-3">
                <button onClick={() => { setStarted(false); setSubmitted(false); setAnswers({}); setResults([]); setScore(0); setTimeLeft(30 * 60); }} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg">🔄 ทำใหม่</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Taking quiz
  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <main className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow mb-6 sticky top-0 z-10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-bold text-gray-800">{title}</h1>
                <p className="text-sm text-gray-400">{Object.keys(answers).length}/{questionsData.length} ข้อ</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-lg font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>⏱ {formatTime(timeLeft)}</div>
                <button onClick={handleSubmit} disabled={Object.keys(answers).length === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-6 rounded-lg">ส่งคำตอบ</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {questionsData.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">{idx + 1}</div>
                  <div>
                    <p className="font-medium text-gray-800">{q.question_text}</p>
                    {(q as any).subject && (
                      <span className="text-xs text-gray-400 mt-1 inline-block">วิชา: {(q as any).subject}</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2 ml-11">
                  {q.shuffledOptions.map((opt) => (
                    <button key={opt.label} onClick={() => handleAnswer(q.id, opt.label)} className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${answers[q.id] === opt.label ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${answers[q.id] === opt.label ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>{opt.label}</div>
                      <span className="text-sm">{opt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button onClick={handleSubmit} disabled={Object.keys(answers).length === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 px-10 rounded-lg text-lg">
              ✅ ส่งคำตอบ ({Object.keys(answers).length}/{questionsData.length} ข้อ)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
