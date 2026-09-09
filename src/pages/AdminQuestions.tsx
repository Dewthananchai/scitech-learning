import { useState, useMemo, useRef, useEffect } from 'react';
import { mockLessons, mockSubjects } from '../data/mockData';
import { useAppStore } from '../store/AppContext';
import { GRADES, ONET_SUBJECTS, M1_SUBJECTS } from '../types';
import type { Question } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import MobileHeader from '../components/MobileHeader';
import { M1BankContent } from './AdminQuestionsM1';
import { getM1BankCount } from '../data/m1BankData';
import AdminQuestionsONetBank from './AdminQuestionsONetBank';
import { getOnetBankCount } from '../data/onetBankData';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

// ===== CSV Parser =====
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(current.trim()); current = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        if (row.some(c => c !== '')) lines.push(row);
        row = []; current = '';
        if (ch === '\r') i++;
      } else { current += ch; }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== '')) lines.push(row);
  return lines;
}

function mapHeaderToField(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
  const map: Record<string, string> = {
    'คำถาม': 'question_text', 'question': 'question_text', 'questiontext': 'question_text',
    'ตัวเลือกA': 'option_a', 'optiona': 'option_a', 'A': 'option_a',
    'ตัวเลือกB': 'option_b', 'optionb': 'option_b', 'B': 'option_b',
    'ตัวเลือกC': 'option_c', 'optionc': 'option_c', 'C': 'option_c',
    'ตัวเลือกD': 'option_d', 'optiond': 'option_d', 'D': 'option_d',
    'เฉลย': 'correct_answer', 'answer': 'correct_answer',
    'คำอธิบาย': 'explanation', 'explanation': 'explanation',
    'ระดับความยาก': 'difficulty', 'difficulty': 'difficulty',
    'ชั้นเรียน': 'grade_level', 'grade': 'grade_level',
    'หน่วยการเรียนรู้': 'unit_name', 'unit': 'unit_name',
    'รหัสหน่วย': 'unit_code', 'unitcode': 'unit_code',
    'กลุ่มสาระ': 'subject_unit_id', 'subject': 'subject_unit_id',
    'บทเรียน': 'lesson_id', 'lesson': 'lesson_id',
    'วิชา': 'subject',
  };
  return map[h] || h;
}

function resolveSubjectId(unitName: string, unitCode: string, gradeLevel: string): number {
  if (unitCode) {
    const byCode = mockSubjects.find(s => s.unit_code.toUpperCase() === unitCode.toUpperCase());
    if (byCode) return byCode.id;
  }
  if (unitName) {
    const byName = mockSubjects.find(s => s.unit_name.includes(unitName) || unitName.includes(s.unit_name));
    if (byName) return byName.id;
  }
  if (gradeLevel) {
    const gradeNum = Number(gradeLevel);
    const firstSubject = mockSubjects.find(s => s.grade_level === gradeNum);
    if (firstSubject) return firstSubject.id;
  }
  return 1;
}

// ===== Tab Config =====
type TabKey = 'lesson' | 'onet' | 'm1';

const TABS: { key: TabKey; label: string; icon: string; color: string }[] = [
  { key: 'lesson', label: 'ข้อสอบในชั้นเรียน', icon: '📝', color: 'from-amber-400 to-orange-500' },
  { key: 'onet', label: 'ข้อสอบ O-NET', icon: '🎯', color: 'from-rose-400 to-pink-500' },
  { key: 'm1', label: 'ข้อสอบเข้า ม.1', icon: '🏫', color: 'from-sky-400 to-blue-500' },
];

// ===== CSV Samples =====
const LESSON_SAMPLE = `คำถาม,ตัวเลือก A,ตัวเลือก B,ตัวเลือก C,ตัวเลือก D,เฉลย,คำอธิบาย,ระดับความยาก,ชั้นเรียน,หน่วยการเรียนรู้
"ข้อใดไม่ใช่สิ่งมีชีวิต?","แมว","ต้นไม้","ก้อนหิน","ปลา","C","ก้อนหินไม่ใช่สิ่งมีชีวิต",1,1,U.1
"ข้อใดจัดเป็นสิ่งมีชีวิตได้ถูกต้อง?","น้ำ","ดิน","ผีเสื้อ","หิน","C","ผีเสื้อเป็นสัตว์ที่มีชีวิต",1,1,U.1
"ลักษณะใดที่สิ่งมีชีวิตทุกชนิดมีร่วมกัน?","บินได้","มีสี","หายใจ","ว่ายน้ำได้","C","สิ่งมีชีวิตทุกชนิดต้องหายใจ",1,1,U.1`;

