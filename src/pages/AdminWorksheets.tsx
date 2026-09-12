import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { useWorksheets, useWorksheetSubmissions, useUsers, useWorksheets as useWsStore } from '../store/useStore';
import { GRADES, Worksheet, WorksheetQuestion, WorksheetSubmission } from '../types';
import type { AppUser } from '../store/useStore';
import AdminSidebar from '../components/AdminSidebar';
import MobileHeader from '../components/MobileHeader';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

const SUBJECTS = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา'];
const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง'];
/** ป้ายห้องสำหรับนักเรียนที่ทะเบียนไม่ได้ระบุห้องเรียน */
const NO_ROOM_LABEL = 'ไม่ระบุห้อง';

/**
 * แสดงเวลาที่นักเรียนส่งงาน — submitted_at อาจเป็น ISO หรือข้อความไทย
 * จากหน้านักเรียน (เช่น "12/09/2569 19:44") ซึ่ง new Date() อ่านไม่ได้
 * (ผลลัพธ์ของ toLocaleString('th-TH') พร้อมเวลา = พ.ศ. อยู่แล้ว)
 */
function formatSubmittedAt(v?: string | null): string {
  if (!v) return '-';
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    try { return new Date(v).toLocaleString('th-TH'); } catch { return v; }
  }
  return v; // รูปแบบไทยจากหน้านักเรียน — แสดงตามที่ส่งมา
}

const emptyQuestion = (id: number): WorksheetQuestion => ({
  id,
  type: 'mc',
  text: '',
  choices: ['', '', '', ''],
  correct_index: 0,
  score: 1,
});

/* ============ Grading page types ============ */
interface StudentRow {
  user: AppUser;
  submission: WorksheetSubmission | null;
  status: 'not-submitted' | 'submitted' | 'graded';
}

type Tab = 'create' | 'saved' | 'grade';

/* ================================================================
   จัดการใบงาน — merged page (สร้างใบงาน + ใบงานที่สร้างไว้ + ตรวจใบงาน)
   ================================================================ */
