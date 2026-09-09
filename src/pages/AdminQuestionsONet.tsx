import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { GRADES, ONET_SUBJECTS } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import MobileHeader from '../components/MobileHeader';

export default function AdminQuestionsONet() {
  const { questions, addQuestion, updateQuestion, deleteQuestion, deleteQuestionsByCategory, subjects } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const [form, setForm] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
    difficulty: 2 as 1 | 2 | 3,
    subject: '',
    subject_unit_id: '',
  });

  const onetQuestions = useMemo(() => questions.filter(q => (q as any).category === 'onet'), [questions]);

  const filteredQuestions = useMemo(() => {
    if (!selectedSubject) return onetQuestions;
    return onetQuestions.filter(q => (q as any).subject === selectedSubject);
  }, [onetQuestions, selectedSubject]);

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ONET_SUBJECTS.forEach(s => { counts[s] = 0; });
    onetQuestions.forEach(q => {
      const s = (q as any).subject || '';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [onetQuestions]);

  const handleSubmit = () => {
    if (!form.question_text || !form.option_a || !form.option_b) return;
    const q = {
      ...form,
      subject_unit_id: form.subject_unit_id ? Number(form.subject_unit_id) : 0,
      lesson_id: 0,
      question_type: 'multiple_choice' as const,
      is_active: true,
      category: 'onet' as const,
      subject: form.subject,
    };
    if (editingId) {
      updateQuestion(editingId, q);
    } else {
      addQuestion(q);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', difficulty: 2, subject: '', subject_unit_id: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (q: any) => {
    setForm({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 2,
      subject: q.subject || '',
      subject_unit_id: String(q.subject_unit_id || ''),
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const header = lines[0];
      const isThai = header.includes('คำถาม');
      const hasSubject = header.includes('วิชา');
      const dataLines = lines.slice(1);
      dataLines.forEach(line => {
        const cols = line.match(/(".*?"|[^,]+)/g) || [];
        const clean = (s: string) => s.replace(/^"|"$/g, '').trim();
        addQuestion({
          question_text: clean(cols[0] || ''),
          option_a: clean(cols[1] || ''),
          option_b: clean(cols[2] || ''),
          option_c: clean(cols[3] || ''),
          option_d: clean(cols[4] || ''),
          correct_answer: clean(cols[5] || 'A'),
          explanation: clean(cols[6] || ''),
          difficulty: parseInt(clean(cols[7] || '2')),
          subject: hasSubject ? clean(cols[8] || '') : '',
          lesson_id: 0,
          subject_unit_id: 0,
          question_type: 'multiple_choice',
          is_active: true,
          category: 'onet' as const,
        });
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadSampleCSV = () => {
    const csv = `คำถาม,ตัวเลือก A,ตัวเลือก B,ตัวเลือก C,ตัวเลือก D,เฉลย,คำอธิบาย,ระดับความยาก,วิชา
"ข้อใดเป็นธาตุ?","น้ำ","อากาศ","ทองแดง","เกลือ","C","ทองแดงเป็นธาตุที่มีอยู่ในธรรมชาติ",2,"วิทยาศาสตร์"
"ข้อใดไม่ใช่ทรัพยากรธรรมชาติ?","ป่าไม้","แร่ธาตุ","น้ำมันปาล์ม","น้ำทะเล","C","น้ำมันปาล์มเป็นผลิตภัณฑ์จากมนุษย์",2,"วิทยาศาสตร์"
"1 + 2 เท่ากับ多少?","2","3","4","5","C","บวกเลขง่ายๆ",1,"คณิตศาสตร์"
"คำว่า 'beautiful' แปลว่าอะไร?","สวย","ใหญ่","เร็ว","สูง","A","Beautiful แปลว่า สวย",1,"ภาษาอังกฤษ"`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_onet_questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const difficultyLabel = (d: number) => d === 1 ? 'ง่าย' : d === 2 ? 'ปานกลาง' : 'ยาก';
  const difficultyColor = (d: number) => d === 1 ? 'bg-green-100 text-green-700' : d === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  const subjectColor = (s: string) => {
    const colors: Record<string, string> = {
      'วิทยาศาสตร์': 'bg-emerald-100 text-emerald-700',
      'คณิตศาสตร์': 'bg-blue-100 text-blue-700',
      'ภาษาไทย': 'bg-purple-100 text-purple-700',
      'ภาษาอังกฤษ': 'bg-amber-100 text-amber-700',
    };
    return colors[s] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileHeader title="ข้อสอบ O-NET" />
      <AdminSidebar />
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🎯 ข้อสอบ O-NET</h1>
            <p className="text-slate-500 text-sm mt-1">จัดการข้อสอบสำหรับการสอบ O-NET ระดับชั้นประถมศึกษา</p>
          </div>
          <div className="flex gap-2">
            {onetQuestions.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(`ต้องการลบข้อสอบ O-NET ทั้งหมด ${onetQuestions.length} ข้อ ใช่หรือไม่?`)) {
                    deleteQuestionsByCategory('onet');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >🗑️ ล้างทั้งหมด ({onetQuestions.length})</button>
            )}
            <button onClick={() => downloadSampleCSV()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">⬇ ตัวอย่าง CSV</button>
            <label className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 cursor-pointer">
              📁 นำเข้าจากไฟล์
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ เพิ่มข้อสอบใหม่</button>
          </div>
        </div>

        {/* Subject Filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition border ${
              !selectedSubject
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({onetQuestions.length})
          </button>
          {ONET_SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition border ${
                selectedSubject === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s} ({subjectCounts[s] || 0})
            </button>
          ))}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">{editingId ? 'แก้ไขข้อสอบ' : 'เพิ่มข้อสอบใหม่'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">วิชา *</label>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">เลือกวิชา</option>
                  {ONET_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">ระดับความยาก</label>
                <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: parseInt(e.target.value) as 1 | 2 | 3 })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value={1}>ง่าย</option>
                  <option value={2}>ปานกลาง</option>
                  <option value={3}>ยาก</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1">คำถาม *</label>
                <textarea rows={2} value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="พิมพ์คำถาม..." />
              </div>
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt}>
                  <label className="text-sm font-medium block mb-1">ตัวเลือก {opt} {opt === 'A' || opt === 'B' ? '*' : ''}</label>
                  <input value={form[`option_${opt.toLowerCase()}` as keyof typeof form] as string} onChange={e => setForm({ ...form, [`option_${opt.toLowerCase()}`]: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder={`ตัวเลือก ${opt}`} />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium block mb-1">เฉลย *</label>
                <select value={form.correct_answer} onChange={e => setForm({ ...form, correct_answer: e.target.value as 'A' | 'B' | 'C' | 'D' })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  {['A', 'B', 'C', 'D'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1">คำอธิบายเฉลย</label>
                <textarea rows={2} value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="อธิบายเหตุผลของเฉลย..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={resetForm} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">💾 บันทึก</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold">ข้อสอบทั้งหมด ({filteredQuestions.length} ข้อ)</p>
          </div>
          {filteredQuestions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-4xl mb-3">🎯</p>
              <p>ยังไม่มีข้อสอบ O-NET</p>
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
                  {filteredQuestions.map((q, i) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${(q as any).subject ? subjectColor((q as any).subject) : 'bg-slate-100 text-slate-500'}`}>
                          {(q as any).subject || '-'}
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
                          <button onClick={() => handleEdit(q)} className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100">✏️ แก้ไข</button>
                          <button onClick={() => deleteQuestion(Number(q.id))} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">🗑️ ลบ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