const ONET_SAMPLE = `คำถาม,ตัวเลือก A,ตัวเลือก B,ตัวเลือก C,ตัวเลือก D,เฉลย,คำอธิบาย,ระดับความยาก,วิชา
"ข้อใดเป็นธาตุ?","น้ำ","อากาศ","ทองแดง","เกลือ","C","ทองแดงเป็นธาตุ",2,"วิทยาศาสตร์"
"1 + 2 เท่ากับ多少?","2","3","4","5","C","บวกเลขง่ายๆ",1,"คณิตศาสตร์"
"คำว่า 'beautiful' แปลว่าอะไร?","สวย","ใหญ่","เร็ว","สูง","A","Beautiful แปลว่า สวย",1,"ภาษาอังกฤษ"`;

const M1_SAMPLE = `คำถาม,ตัวเลือก A,ตัวเลือก B,ตัวเลือก C,ตัวเลือก D,เฉลย,คำอธิบาย,ระดับความยาก,วิชา
"ข้อใดเป็นสสาร?","แสง","อากาศ","น้ำ","เสียง","C","น้ำเป็นสสาร",2,"วิทยาศาสตร์"
"5 x 3 เท่ากับ多少?","15","8","20","12","A","คูณเลขง่ายๆ",1,"คณิตศาสตร์"
"คำว่า 'school' แปลว่าอะไร?","โรงเรียน","บ้าน","สนาม","ถนน","A","School แปลว่า โรงเรียน",1,"ภาษาอังกฤษ"`;

// ===== Helper: subject color =====
const subjectColor = (s: string): string => {
  const colors: Record<string, string> = {
    'วิทยาศาสตร์': 'bg-emerald-100 text-emerald-700',
    'คณิตศาสตร์': 'bg-blue-100 text-blue-700',
    'ภาษาไทย': 'bg-purple-100 text-purple-700',
    'ภาษาอังกฤษ': 'bg-amber-100 text-amber-700',
    'สังคมศึกษา': 'bg-rose-100 text-rose-700',
  };
  return colors[s] || 'bg-slate-100 text-slate-700';
};

const difficultyLabel = (d: number) => d === 1 ? 'ง่าย' : d === 2 ? 'ปานกลาง' : 'ยาก';
const difficultyColor = (d: number) => d === 1 ? 'bg-green-100 text-green-700' : d === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

