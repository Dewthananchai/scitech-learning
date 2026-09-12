import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import type { Question, LessonMedia } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import TeacherMobileHeader from '../components/TeacherMobileHeader';
import TeacherBottomNav from '../components/TeacherBottomNav';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

const steps = [
  { num: 1, label: 'ข้อมูลพื้นฐาน' },
  { num: 2, label: 'เป้าหมายการเรียนรู้' },
  { num: 3, label: 'เนื้อหาบทเรียน' },
  { num: 4, label: 'แบบทดสอบ' },
  { num: 5, label: 'การเผยแพร่' },
];

type MediaType = 'none' | 'pdf' | 'youtube' | 'google_drive';

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

const SAMPLE_CSV = `คำถาม,ตัวเลือก A,ตัวเลือก B,ตัวเลือก C,ตัวเลือก D,เฉลย,คำอธิบาย,ระดับความยาก
"ใส่คำถามข้อที่ 1 ที่นี่","ตัวเลือก A","ตัวเลือก B","ตัวเลือก C","ตัวเลือก D","A","คำอธิบายเฉลย",1`;

export default function CreateLesson() {
  const navigate = useNavigate();
  const { addLesson, addQuestionsBatch, subjects } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Quiz state
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showQuizImport, setShowQuizImport] = useState(false);
  const [questions, setQuestions] = useState<Omit<Question, 'id'>[]>([]);
  const [quizForm, setQuizForm] = useState({
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', explanation: '', difficulty: 1,
  });

  const [form, setForm] = useState({
    title: '', grade: '', subject: 'วิทยาศาสตร์', topic: '', unit: '',
    description: '', coverImage: null as string | null,
    mediaType: 'none' as MediaType, mediaUrl: '', pdfFile: null as File | null,
    mediaItems: [] as LessonMedia[],
    content: '', objectives: '', criteria: '', isPublished: false,
  });

  const updateField = (field: string, value: string | File | null | MediaType | boolean | number | LessonMedia[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, 6));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const getGoogleDriveEmbedUrl = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    return null;
  };

  // Quiz functions
  const handleAddQuestion = () => {
    if (!quizForm.question_text || !quizForm.option_a || !quizForm.option_b) {
      alert('กรุณากรอกคำถามและตัวเลือกอย่างน้อย A, B');
      return;
    }
    setQuestions(prev => [...prev, {
      subject_unit_id: Number(form.unit) || 1,
      question_text: quizForm.question_text,
      question_type: 'multiple_choice',
      option_a: quizForm.option_a, option_b: quizForm.option_b,
      option_c: quizForm.option_c, option_d: quizForm.option_d,
      correct_answer: quizForm.correct_answer,
      explanation: quizForm.explanation,
      difficulty: quizForm.difficulty, is_active: true,
    }]);
    setQuizForm({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', difficulty: 1 });
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length < 2) { alert('ไฟล์ไม่มีข้อมูล'); return; }
        const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9ก-๙]/g, ''));
        const fieldMap: Record<string, number> = {};
        headers.forEach((h, i) => {
          const map: Record<string, string> = {
            'คำถาม': 'question_text', 'question': 'question_text',
            'ตัวเลือกA': 'option_a', 'a': 'option_a',
            'ตัวเลือกB': 'option_b', 'b': 'option_b',
            'ตัวเลือกC': 'option_c', 'c': 'option_c',
            'ตัวเลือกD': 'option_d', 'd': 'option_d',
            'เฉลย': 'correct_answer', 'answer': 'correct_answer',
            'คำอธิบาย': 'explanation',
            'ระดับความยาก': 'difficulty',
          };
          const mapped = map[h] || h;
          if (['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation', 'difficulty'].includes(mapped)) {
            fieldMap[mapped] = i;
          }
        });

        const newQuestions: Omit<Question, 'id'>[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.every(c => c === '')) continue;
          const get = (field: string) => fieldMap[field] !== undefined ? (row[fieldMap[field]] || '').trim() : '';
          const qText = get('question_text');
          if (!qText) continue;
          newQuestions.push({
            subject_unit_id: Number(form.unit) || 1,
            question_text: qText,
            question_type: 'multiple_choice',
            option_a: get('option_a'), option_b: get('option_b'),
            option_c: get('option_c'), option_d: get('option_d'),
            correct_answer: (get('correct_answer') || 'A').toUpperCase().slice(0, 1),
            explanation: get('explanation'),
            difficulty: parseInt(get('difficulty')) || 1,
            is_active: true,
          });
        }
        if (newQuestions.length > 0) {
          setQuestions(prev => [...prev, ...newQuestions]);
          alert(`นำเข้าสำเร็จ ${newQuestions.length} ข้อ!`);
        } else {
          alert('ไม่พบข้อสอบที่ถูกต้องในไฟล์');
        }
      } catch {
        alert('ไม่สามารถอ่านไฟล์ได้');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadSampleCSV = () => {
    const blob = new Blob(['\uFEFF' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sample_quiz.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = (publish: boolean) => {
    if (!form.title.trim()) { alert('กรุณากรอกชื่อบทเรียน'); setCurrentStep(1); return; }
    if (!form.unit) { alert('กรุณาเลือกหน่วยการเรียนรู้'); setCurrentStep(1); return; }
    if (!form.content.trim()) { alert('กรุณากรอกเนื้อหาบทเรียน'); setCurrentStep(3); return; }

    setSaving(true);
    const contentWithObjectives = form.objectives
      ? `## เป้าหมายการเรียนรู้\n${form.objectives}\n\n---\n\n${form.content}`
      : form.content;

    const newLesson = addLesson({
      subject_unit_id: Number(form.unit),
      title: form.title,
      content: contentWithObjectives,
      summary: form.description || form.title,
      cover_image: form.coverImage || undefined,
      media_items: form.mediaItems.length > 0 ? form.mediaItems : undefined,
      media_type: form.mediaItems.length === 0 ? form.mediaType : undefined,
      media_url: form.mediaItems.length === 0 ? (form.mediaUrl || undefined) : undefined,
      difficulty: 1,
      estimated_minutes: 15,
      is_published: publish,
    });

    // Save questions linked to this lesson
    if (questions.length > 0) {
      const questionsWithLesson = questions.map(q => ({
        ...q,
        lesson_id: newLesson.id,
        subject_unit_id: Number(form.unit) || 1,
      }));
      addQuestionsBatch(questionsWithLesson);
    }

    setTimeout(() => {
      setSaving(false);
      alert(publish ? `✅ บันทึกสำเร็จ! (${questions.length} ข้อสอบ)` : `💾 บันทึกร่างสำเร็จ! (${questions.length} ข้อสอบ)`);
      navigate('/admin/lessons');
    }, 500);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <p className="font-semibold text-blue-700 mb-4">1. ข้อมูลพื้นฐานของบทเรียน</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium block mb-1">ชื่อบทเรียน <span className="text-rose-500">*</span></label>
                <input type="text" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="ระบุชื่อบทเรียน" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">ระดับชั้น <span className="text-rose-500">*</span></label>
                <select value={form.grade} onChange={e => { updateField('grade', e.target.value); updateField('unit', ''); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">เลือกระดับชั้น</option>
                  {[1,2,3,4,5,6].map(g => <option key={g} value={g}>ป.{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">กลุ่มสาระการเรียนรู้ <span className="text-rose-500">*</span></label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option>วิทยาศาสตร์</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">สาระการเรียนรู้ <span className="text-rose-500">*</span></label>
                <select value={form.topic} onChange={e => updateField('topic', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">เลือกสาระการเรียนรู้หลัก</option>
                  <option value="bio">วิทยาศาสตร์ชีวภาพ</option>
                  <option value="phys">วิทยาศาสตร์กายภาพ</option>
                  <option value="earth">โลกและอวกาศ</option>
                  <option value="tech">เทคโนโลยี</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1">หน่วยการเรียนรู้ <span className="text-rose-500">*</span></label>
                <select value={form.unit} onChange={e => updateField('unit', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">เลือกหน่วยการเรียนรู้</option>
                  {subjects.filter(s => s.is_active && (!form.grade || s.grade_level === Number(form.grade))).map(s => (
                    <option key={s.id} value={s.id}>ป.{s.grade_level} - {s.unit_code} {s.unit_name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1">คำอธิบายบทเรียน</label>
                <textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={3} placeholder="อธิบายเนื้อหาคร่าวๆ ของบทเรียนนี้" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"></textarea>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium block mb-1">รูปภาพหน้าปกบทเรียน</label>
              {form.coverImage ? (
                <div className="relative">
                  <img src={form.coverImage} alt="รูปปก" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                  <button
                    onClick={() => updateField('coverImage', null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 shadow"
                  >✕</button>
                </div>
              ) : (
                <div
                  onClick={() => coverFileRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { alert('ไฟล์ต้องมีขนาดไม่เกิน 5MB'); return; }
                      const reader = new FileReader();
                      reader.onload = (ev) => updateField('coverImage', ev.target?.result as string);
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                  🖼️ คลิกเพื่อเลือกรูปภาพ<br/>
                  <span className="text-xs">รองรับ: JPG, PNG, WebP ขนาดไม่เกิน 5MB</span>
                </div>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <p className="font-semibold text-blue-700 mb-4">2. เป้าหมายการเรียนรู้</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">เป้าหมายการเรียนรู้ *</label>
                <textarea value={form.objectives} onChange={e => updateField('objectives', e.target.value)} rows={4} placeholder={"นักเรียนสามารถ...\n1. \n2. \n3."} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"></textarea>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">เกณฑ์ประเมิน</label>
                <textarea value={form.criteria} onChange={e => updateField('criteria', e.target.value)} rows={3} placeholder="ระบุเกณฑ์การประเมิน" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"></textarea>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <p className="font-semibold text-blue-700 mb-4">3. เนื้อหาบทเรียน</p>
            <div className="mb-6">
              <label className="text-sm font-medium block mb-1">เนื้อหาบทเรียน * (รองรับ Markdown)</label>
              <textarea value={form.content} onChange={e => updateField('content', e.target.value)} rows={10} placeholder={"# ชื่อบทเรียน\n\nเนื้อหา..."} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"></textarea>
            </div>
            <div className="border-t border-slate-200 pt-6">
              <label className="text-sm font-medium block mb-3">สื่อประกอบบทเรียน ({form.mediaItems.length} ไฟล์)</label>
              
              {/* Media Items List */}
              {form.mediaItems.length > 0 && (
                <div className="space-y-3 mb-4">
                  {form.mediaItems.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.type === 'youtube' ? '🎬' : item.type === 'pdf' ? '📄' : item.type === 'google_drive' ? '📁' : '🖼️'}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{item.title || `สื่อที่ ${idx + 1}`}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[300px]">{item.url}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => {
                          const newItems = form.mediaItems.filter((_, i) => i !== idx);
                          updateField('mediaItems', newItems);
                        }} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-lg hover:bg-red-50">🗑️ ลบ</button>
                      </div>
                      {/* Preview */}
                      {item.type === 'youtube' && getYouTubeId(item.url) && (
                        <div className="mt-3"><iframe width="100%" height="200" src={`https://www.youtube.com/embed/${getYouTubeId(item.url)}`} title="YouTube" frameBorder="0" allowFullScreen className="rounded-lg"></iframe></div>
                      )}
                      {item.type === 'google_drive' && getGoogleDriveEmbedUrl(item.url) && (
                        <div className="mt-3"><iframe width="100%" height="200" src={getGoogleDriveEmbedUrl(item.url) || ''} title="Google Drive" frameBorder="0" allowFullScreen className="rounded-lg"></iframe></div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Media Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button type="button" onClick={() => updateField('mediaType', 'youtube')} className={`p-4 rounded-xl border-2 text-center transition-all ${form.mediaType === 'youtube' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                  <span className="text-2xl block mb-1">🎬</span><span className="text-sm">เพิ่ม YouTube</span>
                </button>
                <button type="button" onClick={() => updateField('mediaType', 'pdf')} className={`p-4 rounded-xl border-2 text-center transition-all ${form.mediaType === 'pdf' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                  <span className="text-2xl block mb-1">📄</span><span className="text-sm">เพิ่ม PDF</span>
                </button>
                <button type="button" onClick={() => updateField('mediaType', 'google_drive')} className={`p-4 rounded-xl border-2 text-center transition-all ${form.mediaType === 'google_drive' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                  <span className="text-2xl block mb-1">📁</span><span className="text-sm">เพิ่ม Google Drive</span>
                </button>
              </div>

              {/* Add YouTube URL */}
              {form.mediaType === 'youtube' && (
                <div className="bg-red-50 rounded-xl p-4 mt-4">
                  <label className="text-sm font-medium block mb-2">URL วิดีโอ YouTube</label>
                  <div className="flex gap-2">
                    <input type="url" value={form.mediaUrl} onChange={e => updateField('mediaUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="flex-1 border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none" />
                    <button type="button" onClick={() => {
                      if (!form.mediaUrl || !getYouTubeId(form.mediaUrl)) { alert('กรุณาใส่ URL YouTube ที่ถูกต้อง'); return; }
                      const items: LessonMedia[] = [...form.mediaItems, { type: 'youtube', url: form.mediaUrl, title: `YouTube ${form.mediaItems.filter(i => i.type === 'youtube').length + 1}`}];
                      updateField('mediaItems', items); updateField('mediaUrl', ''); updateField('mediaType', 'none');
                    }} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600">➕ เพิ่ม</button>
                  </div>
                  {form.mediaUrl && getYouTubeId(form.mediaUrl) && (
                    <div className="mt-3"><iframe width="100%" height="200" src={`https://www.youtube.com/embed/${getYouTubeId(form.mediaUrl)}`} title="YouTube" frameBorder="0" allowFullScreen className="rounded-lg"></iframe></div>
                  )}
                </div>
              )}

              {/* Add PDF */}
              {form.mediaType === 'pdf' && (
                <div className="bg-red-50 rounded-xl p-4 mt-4">
                  <label className="text-sm font-medium block mb-2">อัปโหลดไฟล์ PDF</label>
                  <div className="border-2 border-dashed border-red-200 rounded-xl p-6 text-center hover:border-red-400 transition-colors cursor-pointer">
                    <span className="text-3xl block mb-2">📄</span>
                    <p className="text-sm text-slate-600">คลิกเพื่อเลือกไฟล์ PDF</p>
                    <input type="file" accept=".pdf" multiple className="hidden" id="pdf-upload" onChange={e => {
                      const files = e.target.files;
                      if (!files) return;
                      const newItems: LessonMedia[] = [...form.mediaItems];
                      Array.from(files).forEach(f => {
                        newItems.push({ type: 'pdf', url: URL.createObjectURL(f), title: f.name });
                      });
                      updateField('mediaItems', newItems); updateField('mediaType', 'none');
                    }} />
                    <label htmlFor="pdf-upload" className="mt-2 inline-block bg-red-500 text-white px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-red-600">เลือกไฟล์ (เลือกได้หลายไฟล์)</label>
                  </div>
                </div>
              )}

              {/* Add Google Drive */}
              {form.mediaType === 'google_drive' && (
                <div className="bg-yellow-50 rounded-xl p-4 mt-4">
                  <label className="text-sm font-medium block mb-2">URL วิดีโอจาก Google Drive</label>
                  <div className="flex gap-2">
                    <input type="url" value={form.mediaUrl} onChange={e => updateField('mediaUrl', e.target.value)} placeholder="https://drive.google.com/file/d/.../view" className="flex-1 border border-yellow-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none" />
                    <button type="button" onClick={() => {
                      if (!form.mediaUrl) { alert('กรุณาใส่ URL Google Drive'); return; }
                      const items: LessonMedia[] = [...form.mediaItems, { type: 'google_drive', url: form.mediaUrl, title: `Google Drive ${form.mediaItems.filter(i => i.type === 'google_drive').length + 1}`}];
                      updateField('mediaItems', items); updateField('mediaUrl', ''); updateField('mediaType', 'none');
                    }} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600">➕ เพิ่ม</button>
                  </div>
                  {form.mediaUrl && getGoogleDriveEmbedUrl(form.mediaUrl) && (
                    <div className="mt-3"><iframe width="100%" height="200" src={getGoogleDriveEmbedUrl(form.mediaUrl) || ''} title="Google Drive" frameBorder="0" allowFullScreen className="rounded-lg"></iframe></div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-blue-700">4. แบบทดสอบ ({questions.length} ข้อ)</p>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileImport} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  📁 นำเข้าจากไฟล์
                </button>
                <button onClick={downloadSampleCSV} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                  ⬇ ตัวอย่าง CSV
                </button>
                <button onClick={() => setShowQuizForm(!showQuizForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  {showQuizForm ? '✕ ปิด' : '+ เพิ่มข้อสอบใหม่'}
                </button>
              </div>
            </div>

            {/* Import Info */}
            {showQuizImport && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-green-800 mb-2">📋 รูปแบบไฟล์ CSV</h4>
                <p className="text-sm text-green-700 mb-2">คำถาม,ตัวเลือก A,ตัวเลือก B,ตัวเลือก C,ตัวเลือก D,เฉลย,คำอธิบาย,ระดับความยาก</p>
                <button onClick={downloadSampleCSV} className="text-sm text-green-600 hover:underline font-medium">⬇ ดาวน์โหลดตัวอย่าง</button>
              </div>
            )}

            {/* Add Question Form */}
            {showQuizForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-blue-800 mb-3">เพิ่มข้อสอบใหม่</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium block mb-1">คำถาม *</label>
                    <textarea value={quizForm.question_text} onChange={e => setQuizForm(p => ({ ...p, question_text: e.target.value }))} placeholder="พิมพ์คำถาม..." className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">ตัวเลือก A *</label>
                      <input type="text" value={quizForm.option_a} onChange={e => setQuizForm(p => ({ ...p, option_a: e.target.value }))} placeholder="ตัวเลือก A" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">ตัวเลือก B *</label>
                      <input type="text" value={quizForm.option_b} onChange={e => setQuizForm(p => ({ ...p, option_b: e.target.value }))} placeholder="ตัวเลือก B" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">ตัวเลือก C</label>
                      <input type="text" value={quizForm.option_c} onChange={e => setQuizForm(p => ({ ...p, option_c: e.target.value }))} placeholder="ตัวเลือก C" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">ตัวเลือก D</label>
                      <input type="text" value={quizForm.option_d} onChange={e => setQuizForm(p => ({ ...p, option_d: e.target.value }))} placeholder="ตัวเลือก D" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">คำตอบที่ถูก *</label>
                      <select value={quizForm.correct_answer} onChange={e => setQuizForm(p => ({ ...p, correct_answer: e.target.value }))} className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                        <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">ระดับความยาก</label>
                      <select value={quizForm.difficulty} onChange={e => setQuizForm(p => ({ ...p, difficulty: Number(e.target.value) }))} className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                        <option value={1}>ง่าย</option><option value={2}>ปานกลาง</option><option value={3}>ยาก</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">คำอธิบายเฉลย</label>
                    <textarea value={quizForm.explanation} onChange={e => setQuizForm(p => ({ ...p, explanation: e.target.value }))} placeholder="อธิบายเหตุผลที่คำตอบถูกต้อง..." className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" rows={2} />
                  </div>
                  <button onClick={handleAddQuestion} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">✅ เพิ่มข้อสอบ</button>
                </div>
              </div>
            )}

            {/* Questions List */}
            {questions.length > 0 ? (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">ข้อ {idx + 1}</span>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">เฉลย: {q.correct_answer}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${q.difficulty === 1 ? 'bg-green-100 text-green-600' : q.difficulty === 2 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                            {q.difficulty === 1 ? 'ง่าย' : q.difficulty === 2 ? 'ปานกลาง' : 'ยาก'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-2">{q.question_text}</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                          <span>A. {q.option_a}</span>
                          <span>B. {q.option_b}</span>
                          {q.option_c && <span>C. {q.option_c}</span>}
                          {q.option_d && <span>D. {q.option_d}</span>}
                        </div>
                        {q.explanation && <p className="text-xs text-gray-500 mt-2 italic">💡 {q.explanation}</p>}
                      </div>
                      <button onClick={() => handleDeleteQuestion(idx)} className="text-red-500 hover:text-red-700 text-sm flex-shrink-0">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <span className="text-4xl block mb-3">❓</span>
                <p className="text-slate-500">ยังไม่มีข้อสอบ</p>
                <p className="text-xs text-slate-400 mt-1">คลิก "นำเข้าจากไฟล์" หรือ "+ เพิ่มข้อสอบใหม่"</p>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div>
            <p className="font-semibold text-blue-700 mb-4">5. การเผยแพร่</p>
            <div className="space-y-4">
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${!form.isPublished ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="publish" checked={!form.isPublished} onChange={() => updateField('isPublished', false)} className="w-4 h-4 text-blue-600" />
                <div><p className="font-medium">ฉบับร่าง (Draft)</p><p className="text-sm text-slate-500">บทเรียนจะยังไม่แสดงให้นักเรียนเห็น</p></div>
              </label>
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.isPublished ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="publish" checked={form.isPublished} onChange={() => updateField('isPublished', true)} className="w-4 h-4 text-green-600" />
                <div><p className="font-medium">เผยแพร่ (Publish)</p><p className="text-sm text-slate-500">บทเรียนจะแสดงให้นักเรียนเห็นทันที</p></div>
              </label>
            </div>
            <div className="mt-6 bg-slate-50 rounded-xl p-4">
              <h4 className="font-medium text-slate-700 mb-2">📋 สรุปบทเรียน</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p>• ชื่อบทเรียน: <strong>{form.title || '-'}</strong></p>
                <p>• ระดับชั้น: <strong>ป.{form.grade || '-'}</strong></p>
                <p>• หน่วย: <strong>{subjects.find(s => String(s.id) === form.unit)?.unit_name || '-'}</strong></p>
                <p>• สื่อ: <strong>{form.mediaType === 'none' ? 'ไม่มี' : form.mediaType === 'youtube' ? 'YouTube' : form.mediaType === 'pdf' ? 'PDF' : 'Google Drive'}</strong></p>
                <p>• ข้อสอบ: <strong>{questions.length} ข้อ</strong></p>
                <p>• สถานะ: <strong>{form.isPublished ? '🟢 เผยแพร่' : '🟡 ฉบับร่าง'}</strong></p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <TeacherMobileHeader title="สร้างบทเรียน" />
        <TeacherBottomNav />
      <AdminSidebar />

      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
        {/* Back Link + Top Row */}
        <div className="flex items-center justify-between">
          <Link
            to="/admin/lessons"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-emerald-700 text-sm font-semibold border border-emerald-100 shadow-sm transition-all group"
          >
            <span className="text-base group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>กลับหน้ารายการบทเรียน</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-emerald-100/70 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ระบบบันทึกร่างบทเรียนอัตโนมัติ</span>
          </div>
        </div>

        {/* Main Creation Card */}
        <div className="rounded-3xl shadow-xl shadow-emerald-900/5 border border-emerald-100 overflow-hidden bg-white">
          {/* Emerald Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-emerald-100 text-xs font-semibold mb-2">
                  <span>📚 จัดการเนื้อหาบทเรียน</span>
                  <span>•</span>
                  <span>ขั้นตอนที่ {currentStep} จาก {steps.length}</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>✨ สร้างบทเรียนใหม่</span>
                </h1>
                <p className="text-emerald-100/80 text-xs md:text-sm mt-1">
                  กรอกข้อมูล ออกแบบเป้าหมาย และแทรกสื่อการสอนเพื่อการเรียนรู้ที่มีประสิทธิภาพ
                </p>
              </div>

              {/* Step indicator in topbar on desktop / tablet */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/20">
                <div className="text-[11px] font-bold text-emerald-100 px-1 mb-1.5">ความคืบหน้าการกรอก</div>
                <div className="flex items-center gap-1.5 px-1">
                  {steps.map(s => (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => setCurrentStep(s.num)}
                      className={`h-2.5 rounded-full transition-all ${
                        currentStep === s.num
                          ? 'w-8 bg-white shadow-sm'
                          : s.num < currentStep
                          ? 'w-4 bg-emerald-300'
                          : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      title={s.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Navigation Pills */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {steps.map((step, idx) => {
                const isActive = currentStep === step.num;
                const isPassed = step.num < currentStep;
                return (
                  <div key={step.num} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(step.num)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]'
                          : isPassed
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isActive ? 'bg-white text-emerald-700' : isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isPassed ? '✓' : step.num}
                      </span>
                      <span>{step.label}</span>
                    </button>
                    {idx < steps.length - 1 && (
                      <span className="text-slate-300 mx-1.5 text-xs">›</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="p-5 md:p-8">
            {renderStep()}

            {/* Bottom Step Control Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t border-slate-100">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all active:scale-95"
                  >
                    ← ก่อนหน้า
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกฉบับร่าง'}
                </button>
                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    ขั้นตอนถัดไป ({steps[currentStep].label}) →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSave(form.isPublished)}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกและเสร็จสิ้น'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