export default function AdminWorksheets({ defaultTab = 'create' }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const { worksheets } = useWsStore();
  const [gradingWorksheet, setGradingWorksheet] = useState<Worksheet | null>(null);

  const handleGradeWorksheet = (ws: Worksheet) => {
    setGradingWorksheet(ws);
    setTab('grade');
  };

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <AdminSidebar />
      <MobileHeader title="จัดการใบงาน" />

      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden bg-white">
          {/* Green Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-emerald-100 text-xs font-semibold mb-2">
                <span>🗂️ ระบบใบงานและการตรวจงาน</span>
                <span>•</span>
                <span>ใบงานทั้งหมด {worksheets.length} ชุด</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>🗂️ จัดการใบงาน</span>
              </h1>
              <p className="text-emerald-100/90 text-xs md:text-sm mt-1">
                สร้างใบงาน · จัดการใบงานที่สร้างไว้ · ตรวจงานนักเรียนในหน้าเดียว
              </p>
            </div>
          </div>

          {/* Subtabs Bar */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 md:px-6 py-3 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                  tab === 'create'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-600/25 scale-[1.02]'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>✨ สร้างใบงาน</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('saved')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                  tab === 'saved'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-600/25 scale-[1.02]'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>📂 ใบงานที่สร้างไว้</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  tab === 'saved' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {worksheets.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('grade')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                  tab === 'grade'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-600/25 scale-[1.02]'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>📋 ตรวจใบงาน</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 md:p-6">
            {tab === 'create' && <CreateTab onWorksheetCreated={() => setTab('saved')} />}
            {tab === 'saved' && (
              <SavedWorksheetsTab
                onGoToCreate={() => setTab('create')}
                onGoToGrade={handleGradeWorksheet}
              />
            )}
            {tab === 'grade' && <GradeTab initialWorksheet={gradingWorksheet} />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ================================================================
   TAB 1: สร้างใบงาน (original AdminWorksheets implementation)
   ================================================================ */
function CreateTab({ onWorksheetCreated }: { onWorksheetCreated?: () => void }) {
  const { subjects } = useAppStore();
  const { user } = useAuth();
  const { addWorksheet } = useWorksheets();

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState<WorksheetQuestion[]>([emptyQuestion(1)]);
  const [nextQId, setNextQId] = useState(2);
  const [toast, setToast] = useState<string | null>(null);

  // Units depend on the selected grade
  const unitsForGrade = useMemo(
    () => (gradeLevel === '' ? [] : subjects.filter(s => s.grade_level === gradeLevel && s.is_active)),
    [subjects, gradeLevel]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const updateQuestion = (id: number, updates: Partial<WorksheetQuestion>) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion(nextQId)]);
    setNextQId(id => id + 1);
  };

  const removeQuestion = (id: number) => {
    if (questions.length === 1) {
      setQuestions([emptyQuestion(nextQId)]);
      setNextQId(id => id + 1);
      return;
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleImageUpload = (id: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => updateQuestion(id, { image: ev.target?.result as string });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const validate = () => {
    if (!title.trim()) return '⚠️ กรุณากรอกชื่อใบงาน';
    if (gradeLevel === '') return '⚠️ กรุณาเลือกระดับชั้น';
    if (unitId === '') return '⚠️ กรุณาเลือกหน่วยการเรียนรู้';
    const invalid = questions.find(
      q =>
        !q.text.trim() ||
        (q.type === 'mc' && q.choices.some(c => !c.trim()))
    );
    if (invalid) return '⚠️ กรุณากรอกคำถามและตัวเลือกให้ครบทุกข้อ';
    return null;
  };

  const saveWorksheet = (status: 'draft' | 'published') => {
    if (status === 'published') {
      const err = validate();
      if (err) {
        alert(err);
        return;
      }
    }
    const unit = subjects.find(s => s.id === unitId);
    addWorksheet({
      title: title.trim() || '(ไม่มีชื่อ)',
      subject: subject || 'ไม่ระบุวิชา',
      grade_level: gradeLevel === '' ? 0 : gradeLevel,
      unit_id: unitId === '' ? null : unitId,
      unit_name: unit ? `${unit.unit_code} ${unit.unit_name}` : '',
      open_at: openAt,
      close_at: closeAt,
      duration_minutes: duration,
      questions: questions.map(q => ({ ...q, text: q.text.trim() })),
      status,
      created_by: user?.full_name || 'ครูผู้สอน',
      created_at: new Date().toISOString().split('T')[0],
    });
    showToast(status === 'draft' ? '💾 บันทึกร่างเรียบร้อย!' : '🚀 เผยแพร่ใบงานเรียบร้อย!');
    // Reset form
    setTitle('');
    setSubject('');
    setGradeLevel('');
    setUnitId('');
    setOpenAt('');
    setCloseAt('');
    setDuration(30);
    setQuestions([emptyQuestion(1)]);
    setNextQId(2);
  };

  const totalScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);

  const inputCls =
    'w-full px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50/60 focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 focus:bg-white transition-all';
  const labelCls = 'flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 mb-1.5';

  return (
    <div>
      {/* Form Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden">
        {/* Section header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-800">📝 ข้อมูลใบงาน</h3>
          <p className="text-xs text-slate-500 mt-0.5">ใช้ข้อมูลชั้นเรียน วิชา และหน่วยการเรียนรู้ที่มีในระบบ</p>
        </div>

        <div className="p-5 md:p-7 space-y-4">
          {/* Title */}
          <div>
            <label className={labelCls}>📝 ชื่อใบงาน <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น ใบงานที่ 1 : สิ่งมีชีวิตรอบตัว"
              className={inputCls}
            />
          </div>

          {/* Subject + Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>📚 วิชา</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} className={inputCls}>
                <option value="">-- เลือกวิชา --</option>
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>🎓 ระดับชั้น</label>
              <select
                value={gradeLevel}
                onChange={e => {
                  setGradeLevel(e.target.value === '' ? '' : Number(e.target.value));
                  setUnitId('');
                }}
                className={inputCls}
              >
                <option value="">-- เลือกระดับชั้น --</option>
                {GRADES.map(g => (
                  <option key={g.level} value={g.level}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className={labelCls}>📘 หน่วยการเรียนรู้</label>
            <select
              value={unitId}
              onChange={e => setUnitId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={gradeLevel === '' || unitsForGrade.length === 0}
              className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
            >
              {gradeLevel === '' ? (
                <option value="">-- กรุณาเลือกระดับชั้นก่อน --</option>
              ) : unitsForGrade.length === 0 ? (
                <option value="">-- ยังไม่มีหน่วยการเรียนรู้ในชั้นนี้ --</option>
              ) : (
                <>
                  <option value="">-- เลือกหน่วยการเรียนรู้ --</option>
                  {unitsForGrade.map(u => (
                    <option key={u.id} value={u.id}>{u.unit_code} {u.unit_name}</option>
                  ))}
                </>
              )}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              💡 หน่วยการเรียนรู้ดึงจากคลังหน่วยการเรียนรู้ของชั้น {gradeLevel === '' ? 'ที่เลือก' : `ป.${gradeLevel}`} ({unitsForGrade.length} หน่วย)
            </p>
          </div>

          {/* Open/Close */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>🕐 เวลาเปิด</label>
              <input type="datetime-local" value={openAt} onChange={e => setOpenAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>🕐 เวลาปิด</label>
              <input type="datetime-local" value={closeAt} onChange={e => setCloseAt(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className={labelCls}>⏱️ ระยะเวลาทำ</label>
            <div className="flex items-center gap-2.5">
              <input
                type="number"
                min={1}
                value={duration}
                onChange={e => setDuration(Number(e.target.value) || 1)}
                className={`${inputCls} w-28`}
              />
              <span className="text-sm text-slate-500 font-medium">นาที</span>
            </div>
          </div>

          {/* Questions divider */}
          <div className="flex items-center gap-3 pt-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <span className="text-sm font-bold text-green-700 bg-green-100 px-4 py-1.5 rounded-full flex items-center gap-1.5">
              📋 คำถาม ({totalScore} คะแนน)
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>

          {/* Question cards */}
          <div className="space-y-5">
            {questions.map((q, index) => (
              <div key={q.id} className="border-[1.5px] border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40 hover:border-green-200 hover:shadow-lg hover:shadow-green-900/5 transition-all">
                {/* Card head */}
                <div className="flex items-center gap-2.5 flex-wrap bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-green-100">
                  <span className="font-bold text-sm text-green-800 flex items-center gap-2 mr-auto">
                    <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    ข้อที่ {index + 1}
                  </span>
                  <select
                    value={q.type}
                    onChange={e => updateQuestion(q.id, { type: e.target.value as WorksheetQuestion['type'] })}
                    className="px-2.5 py-1.5 border-[1.5px] border-green-200 rounded-lg text-[13px] bg-white font-medium cursor-pointer focus:outline-none focus:border-green-500"
                  >
                    <option value="mc">📊 ปรนัย</option>
                    <option value="essay">✍️ อัตนัย</option>
                    <option value="fill">✏️ เติมคำในช่องว่าง</option>
                  </select>
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                    <span>คะแนน:</span>
                    <input
                      type="number"
                      min={0}
                      value={q.score}
                      onChange={e => updateQuestion(q.id, { score: Number(e.target.value) || 0 })}
                      className="w-14 px-2 py-1.5 border-[1.5px] border-green-200 rounded-lg text-center font-bold text-green-800 focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    title="ลบข้อนี้"
                    className="w-8.5 h-8.5 px-2 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm"
                  >
                    🗑️
                  </button>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-3">
                  <textarea
                    rows={2}
                    value={q.text}
                    onChange={e => updateQuestion(q.id, { text: e.target.value })}
                    placeholder={q.type === 'fill' ? 'พิมพ์คำถามโดยใช้ ___ แทนจุดที่ต้องเติมคำ...' : 'พิมพ์คำถามที่นี่...'}
                    className="w-full px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-xl text-sm bg-white resize-y focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  />

                  {/* Attach image */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleImageUpload(q.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border-[1.5px] border-dashed border-blue-300 text-blue-700 rounded-xl text-[13px] font-medium hover:bg-blue-50 transition-all"
                    >
                      📎 อัปโหลดรูปจากเครื่อง
                    </button>
                  </div>

                  {q.image && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      <img src={q.image} alt="รูปประกอบคำถาม" className="w-full max-h-52 object-cover" />
                      <button
                        onClick={() => updateQuestion(q.id, { image: undefined })}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-600/90 text-white rounded-lg hover:bg-red-600 transition-all text-xs"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] px-2.5 py-0.5 rounded-full">
                        💻 รูปประกอบคำถาม
                      </span>
                    </div>
                  )}

                  {/* Type-specific body */}
                  {q.type === 'mc' && (
                    <div className="space-y-2">
                      {q.choices.map((choice, ci) => (
                        <div key={ci} className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-green-100 text-green-800 flex items-center justify-center text-[13px] font-bold shrink-0">
                            {CHOICE_LABELS[ci]}
                          </span>
                          <input
                            type="text"
                            value={choice}
                            onChange={e => {
                              const choices = [...q.choices];
                              choices[ci] = e.target.value;
                              updateQuestion(q.id, { choices });
                            }}
                            placeholder={`ตัวเลือก ${CHOICE_LABELS[ci]}`}
                            className="flex-1 px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13.5px] bg-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                          />
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correct_index === ci}
                            onChange={() => updateQuestion(q.id, { correct_index: ci })}
                            className="w-4.5 h-4.5 accent-green-600 cursor-pointer shrink-0"
                            title="เลือกเป็นเฉลย"
                          />
                          <span className="text-[11.5px] text-green-700 font-semibold whitespace-nowrap">✓ เฉลย</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'fill' && (
                    <div className="text-[12.5px] text-green-800 bg-green-50 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                      💡 พิมพ์คำถามโดยใช้ <b>___</b> (ขีดเส้นใต้ 3 ตัว) แทนจุดที่ต้องการให้นักเรียนเติมคำ
                    </div>
                  )}
                  {q.type === 'essay' && (
                    <div className="text-[12.5px] text-slate-400 italic flex items-center gap-1.5">
                      🖊️ นักเรียนจะเห็นกล่องข้อความให้พิมพ์คำตอบแบบยาว
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add question */}
          <button
            onClick={addQuestion}
            className="w-full py-3.5 bg-green-50 border-2 border-dashed border-green-500 text-green-800 rounded-2xl text-[14.5px] font-bold hover:bg-green-100 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-900/10 transition-all flex items-center justify-center gap-2"
          >
            ➕ เพิ่มคำถาม
          </button>

          {/* Footer actions */}
          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-5 border-t-[1.5px] border-slate-100">
            <button
              onClick={() => saveWorksheet('draft')}
              className="w-full sm:w-auto px-7 py-3 bg-white text-slate-600 border-[1.5px] border-slate-200 rounded-xl text-[14.5px] font-semibold hover:bg-slate-50 transition-all"
            >
              💾 บันทึกร่าง
            </button>
            <button
              onClick={() => saveWorksheet('published')}
              className="w-full sm:w-auto px-9 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-[14.5px] font-bold shadow-lg shadow-green-600/30 hover:-translate-y-0.5 hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              🚀 เผยแพร่ใบงาน
            </button>
            {onWorksheetCreated && (
              <button
                type="button"
                onClick={onWorksheetCreated}
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[14.5px] font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <span>📂 ไปที่ใบงานที่สร้างไว้ →</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-7 py-3.5 rounded-2xl text-sm font-semibold shadow-xl shadow-green-600/40 z-50 flex items-center gap-2">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   TAB 2: ใบงานที่สร้างไว้ (Saved Worksheets Management)
   ================================================================ */
function SavedWorksheetsTab({
  onGoToCreate,
  onGoToGrade,
}: {
  onGoToCreate: () => void;
  onGoToGrade: (ws: Worksheet) => void;
}) {
  const { worksheets, updateWorksheet, deleteWorksheet } = useWorksheets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [expandedWsId, setExpandedWsId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Metrics
  const publishedCount = useMemo(() => worksheets.filter(w => w.status === 'published').length, [worksheets]);
  const draftCount = useMemo(() => worksheets.filter(w => w.status === 'draft').length, [worksheets]);
  const totalQuestions = useMemo(() => worksheets.reduce((s, w) => s + w.questions.length, 0), [worksheets]);

  // Filtered worksheets
  const filteredWorksheets = useMemo(() => {
    return worksheets.filter(w => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (w.title || '').toLowerCase().includes(q);
        const matchUnit = (w.unit_name || '').toLowerCase().includes(q);
        const matchSub = (w.subject || '').toLowerCase().includes(q);
        if (!matchTitle && !matchUnit && !matchSub) return false;
      }
      // Grade
      if (selectedGrade !== '' && w.grade_level !== selectedGrade) return false;
      // Subject
      if (selectedSubject && w.subject !== selectedSubject) return false;
      // Status
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;

      return true;
    });
  }, [worksheets, searchQuery, selectedGrade, selectedSubject, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Main Card with Green Topbar */}
      <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden mb-8">
        {/* Section header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800">📂 ใบงานที่สร้างไว้</h3>
              <span className="bg-green-100 text-green-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-green-200">
                {worksheets.length} ชุด
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              รายการใบงานทั้งหมดในระบบ สามารถค้นหา ตรวจสอบ เผยแพร่ หรือนำไปตรวจให้คะแนนได้
            </p>
          </div>
          <button
            onClick={onGoToCreate}
            className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/25 hover:shadow-lg transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>✨</span>
            <span>สร้างใบงานใหม่</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 md:p-7 space-y-6">
          {/* 1. Stat Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-emerald-100/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                📂
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">ใบงานทั้งหมด</p>
                <p className="text-xl font-bold text-slate-800">{worksheets.length} <span className="text-xs font-normal text-slate-500">ชุด</span></p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-green-100/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center text-xl shrink-0">
                🚀
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">เผยแพร่แล้ว</p>
                <p className="text-xl font-bold text-green-600">{publishedCount} <span className="text-xs font-normal text-slate-500">ชุด</span></p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-amber-100/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
                📝
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">ฉบับร่าง</p>
                <p className="text-xl font-bold text-amber-600">{draftCount} <span className="text-xs font-normal text-slate-500">ชุด</span></p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-sky-100/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl shrink-0">
                ❓
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">คำถามทั้งหมด</p>
                <p className="text-xl font-bold text-sky-600">{totalQuestions} <span className="text-xs font-normal text-slate-500">ข้อ</span></p>
              </div>
            </div>
          </div>

          {/* 2. Filter & Search Controls */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search box */}
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อใบงาน หรือหน่วยการเรียนรู้..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Subject Filter */}
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-green-500 transition-all sm:w-44"
              >
                <option value="">📚 ทุกวิชา</option>
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Grade Filter */}
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value === '' ? '' : Number(e.target.value))}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-green-500 transition-all sm:w-40"
              >
                <option value="">🎓 ทุกระดับชั้น</option>
                {GRADES.map(g => (
                  <option key={g.level} value={g.level}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 font-medium mr-1">สถานะ:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ทั้งหมด ({worksheets.length})
                </button>
                <button
                  onClick={() => setStatusFilter('published')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === 'published'
                      ? 'bg-green-600 text-white shadow-xs'
                      : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
                  }`}
                >
                  🚀 เผยแพร่แล้ว ({publishedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('draft')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === 'draft'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                  }`}
                >
                  📝 ฉบับร่าง ({draftCount})
                </button>
              </div>

              <span className="text-xs text-slate-400 font-medium">
                แสดงผล {filteredWorksheets.length} จาก {worksheets.length} ชุด
              </span>
            </div>
          </div>

          {/* 3. Worksheet Cards List */}
          <div className="space-y-3">
            {filteredWorksheets.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-10 text-center border border-slate-200">
                <div className="w-16 h-16 rounded-full bg-white text-3xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  📂
                </div>
                {worksheets.length === 0 ? (
                  <>
                    <h4 className="font-bold text-slate-700 text-base mb-1">ยังไม่มีใบงานที่สร้างไว้</h4>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-4">
                      คลิกปุ่มด้านล่างเพื่อเริ่มสร้างใบงานชุดแรกให้นักเรียนได้เลย!
                    </p>
                    <button
                      onClick={onGoToCreate}
                      className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm rounded-xl shadow-md shadow-green-600/25 hover:shadow-lg transition-all inline-flex items-center gap-2"
                    >
                      <span>✨ สร้างใบงานใหม่</span>
                    </button>
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-slate-700 text-base mb-1">ไม่พบใบงานตามเงื่อนไขที่เลือก</h4>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-4">
                      ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูใบงานทั้งหมด
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedGrade('');
                        setSelectedSubject('');
                        setStatusFilter('all');
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
                    >
                      ล้างตัวกรอง
                    </button>
                  </>
                )}
              </div>
            ) : (
              filteredWorksheets.map(w => {
                const grade = GRADES.find(g => g.level === w.grade_level);
                const totalScore = w.questions.reduce((s, q) => s + (Number(q.score) || 0), 0);
                const isExpanded = expandedWsId === w.id;

                return (
                  <div
                    key={w.id}
                    className="bg-white rounded-2xl border-[1.5px] border-slate-100 bg-slate-50/40 hover:border-green-300 hover:bg-white hover:shadow-md transition-all overflow-hidden p-4 md:p-5"
                  >
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <h4 className="font-bold text-base text-slate-900 leading-snug">{w.title}</h4>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            w.status === 'published'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {w.status === 'published' ? '🚀 เผยแพร่แล้ว' : '📝 ฉบับร่าง'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                            {grade ? grade.label : `ป.${w.grade_level || '-'}`}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">
                            {w.subject}
                          </span>
                          {w.unit_name && (
                            <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-semibold truncate max-w-xs">
                              {w.unit_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions buttons */}
                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        {w.status === 'draft' && (
                          <button
                            onClick={() => {
                              updateWorksheet(w.id, { status: 'published' });
                              showToast('🚀 เผยแพร่ใบงานเรียบร้อย!');
                            }}
                            className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all flex items-center gap-1"
                            title="เผยแพร่ให้นักเรียนทำได้"
                          >
                            <span>🚀</span>
                            <span>เผยแพร่</span>
                          </button>
                        )}
                        <button
                          onClick={() => onGoToGrade(w)}
                          className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          title="ไปที่หน้าตรวจใบงานนี้"
                        >
                          <span>📋</span>
                          <span>ตรวจใบงาน</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`ลบใบงาน "${w.title}" หรือไม่?`)) {
                              deleteWorksheet(w.id);
                              showToast('🗑️ ลบใบงานเรียบร้อย');
                            }
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="ลบใบงาน"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Meta details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 bg-white rounded-xl text-xs text-slate-600 border border-slate-100 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span>⏱️</span>
                        <span>เวลา: <strong className="text-slate-800">{w.duration_minutes || 30} นาที</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>❓</span>
                        <span>จำนวน: <strong className="text-slate-800">{w.questions.length} ข้อ</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>💯</span>
                        <span>คะแนนรวม: <strong className="text-emerald-700">{totalScore} คะแนน</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>📅</span>
                        <span className="truncate">สร้างเมื่อ: {w.created_at || '-'}</span>
                      </div>
                    </div>

                    {/* Toggle Question Preview */}
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedWsId(isExpanded ? null : w.id)}
                        className="text-xs font-bold text-slate-500 hover:text-green-700 flex items-center gap-1 transition-colors"
                      >
                        <span>{isExpanded ? '🔽 ซ่อนตัวอย่างคำถาม' : `👁️ ดูตัวอย่างคำถาม (${w.questions.length} ข้อ)`}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2.5">
                          {w.questions.map((q, qIdx) => (
                            <div key={q.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-slate-800">
                                  ข้อที่ {qIdx + 1} ({q.type === 'mc' ? 'ปรนัย 4 ตัวเลือก' : 'เขียนตอบ'})
                                </span>
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                  {q.score} คะแนน
                                </span>
                              </div>
                              <p className="text-slate-700 font-medium mb-2">{q.text}</p>
                              {q.type === 'mc' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {q.choices.map((c, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 ${
                                        cIdx === q.correct_index
                                          ? 'bg-green-50/80 border-green-300 text-green-800 font-bold'
                                          : 'bg-slate-50 border-slate-200 text-slate-600'
                                      }`}
                                    >
                                      <span className="w-5 h-5 rounded-full bg-white text-[10px] font-bold flex items-center justify-center border border-slate-200">
                                        {CHOICE_LABELS[cIdx]}
                                      </span>
                                      <span className="flex-1 truncate">{c}</span>
                                      {cIdx === q.correct_index && (
                                        <span className="text-green-600 text-xs font-black">✓ คำตอบ</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-7 py-3.5 rounded-2xl text-sm font-semibold shadow-xl shadow-green-600/40 z-50 flex items-center gap-2">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   TAB 3: ตรวจใบงาน (original AdminGradeWorksheets implementation)
   ================================================================ */
function GradeTab({ initialWorksheet }: { initialWorksheet?: Worksheet | null }) {
  const { subjects: units } = useAppStore();
  const { worksheets } = useWsStore();
  const { submissions, gradeSubmission } = useWorksheetSubmissions();
  const { users } = useUsers();

  // Cascading filter state
  const [filterSubject, setFilterSubject] = useState(initialWorksheet?.subject || '');
  const [filterGrade, setFilterGrade] = useState<number | ''>(initialWorksheet?.grade_level ?? '');
  const [filterUnit, setFilterUnit] = useState<number | ''>(initialWorksheet?.unit_id ?? '');
  const [filterWorksheet, setFilterWorksheet] = useState<number | ''>(initialWorksheet?.id ?? '');
  const [currentRoom, setCurrentRoom] = useState('');

  // Update when initialWorksheet prop changes
  useEffect(() => {
    if (initialWorksheet) {
      if (initialWorksheet.subject) setFilterSubject(initialWorksheet.subject);
      if (initialWorksheet.grade_level) setFilterGrade(initialWorksheet.grade_level);
      if (initialWorksheet.unit_id) setFilterUnit(initialWorksheet.unit_id);
      setFilterWorksheet(initialWorksheet.id);
    }
  }, [initialWorksheet]);

  // Grading modal state
  const [gradingSub, setGradingSub] = useState<WorksheetSubmission | null>(null);
  const [gradingWs, setGradingWs] = useState<Worksheet | null>(null);
  const [gradeScores, setGradeScores] = useState<(number | null)[]>([]);
  const [gradeComments, setGradeComments] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // ---- Cascading data ----
  const unitsForGrade = useMemo(() => {
    if (filterGrade === '') return [];
    return units.filter(u => u.grade_level === filterGrade && u.is_active);
  }, [units, filterGrade]);

  const worksheetsForFilters = useMemo(() => {
    let filtered = worksheets.filter(w => w.status === 'published');
    if (filterSubject) filtered = filtered.filter(w => w.subject === filterSubject);
    if (filterGrade !== '') filtered = filtered.filter(w => w.grade_level === filterGrade);
    if (filterUnit !== '') filtered = filtered.filter(w => w.unit_id === filterUnit);
    return filtered;
  }, [worksheets, filterSubject, filterGrade, filterUnit]);

  const selectedWs = useMemo(() => {
    if (filterWorksheet === '') return null;
    return worksheets.find(w => w.id === filterWorksheet) || null;
  }, [worksheets, filterWorksheet]);

  // ---- Students for selected grade ----
  const studentsForGrade = useMemo(() => {
    if (filterGrade === '') return [];
    // is_active !== false (ไม่ใช่ u.is_active) — ทะเบียนเก่าที่ไม่มีฟิลด์ is_active ต้องไม่ถูกตัดหาย
    return users.filter(u => u.role === 'student' && u.grade_level === filterGrade && u.is_active !== false);
  }, [users, filterGrade]);

  // ---- Rooms (class_names) ----
  // นักเรียนที่ยังไม่ได้ระบุห้อง (class_name ว่าง) จัดเป็นห้อง "ไม่ระบุห้อง"
  // เพื่อให้ครูยังเห็นและตรวจงานของเด็กคนนั้นได้ ไม่หลุดจากรายชื่อ
  const rooms = useMemo(() => {
    const roomSet = new Set<string>();
    studentsForGrade.forEach(s => { roomSet.add(s.class_name?.trim() || NO_ROOM_LABEL); });
    return Array.from(roomSet).sort();
  }, [studentsForGrade]);

  // Set default room when rooms change
  useMemo(() => {
    if (rooms.length > 0 && !rooms.includes(currentRoom)) {
      setCurrentRoom(rooms[0]);
    }
  }, [rooms, currentRoom]);

  // ---- Student rows with submission status ----
  const studentRows: StudentRow[] = useMemo(() => {
    if (!selectedWs) return [];
    const roomStudents = studentsForGrade.filter(s => (s.class_name?.trim() || NO_ROOM_LABEL) === currentRoom);
    return roomStudents.map(s => {
      const sub = submissions.find(
        sub => sub.worksheet_id === selectedWs.id && sub.student_id === s.id
      ) || null;
      let status: StudentRow['status'] = 'not-submitted';
      if (sub) {
        status = sub.status === 'graded' ? 'graded' : 'submitted';
      }
      return { user: s, submission: sub, status };
    }).sort((a, b) => {
      // Sort: submitted first, then graded, then not-submitted
      const order = { submitted: 0, graded: 1, 'not-submitted': 2 };
      return order[a.status] - order[b.status];
    });
  }, [studentsForGrade, submissions, selectedWs, currentRoom]);

  // ---- Summary stats ----
  const summary = useMemo(() => {
    const submitted = studentRows.filter(s => s.status !== 'not-submitted').length;
    const notSubmitted = studentRows.filter(s => s.status === 'not-submitted').length;
    const graded = studentRows.filter(s => s.status === 'graded').length;
    const gradedScores = studentRows
      .filter(s => s.status === 'graded' && s.submission?.total_score != null)
      .map(s => s.submission!.total_score!);
    const avg = gradedScores.length > 0
      ? (gradedScores.reduce((sum: number, b: number) => sum + b, 0) / gradedScores.length).toFixed(1)
      : '-';
    return { submitted, notSubmitted, graded, avg };
  }, [studentRows]);

  const maxScore = useMemo(() => {
    if (!selectedWs) return 0;
    return selectedWs.questions.reduce((sum, q) => sum + (q.score || 0), 0);
  }, [selectedWs]);

  // ---- Filter reset helpers ----
  const resetFilters = (from: 'subject' | 'grade' | 'unit' | 'worksheet') => {
    if (from === 'subject') { setFilterGrade(''); setFilterUnit(''); setFilterWorksheet(''); setCurrentRoom(''); }
    if (from === 'grade') { setFilterUnit(''); setFilterWorksheet(''); setCurrentRoom(''); }
    if (from === 'unit') { setFilterWorksheet(''); }
  };

  // ---- Grading modal ----
  const openGradeModal = (sub: WorksheetSubmission) => {
    setGradingSub(sub);
    setGradingWs(selectedWs);
    // Initialize scores/comments from existing grading data
    const scores: (number | null)[] = [];
    const comments: string[] = [];
    selectedWs?.questions.forEach((q, idx) => {
      const ans = sub.answers[idx];
      if (q.type === 'mc') {
        const isCorrect = Number(ans?.value) === q.correct_index;
        scores.push(isCorrect ? q.score : 0);
        comments.push('');
      } else {
        scores.push(ans?.score ?? null);
        comments.push(ans?.comment || '');
      }
    });
    setGradeScores(scores);
    setGradeComments(comments);
  };

  const saveGrade = async () => {
    if (!gradingSub || !gradingWs) return;
    // Build graded answers
    const gradedAnswers = gradingWs.questions.map((q, idx) => {
      const orig = gradingSub.answers[idx] || { question_id: q.id, value: '' };
      if (q.type === 'mc') {
        const isCorrect = Number(orig.value) === q.correct_index;
        return { ...orig, score: isCorrect ? q.score : 0, comment: '' };
      }
      return {
        ...orig,
        score: gradeScores[idx] ?? 0,
        comment: gradeComments[idx] || '',
      };
    });
    const totalScore = gradedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
    await gradeSubmission(gradingSub.id, {
      answers: gradedAnswers,
      status: 'graded',
      total_score: totalScore,
      graded_at: new Date().toISOString(),
      graded_by: 'ครูผู้สอน',
    });
    setGradingSub(null);
    setGradingWs(null);
    showToast('✅ บันทึกคะแนนเรียบร้อย!');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // ---- Overview stats (all published worksheets) ----
  const overviewStats = useMemo(() => {
    const published = worksheets.filter(w => w.status === 'published');
    let gradedCount = 0;
    let ungradedCount = 0;
    const ungradedWorksheets: { worksheet: Worksheet; pendingCount: number }[] = [];

    published.forEach(ws => {
      // Get all students for this worksheet's grade
      const wsStudents = users.filter(u => u.role === 'student' && u.grade_level === ws.grade_level && u.is_active !== false);
      const wsSubmissions = submissions.filter(s => s.worksheet_id === ws.id);
      const gradedSubs = wsSubmissions.filter(s => s.status === 'graded');
      const pendingSubs = wsSubmissions.filter(s => s.status !== 'graded');
      const notSubmitted = wsStudents.length - wsSubmissions.length;
      const pendingTotal = pendingSubs.length + notSubmitted;
      void gradedSubs;

      if (pendingTotal === 0 && wsStudents.length > 0) {
        gradedCount++;
      } else {
        ungradedCount++;
        ungradedWorksheets.push({ worksheet: ws, pendingCount: pendingTotal });
      }
    });

    return { total: published.length, gradedCount, ungradedCount, ungradedWorksheets };
  }, [worksheets, submissions, users]);

  // ---- Auto-filter to show ungraded worksheets ----
  const [showUngraded, setShowUngraded] = useState(false);
  const handleShowUngraded = () => {
    setShowUngraded(true);
    // Reset filters so user can see all ungraded
    setFilterSubject('');
    setFilterGrade('');
    setFilterUnit('');
    setFilterWorksheet('');
  };

  // ---- Breadcrumb ----
  const breadcrumbParts = [
    filterSubject,
    filterGrade !== '' ? GRADES.find(g => g.level === filterGrade)?.label : '',
    filterUnit !== '' ? units.find(u => u.id === filterUnit)?.unit_name : '',
    selectedWs?.title,
  ].filter(Boolean);

  const totalGradeScore = gradeScores.reduce((sum: number, s: number | null) => sum + (s || 0), 0);

  // ---- UI ----
  return (
    <div>
      <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden">
        {/* Section header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-800">📋 ตรวจงานนักเรียน</h3>
          <p className="text-xs text-slate-500 mt-0.5">กรองข้อมูลเพื่อค้นหาใบงานที่ต้องการตรวจ</p>
        </div>

        <div className="p-5 md:p-7">
          {/* ===== Overview Summary Cards ===== */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Total worksheets */}
            <div className="border border-slate-200 rounded-2xl p-4 text-center bg-gradient-to-br from-slate-50 to-white hover:shadow-md transition-all">
              <div className="text-2xl mb-1">📄</div>
              <div className="text-2xl font-extrabold text-slate-800">{overviewStats.total}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">ใบงานทั้งหมด</div>
            </div>
            {/* Graded */}
            <div className="border border-green-200 rounded-2xl p-4 text-center bg-gradient-to-br from-green-50 to-white hover:shadow-md transition-all">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-2xl font-extrabold text-green-700">{overviewStats.gradedCount}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">ตรวจแล้ว</div>
            </div>
            {/* Ungraded */}
            <div
              onClick={overviewStats.ungradedCount > 0 ? handleShowUngraded : undefined}
              className={`border rounded-2xl p-4 text-center transition-all ${
                overviewStats.ungradedCount > 0
                  ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white hover:shadow-md hover:scale-[1.02] cursor-pointer'
                  : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
              }`}
            >
              <div className="text-2xl mb-1">📝</div>
              <div className={`text-2xl font-extrabold ${overviewStats.ungradedCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{overviewStats.ungradedCount}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                ยังไม่ได้ตรวจ
                {overviewStats.ungradedCount > 0 && (
                  <span className="block text-amber-600 font-semibold mt-0.5">🔍 ดูใบงานที่ยังไม่ตรวจ</span>
                )}
              </div>
            </div>
          </div>

          {/* Ungraded worksheets list (when clicked) */}
          {showUngraded && overviewStats.ungradedWorksheets.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-amber-800">📝 ใบงานที่ยังไม่ได้ตรวจ ({overviewStats.ungradedWorksheets.length} รายการ)</h4>
                <button
                  onClick={() => setShowUngraded(false)}
                  className="text-xs text-amber-600 hover:text-amber-800 font-semibold"
                >✕ ปิด</button>
              </div>
              <div className="space-y-2">
                {overviewStats.ungradedWorksheets.map(({ worksheet: ws, pendingCount }) => {
                  const grade = GRADES.find(g => g.level === ws.grade_level);
                  return (
                    <div
                      key={ws.id}
                      onClick={() => {
                        setFilterSubject(ws.subject);
                        setFilterGrade(ws.grade_level);
                        setFilterUnit(ws.unit_id || '');
                        setFilterWorksheet(ws.id);
                        setShowUngraded(false);
                      }}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {pendingCount}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate">{ws.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {grade ? grade.label : '—'} • {ws.subject} • {ws.unit_name}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                        ⏳ รอตรวจ {pendingCount} คน
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== Cascading Filters ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-green-50/60 border border-green-200/60 rounded-2xl p-4 mb-4">
            {/* 1. Subject */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <span className="w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">1</span>
                📚 วิชา
              </label>
              <select
                value={filterSubject}
                onChange={e => { setFilterSubject(e.target.value); resetFilters('subject'); }}
                className="w-full px-3 py-2.5 border-[1.5px] border-slate-200 rounded-xl text-[13px] bg-white font-medium focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100"
              >
                <option value="">-- เลือกวิชา --</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* 2. Grade */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <span className="w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">2</span>
                🎓 ชั้น
              </label>
              <select
                value={filterGrade}
                onChange={e => { setFilterGrade(e.target.value === '' ? '' : Number(e.target.value)); resetFilters('grade'); }}
                disabled={!filterSubject}
                className="w-full px-3 py-2.5 border-[1.5px] border-slate-200 rounded-xl text-[13px] bg-white font-medium focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- เลือกชั้น --</option>
                {GRADES.map(g => <option key={g.level} value={g.level}>{g.label}</option>)}
              </select>
            </div>
            {/* 3. Unit */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <span className="w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">3</span>
                📘 หน่วยการเรียนรู้
              </label>
              <select
                value={filterUnit}
                onChange={e => { setFilterUnit(e.target.value === '' ? '' : Number(e.target.value)); resetFilters('unit'); }}
                disabled={filterGrade === ''}
                className="w-full px-3 py-2.5 border-[1.5px] border-slate-200 rounded-xl text-[13px] bg-white font-medium focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- เลือกหน่วย --</option>
                {unitsForGrade.map(u => (
                  <option key={u.id} value={u.id}>{u.unit_code} {u.unit_name}</option>
                ))}
              </select>
            </div>
            {/* 4. Worksheet */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                📄 ใบงาน
              </label>
              <select
                value={filterWorksheet}
                onChange={e => setFilterWorksheet(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={worksheetsForFilters.length === 0}
                className="w-full px-3 py-2.5 border-[1.5px] border-slate-200 rounded-xl text-[13px] bg-white font-medium focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- เลือกใบงาน --</option>
                {worksheetsForFilters.map(w => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Breadcrumb */}
          {breadcrumbParts.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-5 flex-wrap px-1">
              <span>📍 กำลังดู:</span>
              {breadcrumbParts.map((part, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-300">›</span>}
                  <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full font-semibold">{part}</span>
                </span>
              ))}
            </div>
          )}

          {/* ===== Room Tabs ===== */}
          {rooms.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-thin">
              {rooms.map(room => {
                const count = studentsForGrade.filter(s => (s.class_name?.trim() || NO_ROOM_LABEL) === room).length;
                return (
                  <button
                    key={room}
                    onClick={() => setCurrentRoom(room)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-[1.5px] text-[13px] font-semibold transition-all flex items-center gap-2 ${
                      room === currentRoom
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-transparent shadow-lg shadow-green-600/30'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-green-300'
                    }`}
                  >
                    🏫 {room}
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                      room === currentRoom ? 'bg-white/25' : 'bg-slate-100 text-slate-400'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ===== Summary Cards ===== */}
          {selectedWs && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="border border-green-200 rounded-2xl p-4 text-center bg-gradient-to-br from-green-50 to-white">
                <div className="text-xl mb-1">📤</div>
                <div className="text-2xl font-extrabold text-slate-800">{summary.submitted}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">ส่งงานแล้ว</div>
              </div>
              <div className="border border-amber-200 rounded-2xl p-4 text-center bg-gradient-to-br from-amber-50 to-white">
                <div className="text-xl mb-1">⏳</div>
                <div className="text-2xl font-extrabold text-slate-800">{summary.notSubmitted}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">ยังไม่ส่ง</div>
              </div>
              <div className="border border-blue-200 rounded-2xl p-4 text-center bg-gradient-to-br from-blue-50 to-white">
                <div className="text-xl mb-1">✅</div>
                <div className="text-2xl font-extrabold text-slate-800">{summary.graded}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">ตรวจแล้ว</div>
              </div>
              <div className="border border-purple-200 rounded-2xl p-4 text-center bg-gradient-to-br from-purple-50 to-white">
                <div className="text-xl mb-1">📊</div>
                <div className="text-2xl font-extrabold text-slate-800">{summary.avg}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">คะแนนเฉลี่ย</div>
              </div>
            </div>
          )}

          {/* ===== Student List ===== */}
          {!selectedWs ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-medium">กรุณาเลือก วิชา → ชั้น → หน่วยการเรียนรู้ → ใบงาน เพื่อแสดงรายชื่อนักเรียน</p>
            </div>
          ) : studentRows.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-medium">ยังไม่มีนักเรียนในห้องนี้</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {studentRows.map(sr => {
                const initial = sr.user.full_name.replace(/ด\.ช\.|ด\.ญ\.|นาย|นางสาว/g, '').trim().charAt(0) || '?';
                const statusConfig = {
                  'submitted': { label: '⏳ รอตรวจ', cls: 'bg-amber-100 text-amber-700' },
                  'graded': { label: '✅ ตรวจแล้ว', cls: 'bg-green-100 text-green-700' },
                  'not-submitted': { label: '❌ ยังไม่ส่ง', cls: 'bg-red-100 text-red-600' },
                }[sr.status];

                return (
                  <div key={sr.user.id}
                    className="flex items-center gap-3.5 p-4 border-[1.5px] border-slate-100 rounded-2xl bg-white hover:border-green-200 hover:shadow-md hover:shadow-green-900/5 transition-all"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {initial}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800">{sr.user.full_name}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-slate-400">เลขที่ {sr.user.class_name?.split('/')[1] || '-'}</span>
                        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${statusConfig.cls}`}>
                          {statusConfig.label}
                        </span>
                    {sr.submission?.submitted_at && (
                      <span className="text-[11px] text-slate-400">· ส่งเมื่อ {formatSubmittedAt(sr.submission.submitted_at)}</span>
                    )}
                      </div>
                    </div>
                    {/* Score */}
                    <div className={`text-sm font-extrabold min-w-[52px] text-right ${
                      sr.status === 'graded' ? 'text-green-700' : 'text-slate-300'
                    }`}>
                      {sr.submission?.total_score != null ? `${sr.submission.total_score}/${maxScore}` : '—'}
                    </div>
                    {/* Action */}
                    {sr.status === 'not-submitted' ? (
                      <button disabled
                        className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-[13px] font-semibold cursor-not-allowed"
                      >ยังไม่ส่ง</button>
                    ) : sr.submission ? (
                      <button
                        onClick={() => openGradeModal(sr.submission!)}
                        className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                          sr.status === 'graded'
                            ? 'bg-white text-green-700 border-[1.5px] border-green-200 hover:bg-green-50'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-600/30'
                        }`}
                      >
                        {sr.status === 'graded' ? '👁️ ดูคะแนน' : '📝 ตรวจงาน'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Grading Modal ===== */}
      {gradingSub && gradingWs && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setGradingSub(null); setGradingWs(null); } }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-hidden shadow-2xl flex flex-col animate-[popIn_.3s_cubic-bezier(.34,1.56,.64,1)]"
            style={{ animation: 'popIn .3s cubic-bezier(.34,1.56,.64,1)' }}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3.5 px-5 py-4 bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 text-white shrink-0">
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center font-bold">
                {(() => { const u = users.find(u => u.id === gradingSub.student_id); return u?.full_name?.replace(/ด\.ช\.|ด\.ญ\.|นาย|นางสาว/g, '').trim().charAt(0) || '?'; })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] truncate">
                  {users.find(u => u.id === gradingSub.student_id)?.full_name || 'นักเรียน'}
                </div>
                <div className="text-xs opacity-85">
                  ส่งเมื่อ {formatSubmittedAt(gradingSub.submitted_at)}
                </div>
              </div>
              <button onClick={() => { setGradingSub(null); setGradingWs(null); }}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-all"
              >✕</button>
            </div>

            {/* Modal body — scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {gradingWs.questions.map((q, idx) => {
                const ans = gradingSub.answers[idx];
                const typeLabel = { mc: '📊 ปรนัย (ตรวจอัตโนมัติ)', fill: '✏️ เติมคำ', essay: '✍️ อัตนัย' }[q.type];

                return (
                  <div key={q.id} className="border-[1.5px] border-slate-200 rounded-2xl overflow-hidden">
                    {/* Question head */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-50/60 border-b border-green-100">
                      <span className="font-bold text-sm text-green-800 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        ข้อที่ {idx + 1}
                      </span>
                      <span className="text-[11px] bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold">{typeLabel}</span>
                      <span className="ml-auto text-xs text-slate-500 font-medium">เต็ม {q.score} คะแนน</span>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-medium text-slate-800 mb-3 leading-relaxed">{q.text}</p>

                      {q.type === 'mc' && (() => {
                        const studentAnswer = Number(ans?.value);
                        const isCorrect = studentAnswer === q.correct_index;
                        return (
                          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium ${
                            isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                          }`}>
                            <span className="text-base">{isCorrect ? '✔️' : '✖️'}</span>
                            นักเรียนตอบ: <b>{CHOICE_LABELS[studentAnswer]}. {q.choices[studentAnswer] || '—'}</b>
                            {!isCorrect && <> (เฉลย: {CHOICE_LABELS[q.correct_index]}. {q.choices[q.correct_index]})</>}
                            — {isCorrect ? q.score : 0}/{q.score} คะแนน
                          </div>
                        );
                      })()}

                      {q.type !== 'mc' && (
                        <>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 mb-3">
                            <span className="text-[11px] text-slate-400 font-semibold block mb-1">คำตอบของนักเรียน</span>
                            {ans?.value || <span className="italic text-slate-400">ไม่ได้ตอบ</span>}
                          </div>
                          <div className="flex items-center gap-2.5 mb-2">
                            <label className="text-[13px] font-semibold text-slate-700">ให้คะแนน:</label>
                            <input
                              type="number"
                              min={0}
                              max={q.score}
                              value={gradeScores[idx] ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? null : Math.min(Number(e.target.value), q.score);
                                setGradeScores(prev => { const next = [...prev]; next[idx] = val; return next; });
                              }}
                              className="w-16 px-2.5 py-2 border-[1.5px] border-slate-200 rounded-lg text-center font-bold text-green-700 focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100"
                            />
                            <span className="text-[13px] text-slate-500">/ {q.score} คะแนน</span>
                          </div>
                          <textarea
                            value={gradeComments[idx] || ''}
                            onChange={e => setGradeComments(prev => { const next = [...prev]; next[idx] = e.target.value; return next; })}
                            placeholder="ความคิดเห็น/คำแนะนำ (ถ้ามี)"
                            rows={2}
                            className="w-full px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-xl text-[13px] resize-y focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-100"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 shrink-0 bg-white">
              <div className="text-sm font-bold text-slate-800">
                คะแนนรวม: <span className="text-green-700 text-lg">{totalGradeScore}</span> / {maxScore}
              </div>
              <button onClick={saveGrade}
                className="px-7 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-600/30 hover:-translate-y-0.5 hover:shadow-xl transition-all"
              >💾 บันทึกคะแนน</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-7 py-3.5 rounded-2xl text-sm font-semibold shadow-xl shadow-green-600/40 z-50 flex items-center gap-2 animate-[popIn_.3s_cubic-bezier(.34,1.56,.64,1)]">
          {toast}
        </div>
      )}

      {/* Animation keyframe */}
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(.92);} to{opacity:1;transform:scale(1);} }`}</style>
    </div>
  );
}