// ===== Main Component =====
export default function AdminQuestions() {
  const { questions, addQuestion, addQuestionsBatch, updateQuestion, deleteQuestion, deleteQuestionsByCategory } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('lesson');

  // === Lesson Questions State ===
  const [lessonShowForm, setLessonShowForm] = useState(false);
  const [lessonShowImport, setLessonShowImport] = useState(false);
  const [lessonEditId, setLessonEditId] = useState<number | null>(null);
  const [lessonImportData, setLessonImportData] = useState<any[]>([]);
  const [lessonImportFileName, setLessonImportFileName] = useState('');
  const [lessonImportError, setLessonImportError] = useState('');
  const [lessonImporting, setLessonImporting] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const lessonFileRef = useRef<HTMLInputElement>(null);
  const [lessonForm, setLessonForm] = useState({
    question_text: '', lesson_id: '', subject_unit_id: '', grade_level: '',
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', explanation: '', difficulty: 1,
  });

  // === O-NET / M1 Form State ===
  const [examForm, setExamForm] = useState({
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '', difficulty: 2 as 1 | 2 | 3, subject: '',
  });
  const [examShowForm, setExamShowForm] = useState(false);
  const [examEditId, setExamEditId] = useState<number | null>(null);
  const [examSelectedSubject, setExamSelectedSubject] = useState<string | null>(null);

  // === M1 bank (localStorage คลังข้อสอบเข้า ม.1) ===
  const [m1BankCount, setM1BankCount] = useState(() => getM1BankCount());
  useEffect(() => {
    const refresh = () => setM1BankCount(getM1BankCount());
    window.addEventListener('m1-bank-updated', refresh);
    return () => window.removeEventListener('m1-bank-updated', refresh);
  }, []);

  // === O-NET bank (localStorage คลังข้อสอบ O-NET) ===
  const [onetBankCount, setOnetBankCount] = useState(() => getOnetBankCount());
  useEffect(() => {
    const refresh = () => setOnetBankCount(getOnetBankCount());
    window.addEventListener('onet-bank-updated', refresh);
    return () => window.removeEventListener('onet-bank-updated', refresh);
  }, []);

  // === Computed: lesson questions ===
  const lessonQuestions = useMemo(() => questions.filter(q => !q.category || q.category === 'lesson'), [questions]);

  const getGradeForQuestion = (q: Question): number => {
    const subject = mockSubjects.find(s => s.id === q.subject_unit_id);
    return subject?.grade_level || 0;
  };

  const filteredLessonQuestions = useMemo(() => {
    let result = lessonQuestions;
    if (selectedGrade !== null) result = result.filter(q => getGradeForQuestion(q) === selectedGrade);
    if (selectedUnit !== null) result = result.filter(q => q.subject_unit_id === selectedUnit);
    return result;
  }, [lessonQuestions, selectedGrade, selectedUnit]);

  const gradeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    lessonQuestions.forEach(q => { const g = getGradeForQuestion(q); counts[g] = (counts[g] || 0) + 1; });
    return counts;
  }, [lessonQuestions]);

  const gradeSubjects = useMemo(() => selectedGrade !== null ? mockSubjects.filter(s => s.grade_level === selectedGrade) : [], [selectedGrade]);

  const unitCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    lessonQuestions.forEach(q => {
      const g = getGradeForQuestion(q);
      if (selectedGrade !== null && g !== selectedGrade) return;
      counts[q.subject_unit_id] = (counts[q.subject_unit_id] || 0) + 1;
    });
    return counts;
  }, [lessonQuestions, selectedGrade]);

  // === Computed: onet/m1 questions ===
  const onetQuestions = useMemo(() => questions.filter(q => q.category === 'onet'), [questions]);
  const m1Questions = useMemo(() => questions.filter(q => q.category === 'm1'), [questions]);

  const currentExamQuestions = activeTab === 'onet' ? onetQuestions : m1Questions;
  const currentSubjects = activeTab === 'onet' ? ONET_SUBJECTS : M1_SUBJECTS;
  const currentCategory = activeTab as 'onet' | 'm1';

  const filteredExamQuestions = useMemo(() => {
    if (!examSelectedSubject) return currentExamQuestions;
    return currentExamQuestions.filter(q => q.subject === examSelectedSubject);
  }, [currentExamQuestions, examSelectedSubject]);

  const examSubjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentSubjects.forEach(s => { counts[s] = 0; });
    currentExamQuestions.forEach(q => {
      const s = q.subject || '';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [currentExamQuestions, currentSubjects]);

  // === Lesson form helpers ===
  const formGrade = lessonForm.grade_level ? Number(lessonForm.grade_level) : null;
  const filteredSubjects = formGrade ? mockSubjects.filter(s => s.grade_level === formGrade) : mockSubjects;
  const filteredLessons = formGrade ? mockLessons.filter(l => { const s = mockSubjects.find(su => su.id === l.subject_unit_id); return s?.grade_level === formGrade; }) : mockLessons;

  const resetLessonForm = () => setLessonForm({ question_text: '', lesson_id: '', subject_unit_id: '', grade_level: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', difficulty: 1 });

  const updateLessonField = (field: string, value: string | number) => {
    setLessonForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'grade_level') { next.lesson_id = ''; next.subject_unit_id = ''; }
      if (field === 'subject_unit_id') { next.lesson_id = ''; }
      return next;
    });
  };

  const handleLessonSubmit = () => {
    if (!lessonForm.question_text || !lessonForm.option_a || !lessonForm.option_b) { alert('กรุณากรอกข้อมูลที่จำเป็น'); return; }
    const qData = {
      subject_unit_id: Number(lessonForm.subject_unit_id) || 1,
      lesson_id: Number(lessonForm.lesson_id) || undefined,
      question_text: lessonForm.question_text,
      question_type: 'multiple_choice' as const,
      option_a: lessonForm.option_a, option_b: lessonForm.option_b,
      option_c: lessonForm.option_c, option_d: lessonForm.option_d,
      correct_answer: lessonForm.correct_answer, explanation: lessonForm.explanation,
      difficulty: lessonForm.difficulty, is_active: true,
    };
    if (lessonEditId) { updateQuestion(lessonEditId, qData); } else { addQuestion(qData); }
    setLessonShowForm(false); setLessonEditId(null); resetLessonForm();
  };

  const handleLessonEdit = (q: Question) => {
    const grade = getGradeForQuestion(q);
    setLessonEditId(q.id);
    setLessonForm({
      question_text: q.question_text, lesson_id: String(q.lesson_id || ''),
      subject_unit_id: String(q.subject_unit_id), grade_level: String(grade),
      option_a: q.option_a || '', option_b: q.option_b || '',
      option_c: q.option_c || '', option_d: q.option_d || '',
      correct_answer: q.correct_answer, explanation: q.explanation || '', difficulty: q.difficulty,
    });
    setLessonShowForm(true);
  };

  // === Exam form helpers ===
  const resetExamForm = () => {
    setExamForm({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', difficulty: 2, subject: '' });
    setExamEditId(null);
    setExamShowForm(false);
  };

  const handleExamSubmit = () => {
    if (!examForm.question_text || !examForm.option_a || !examForm.option_b) {
      alert('กรุณากรอกคำถามและตัวเลือก A, B ให้ครบถ้วน');
      return;
    }
    if (!examForm.subject) {
      alert('กรุณาเลือกวิชา')
      return;
    }
    const q = {
      subject_unit_id: 0, lesson_id: 0,
      question_text: examForm.question_text,
      question_type: 'multiple_choice' as const,
      option_a: examForm.option_a, option_b: examForm.option_b,
      option_c: examForm.option_c, option_d: examForm.option_d,
      correct_answer: examForm.correct_answer, explanation: examForm.explanation,
      difficulty: examForm.difficulty, is_active: true,
      category: currentCategory,
      subject: examForm.subject,
    };
    if (examEditId) { updateQuestion(examEditId, q); } else { addQuestion(q); }
    resetExamForm();
  };

  const handleExamEdit = (q: Question) => {
    setExamForm({
      question_text: q.question_text, option_a: q.option_a || '', option_b: q.option_b || '',
      option_c: q.option_c || '', option_d: q.option_d || '',
      correct_answer: (q.correct_answer as 'A' | 'B' | 'C' | 'D') || 'A',
      explanation: q.explanation || '', difficulty: (q.difficulty as 1 | 2 | 3) || 2,
      subject: q.subject || '',
    });
    setExamEditId(q.id);
    setExamShowForm(true);
  };

  // === CSV Import (Lesson) ===
  const handleLessonFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLessonImportFileName(file.name); setLessonImportError(''); setLessonImportData([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length < 2) { setLessonImportError('ไฟล์ไม่มีข้อมูล'); return; }
        const headers = rows[0]; const fieldMap = headers.map(mapHeaderToField);
        const parsed: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]; if (row.every(c => c === '')) continue;
          const get = (field: string) => { const idx = fieldMap.indexOf(field); return idx >= 0 ? (row[idx] || '').trim() : ''; };
          parsed.push({ question_text: get('question_text'), option_a: get('option_a'), option_b: get('option_b'), option_c: get('option_c'), option_d: get('option_d'), correct_answer: (get('correct_answer') || 'A').toUpperCase().slice(0, 1), explanation: get('explanation'), difficulty: parseInt(get('difficulty')) || 1, grade_level: get('grade_level'), subject_unit_id: get('unit_code') || get('unit_name') || get('subject_unit_id'), lesson_id: get('lesson_id') });
        }
        if (parsed.length === 0) { setLessonImportError('ไม่พบข้อสอบที่ถูกต้อง'); return; }
        setLessonImportData(parsed);
      } catch { setLessonImportError('ไม่สามารถอ่านไฟล์ได้'); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleLessonImport = () => {
    setLessonImporting(true);
    const newQs = lessonImportData.map(q => {
      const subjectId = resolveSubjectId(q.subject_unit_id, q.subject_unit_id, q.grade_level);
      let lessonId = Number(q.lesson_id) || undefined;
      if (!lessonId && q.lesson_id) { const found = mockLessons.find(l => l.title.includes(q.lesson_id)); lessonId = found?.id; }
      return { subject_unit_id: subjectId, lesson_id: lessonId, question_text: q.question_text, question_type: 'multiple_choice' as const, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer, explanation: q.explanation, difficulty: Math.min(Math.max(q.difficulty, 1), 3), is_active: true };
    });
    addQuestionsBatch(newQs);
    setTimeout(() => { setLessonImporting(false); setLessonShowImport(false); setLessonImportData([]); setLessonImportFileName(''); alert(`นำเข้าสำเร็จ ${newQs.length} ข้อ!`); }, 500);
  };

  // === CSV Import (Exam) ===
  const handleExamImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      const header = lines[0];
      const hasSubject = header.includes('วิชา');
      lines.slice(1).forEach(line => {
        const cols = line.match(/(".*?"|[^,]+)/g) || [];
        const clean = (s: string) => s.replace(/^"|"$/g, '').trim();
        addQuestion({
          question_text: clean(cols[0] || ''), option_a: clean(cols[1] || ''),
          option_b: clean(cols[2] || ''), option_c: clean(cols[3] || ''),
          option_d: clean(cols[4] || ''), correct_answer: clean(cols[5] || 'A'),
          explanation: clean(cols[6] || ''), difficulty: parseInt(clean(cols[7] || '2')),
          subject: hasSubject ? clean(cols[8] || '') : '',
          lesson_id: 0, subject_unit_id: 0,
          question_type: 'multiple_choice', is_active: true,
          category: currentCategory,
        });
      });
    };
    reader.readAsText(file); e.target.value = '';
  };

  // === CSV Download ===
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  // === Tab change: reset form states ===
  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setLessonShowForm(false); setLessonShowImport(false);
    setExamShowForm(false); setExamEditId(null); setExamSelectedSubject(null);
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <MobileHeader title="คลังข้อสอบ" />
      <AdminSidebar />
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-amber-900/5 border border-amber-100 overflow-hidden bg-white">
          {/* Amber Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-amber-100 text-xs font-semibold mb-2">
                  <span>🎯 ระบบคลังแบบทดสอบและข้อสอบ</span>
                  <span>•</span>
                  <span>รวม {lessonQuestions.length + onetBankCount + m1BankCount} ข้อ</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>📄 จัดการคลังข้อสอบ</span>
                </h1>
                <p className="text-amber-100/90 text-xs md:text-sm mt-1">
                  ข้อสอบในชั้นเรียน ป.1-ป.6 · ข้อสอบ O-NET · ข้อสอบเข้า ม.1
                </p>
              </div>
            </div>
          </div>

          {/* Subtabs Bar */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 md:px-6 py-3 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {TABS.map(tab => {
                const count = tab.key === 'lesson' ? lessonQuestions.length : tab.key === 'onet' ? onetBankCount : m1BankCount;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => switchTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 md:p-6">
            {/* ===== TAB: ข้อสอบในชั้นเรียน ===== */}
            {activeTab === 'lesson' && (
              <LessonTab
                questions={filteredLessonQuestions}
                totalQuestions={lessonQuestions}
                showForm={lessonShowForm}
                editId={lessonEditId}
                form={lessonForm}
                formGrade={formGrade}
                filteredSubjects={filteredSubjects}
                filteredLessons={filteredLessons}
                selectedGrade={selectedGrade}
                selectedUnit={selectedUnit}
                gradeCounts={gradeCounts}
                gradeSubjects={gradeSubjects}
                unitCounts={unitCounts}
                showImport={lessonShowImport}
                importData={lessonImportData}
                importFileName={lessonImportFileName}
                importError={lessonImportError}
                importing={lessonImporting}
                fileRef={lessonFileRef}
                getGradeForQuestion={getGradeForQuestion}
                onToggleForm={() => { setLessonShowForm(!lessonShowForm); setLessonEditId(null); resetLessonForm(); setLessonShowImport(false); }}
                onToggleImport={() => { setLessonShowImport(!lessonShowImport); setLessonForm(prev => prev); }}
                onUpdateField={updateLessonField}
                onSubmit={handleLessonSubmit}
                onEdit={handleLessonEdit}
                onDelete={(id) => { if (confirm('ต้องการลบข้อสอบนี้?')) deleteQuestion(id); }}
                onSetGrade={(g) => { setSelectedGrade(g); setSelectedUnit(null); }}
                onSetUnit={setSelectedUnit}
                onFileSelect={handleLessonFileSelect}
                onImport={handleLessonImport}
                onDownloadSample={() => downloadCSV(LESSON_SAMPLE, 'sample_questions.csv')}
                onCancelForm={() => { setLessonShowForm(false); setLessonEditId(null); }}
                onCancelImport={() => { setLessonShowImport(false); setLessonImportData([]); setLessonImportError(''); }}
              />
            )}

            {/* ===== TAB: O-NET (คลังข้อสอบแบบตัวอย่าง) ===== */}
            {activeTab === 'onet' && <AdminQuestionsONetBank />}

            {/* ===== TAB: ข้อสอบเข้า ม.1 (คลังข้อสอบแบบตัวอย่าง: นำเข้า/โรงเรียน&ปี/รายการ) ===== */}
            {activeTab === 'm1' && <M1BankContent />}
          </div>
        </div>
      </main>
    </div>
  );
}

// ========================================
// SUB-COMPONENTS
// ========================================

// === Lesson Tab ===
function LessonTab(props: {
  questions: Question[]; totalQuestions: Question[];
  showForm: boolean; editId: number | null; form: any;
  formGrade: number | null; filteredSubjects: any[]; filteredLessons: any[];
  selectedGrade: number | null; selectedUnit: number | null;
  gradeCounts: Record<number, number>; gradeSubjects: any[]; unitCounts: Record<number, number>;
  showImport: boolean; importData: any[]; importFileName: string; importError: string; importing: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  getGradeForQuestion: (q: Question) => number;
  onToggleForm: () => void; onToggleImport: () => void;
  onUpdateField: (f: string, v: string | number) => void; onSubmit: () => void;
  onEdit: (q: Question) => void; onDelete: (id: number) => void;
  onSetGrade: (g: number | null) => void; onSetUnit: (u: number | null) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; onImport: () => void;
  onDownloadSample: () => void; onCancelForm: () => void; onCancelImport: () => void;
}) {
  const { questions, totalQuestions, showForm, editId, form, formGrade, filteredSubjects, filteredLessons,
    selectedGrade, selectedUnit, gradeCounts, gradeSubjects, unitCounts,
    showImport, importData, importFileName, importError, importing, fileRef,
    getGradeForQuestion, onToggleForm, onToggleImport, onUpdateField, onSubmit, onEdit, onDelete,
    onSetGrade, onSetUnit, onFileSelect, onImport, onDownloadSample, onCancelForm, onCancelImport } = props;

  return (
    <>
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={onToggleImport} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm">📁 นำเข้าจากไฟล์</button>
        <button onClick={onDownloadSample} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2 px-4 rounded-xl transition-colors text-sm">⬇ ตัวอย่าง CSV</button>
        <button onClick={onToggleForm} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm">
          {showForm ? '✕ ปิด' : '+ เพิ่มข้อสอบใหม่'}
        </button>
      </div>

      {/* Import Section */}
      {showImport && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-lg">📁 นำเข้าข้อสอบจากไฟล์</h2>
            <button onClick={onCancelImport} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer">
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFileSelect} className="hidden" />
            <span className="text-4xl block mb-2">📤</span>
            <p className="text-gray-600 font-medium">คลิกเพื่อเลือกไฟล์ CSV</p>
            {importFileName && <p className="text-sm text-green-600 mt-2 font-medium">📄 {importFileName}</p>}
          </div>
          {importError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4"><p className="text-sm text-red-600">❌ {importError}</p></div>}
          {importData.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">📋 ตัวอย่าง ({importData.length} ข้อ)</h3>
                <button onClick={onImport} disabled={importing} className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-6 rounded-lg text-sm">
                  {importing ? '⏳ กำลังนำเข้า...' : `✅ ยืนยันนำเข้า ${importData.length} ข้อ`}
                </button>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">คำถาม</th><th className="px-3 py-2 text-left">A</th><th className="px-3 py-2 text-left">B</th><th className="px-3 py-2 text-left">เฉลย</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importData.slice(0, 20).map((q: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{q.question_text}</td>
                        <td className="px-3 py-2">{q.option_a}</td>
                        <td className="px-3 py-2">{q.option_b}</td>
                        <td className="px-3 py-2"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{q.correct_answer}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-2 border-blue-200">
          <h2 className="font-bold text-gray-800 mb-4">{editId ? 'แก้ไขข้อสอบ' : 'เพิ่มข้อสอบใหม่'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">คำถาม *</label>
              <textarea value={form.question_text} onChange={e => onUpdateField('question_text', e.target.value)} placeholder="พิมพ์คำถามที่นี่..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชั้นเรียน *</label>
              <select value={form.grade_level} onChange={e => onUpdateField('grade_level', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                <option value="">เลือกชั้นเรียน</option>
                {GRADES.map(g => <option key={g.level} value={g.level}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มสาระ/หน่วย *</label>
              <select value={form.subject_unit_id} onChange={e => onUpdateField('subject_unit_id', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                <option value="">เลือกกลุ่มสาระ</option>
                {filteredSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.unit_code} - {s.unit_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เชื่อมกับบทเรียน</label>
              <select value={form.lesson_id} onChange={e => onUpdateField('lesson_id', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                <option value="">ไม่เชื่อม</option>
                {filteredLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความยาก</label>
              <select value={form.difficulty} onChange={e => onUpdateField('difficulty', parseInt(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                <option value={1}>ง่าย</option><option value={2}>ปานกลาง</option><option value={3}>ยาก</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ตัวเลือก A *</label>
              <input type="text" value={form.option_a} onChange={e => onUpdateField('option_a', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ตัวเลือก B *</label>
              <input type="text" value={form.option_b} onChange={e => onUpdateField('option_b', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ตัวเลือก C</label>
              <input type="text" value={form.option_c} onChange={e => onUpdateField('option_c', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ตัวเลือก D</label>
              <input type="text" value={form.option_d} onChange={e => onUpdateField('option_d', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">คำตอบที่ถูก *</label>
              <select value={form.correct_answer} onChange={e => onUpdateField('correct_answer', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบายเฉลย</label>
            <textarea value={form.explanation} onChange={e => onUpdateField('explanation', e.target.value)} placeholder="อธิบายเหตุผลที่คำตอบถูกต้อง..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onCancelForm} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">ยกเลิก</button>
            <button onClick={onSubmit} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">{editId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อสอบ'}</button>
          </div>
        </div>
      )}

      {/* Grade Filter */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600 mr-2">ชั้นเรียน:</span>
          <button onClick={() => onSetGrade(null)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedGrade === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>ทั้งหมด ({totalQuestions.length})</button>
          {GRADES.map(g => (
            <button key={g.level} onClick={() => onSetGrade(selectedGrade === g.level ? null : g.level)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedGrade === g.level ? 'bg-blue-600 text-white' : `${g.color} hover:shadow-sm`}`}>
              {g.label} ({gradeCounts[g.level] || 0})
            </button>
          ))}
        </div>
        {selectedGrade !== null && gradeSubjects.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-600 mr-2">หน่วย:</span>
            <button onClick={() => onSetUnit(null)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedUnit === null ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>ทั้งหมด</button>
            {gradeSubjects.map((s: any) => (
              <button key={s.id} onClick={() => onSetUnit(selectedUnit === s.id ? null : s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedUnit === s.id ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                {s.unit_code} {s.unit_name} ({unitCounts[s.id] || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Questions Mobile */}
      <div className="md:hidden space-y-3 mb-4">
        {questions.map((q) => {
          const grade = getGradeForQuestion(q); const gradeInfo = GRADES.find(g => g.level === grade);
          return (
            <div key={q.id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {selectedGrade === null && gradeInfo && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeInfo.color}`}>{gradeInfo.label}</span>}
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{mockSubjects.find(s => s.id === q.subject_unit_id)?.unit_code || '-'}</span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">{q.correct_answer}</span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{q.question_text}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${difficultyColor(q.difficulty)}`}>{difficultyLabel(q.difficulty)}</span>
              </div>
              <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => onEdit(q)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">✏️ แก้ไข</button>
                <button onClick={() => onDelete(q.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">🗑️ ลบ</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Questions Table Desktop */}
      <div className="bg-white rounded-2xl shadow hidden md:block">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📝</span>
            <p className="text-gray-500">{selectedGrade !== null ? `ยังไม่มีข้อสอบสำหรับชั้น ป.${selectedGrade}` : 'ยังไม่มีข้อสอบในระบบ'}</p>
            <button onClick={onToggleForm} className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ เพิ่มข้อสอบใหม่</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 w-8">#</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">คำถาม</th>
                  {selectedGrade === null && <th className="text-left py-3 px-3 font-medium text-gray-500">ชั้น</th>}
                  <th className="text-left py-3 px-3 font-medium text-gray-500">หน่วย</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">เฉลย</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">ระดับ</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => {
                  const grade = getGradeForQuestion(q); const gradeInfo = GRADES.find(g => g.level === grade);
                  return (
                    <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-3 max-w-[250px] truncate">{q.question_text}</td>
                      {selectedGrade === null && <td className="py-3 px-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${gradeInfo?.color || ''}`}>{gradeInfo?.label || '-'}</span></td>}
                      <td className="py-3 px-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">{mockSubjects.find(s => s.id === q.subject_unit_id)?.unit_code || '-'}</span></td>
                      <td className="py-3 px-3"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{q.correct_answer}</span></td>
                      <td className="py-3 px-3"><span className={`px-2 py-1 rounded-full text-xs ${difficultyColor(q.difficulty)}`}>{difficultyLabel(q.difficulty)}</span></td>
                      <td className="py-3 px-3 text-center">
                        <button onClick={() => onEdit(q)} className="text-blue-600 hover:text-blue-800 text-xs mr-2 font-medium">✏️ แก้ไข</button>
                        <button onClick={() => onDelete(q.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">🗑️ ลบ</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// === Exam Tab (O-NET / M1) ===
function ExamTab(props: {
  category: 'onet' | 'm1';
  tabLabel: string;
  questions: Question[];
  allQuestions: Question[];
  subjects: string[];
  subjectCounts: Record<string, number>;
  selectedSubject: string | null;
  showForm: boolean;
  editId: number | null;
  form: any;
  onSetSubject: (s: string | null) => void;
  onUpdateForm: (updates: Partial<any>) => void;
  onSubmit: () => void;
  onEdit: (q: Question) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  onToggleForm: () => void;
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadSample: () => void;
}) {
  const { category, tabLabel, questions, allQuestions, subjects, subjectCounts, selectedSubject,
    showForm, editId, form, onSetSubject, onUpdateForm, onSubmit, onEdit, onDelete, onClearAll,
    onToggleForm, onImportCSV, onDownloadSample } = props;

  const emoji = category === 'onet' ? '🎯' : '🏫';

  return (
    <>
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allQuestions.length > 0 && (
          <button onClick={onClearAll} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors">
            🗑️ ล้างทั้งหมด ({allQuestions.length})
          </button>
        )}
        <button onClick={onDownloadSample} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors">⬇ ตัวอย่าง CSV</button>
        <label className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 cursor-pointer transition-colors">
          📁 นำเข้าจากไฟล์
          <input type="file" accept=".csv" className="hidden" onChange={onImportCSV} />
        </label>
        <button onClick={onToggleForm} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors">+ เพิ่มข้อสอบใหม่</button>
      </div>

      {/* Subject Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => onSetSubject(null)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border ${!selectedSubject ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
          ทั้งหมด ({allQuestions.length})
        </button>
        {subjects.map(s => (
          <button key={s} onClick={() => onSetSubject(s)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border ${selectedSubject === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {s} ({subjectCounts[s] || 0})
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-2 border-blue-200">
          <h3 className="font-semibold mb-4">{editId ? 'แก้ไขข้อสอบ' : `เพิ่มข้อสอบ${tabLabel}ใหม่`}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">วิชา *</label>
              <select value={form.subject} onChange={e => onUpdateForm({ subject: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                <option value="">เลือกวิชา</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">ระดับความยาก</label>
              <select value={form.difficulty} onChange={e => onUpdateForm({ difficulty: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                <option value={1}>ง่าย</option>
                <option value={2}>ปานกลาง</option>
                <option value={3}>ยาก</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium block mb-1">คำถาม *</label>
              <textarea rows={2} value={form.question_text} onChange={e => onUpdateForm({ question_text: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="พิมพ์คำถาม..." />
            </div>
            {(['A', 'B', 'C', 'D'] as const).map(opt => (
              <div key={opt}>
                <label className="text-sm font-medium block mb-1">ตัวเลือก {opt} {opt === 'A' || opt === 'B' ? '*' : ''}</label>
                <input value={form[`option_${opt.toLowerCase()}` as keyof typeof form] as string} onChange={e => onUpdateForm({ [`option_${opt.toLowerCase()}`]: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder={`ตัวเลือก ${opt}`} />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium block mb-1">เฉลย *</label>
              <select value={form.correct_answer} onChange={e => onUpdateForm({ correct_answer: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                {['A', 'B', 'C', 'D'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-red-600 block mb-1">* ต้องเลือกวิชาตามタブด้านบนก่อนจึงจะบันทึกได้</label>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium block mb-1">คำอธิบายเฉลย</label>
              <textarea rows={2} value={form.explanation} onChange={e => onUpdateForm({ explanation: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="อธิบายเหตุผลของเฉลย..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { onUpdateForm({}); onToggleForm(); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
            <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">💾 บันทึก</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold">{emoji} {tabLabel} ({questions.length} ข้อ)</p>
        </div>
        {questions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">{emoji}</p>
            <p>ยังไม่มี{tabLabel}</p>
            <p className="text-sm mt-1">กดปุ่ม "เพิ่มข้อสอบใหม่" หรือ "นำเข้าจากไฟล์" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">#</th>
                  <th className="px-4 py-3 font-medium text-slate-500">วิชา</th>
                  <th className="px-4 py-3 font-medium text-slate-500">คำถาม</th>
                  <th className="px-4 py-3 font-medium text-slate-500">เฉลย</th>
                  <th className="px-4 py-3 font-medium text-slate-500">ระดับ</th>
                  <th className="px-4 py-3 font-medium text-slate-500">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questions.map((q, i) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${q.subject ? subjectColor(q.subject) : 'bg-slate-100 text-slate-500'}`}>
                        {q.subject || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="truncate">{q.question_text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">{q.correct_answer}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColor(q.difficulty || 2)}`}>{difficultyLabel(q.difficulty || 2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(q)} className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100">✏️ แก้ไข</button>
                        <button onClick={() => onDelete(q.id)} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">🗑️ ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
