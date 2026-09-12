import { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { GRADES } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import TeacherMobileHeader from '../components/TeacherMobileHeader';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

type ViewMode = 'grid' | 'list';

export default function AdminUnits() {
  const { subjects, addSubject, updateSubject, deleteSubject, toggleSubjectActive, lessons, questions } = useAppStore();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUnit, setEditUnit] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Form state
  const [formGrade, setFormGrade] = useState(1);
  const [formUnitCode, setFormUnitCode] = useState('');
  const [formUnitName, setFormUnitName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const getUnitsByGrade = (grade: number) => subjects.filter(s => s.grade_level === grade);
  const getLessonCount = (unitId: number) => lessons.filter(l => l.subject_unit_id === unitId).length;
  const getQuestionCount = (unitId: number) => questions.filter(q => q.subject_unit_id === unitId).length;

  const filteredUnits = selectedGrade ? subjects.filter(s => s.grade_level === selectedGrade) : subjects;
  const gradeCounts = GRADES.map(g => ({
    ...g,
    count: getUnitsByGrade(g.level).length,
  }));

  const resetForm = () => {
    setFormGrade(1);
    setFormUnitCode('');
    setFormUnitName('');
    setFormDescription('');
    setEditUnit(null);
  };

  const openAddModal = (grade?: number) => {
    resetForm();
    if (grade) setFormGrade(grade);
    // Auto-generate unit code
    const existingUnits = getUnitsByGrade(grade || 1);
    const nextNum = existingUnits.length + 1;
    setFormUnitCode(`U.${nextNum}`);
    setShowAddModal(true);
  };

  const openEditModal = (unitId: number) => {
    const unit = subjects.find(s => s.id === unitId);
    if (unit) {
      setFormGrade(unit.grade_level);
      setFormUnitCode(unit.unit_code);
      setFormUnitName(unit.unit_name);
      setFormDescription(unit.description);
      setEditUnit(unitId);
      setShowAddModal(true);
    }
  };

  const handleSave = () => {
    if (!formUnitName.trim()) return;

    if (editUnit) {
      updateSubject(editUnit, {
        grade_level: formGrade,
        unit_code: formUnitCode,
        unit_name: formUnitName,
        description: formDescription,
      });
    } else {
      addSubject({
        grade_level: formGrade,
        unit_code: formUnitCode,
        unit_name: formUnitName,
        description: formDescription,
        is_active: true,
      });
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = (id: number) => {
    deleteSubject(id);
    setConfirmDelete(null);
  };

  const gradeColors: Record<number, { bg: string; border: string; text: string; badge: string }> = {
    1: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
    2: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700' },
    3: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    4: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
    5: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' },
    6: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  };

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <TeacherMobileHeader title="หน่วยการเรียนรู้" />
      <AdminSidebar />

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100 overflow-hidden bg-white">
          {/* Violet Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-purple-100 text-xs font-semibold mb-2">
                  <span>📂 โครงสร้างหลักสูตรวิทยาศาสตร์</span>
                  <span>•</span>
                  <span>ป.1 - ป.6</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>📚 ระบบจัดการหน่วยการเรียนรู้</span>
                </h1>
                <p className="text-purple-100/80 text-xs md:text-sm mt-1">
                  จัดการสาระและหน่วยการเรียนรู้ กำหนดรหัสหน่วย และเชื่อมโยงบทเรียน-ข้อสอบ
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* View Mode Toggle */}
                <div className="flex bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'grid' ? 'bg-white text-purple-800 shadow-sm' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    📊 การ์ด
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'list' ? 'bg-white text-purple-800 shadow-sm' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    📋 ตาราง
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="px-4 py-2 rounded-xl bg-white text-purple-700 hover:bg-purple-50 text-xs font-bold shadow-md shadow-purple-950/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>เพิ่มหน่วยใหม่</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grade Filter Tabs */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 md:px-6 py-3 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button
                type="button"
                onClick={() => setSelectedGrade(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGrade === null
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ทั้งหมด ({subjects.length})
              </button>
              {gradeCounts.map(g => (
                <button
                  key={g.level}
                  type="button"
                  onClick={() => setSelectedGrade(g.level)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedGrade === g.level
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {g.label} ({g.count})
                </button>
              ))}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 md:p-6">
            {/* Grid View */}
            {viewMode === 'grid' ? (
          <div className="space-y-6">
            {GRADES.filter(g => !selectedGrade || g.level === selectedGrade).map(grade => {
              const units = getUnitsByGrade(grade.level);
              const colors = gradeColors[grade.level];
              return (
                <div key={grade.level} className={`rounded-2xl border ${colors.border} ${colors.bg} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${colors.text}`}>{grade.label}</span>
                      <span className="text-sm text-slate-500">• {units.length} หน่วยการเรียนรู้</span>
                    </div>
                    <button
                      onClick={() => openAddModal(grade.level)}
                      className={`text-sm px-3 py-1.5 rounded-lg ${colors.badge} hover:opacity-80 font-medium`}
                    >➕ เพิ่มหน่วย</button>
                  </div>
                  {units.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-4xl mb-2">📭</p>
                      <p className="text-sm">ยังไม่มีหน่วยการเรียนรู้</p>
                      <button
                        onClick={() => openAddModal(grade.level)}
                        className="mt-2 text-blue-600 text-sm hover:underline"
                      >+ สร้างหน่วยแรก</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {units.map(unit => (
                        <div key={unit.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${colors.badge}`}>{unit.unit_code}</span>
                              {!unit.is_active && (
                                <span className="px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-500">ปิดใช้งาน</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleSubjectActive(unit.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition ${
                                  unit.is_active
                                    ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                                title={unit.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                              >{unit.is_active ? '🟢' : '⚪'}</button>
                              <button
                                onClick={() => openEditModal(unit.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-blue-50 text-blue-600 hover:bg-blue-100"
                                title="แก้ไข"
                              >✏️</button>
                              <button
                                onClick={() => setConfirmDelete(unit.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-red-50 text-red-500 hover:bg-red-100"
                                title="ลบ"
                              >🗑️</button>
                            </div>
                          </div>
                          <h4 className="font-semibold text-slate-800 mb-1">{unit.unit_name}</h4>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{unit.description}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>📖 {getLessonCount(unit.id)} บทเรียน</span>
                            <span>❓ {getQuestionCount(unit.id)} ข้อสอบ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">รหัส</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">ชั้นเรียน</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">ชื่อหน่วย</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">คำอธิบาย</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">บทเรียน</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">ข้อสอบ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">สถานะ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map(unit => {
                  const colors = gradeColors[unit.grade_level];
                  return (
                    <tr key={unit.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${colors.badge}`}>{unit.unit_code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${colors.badge}`}>{GRADES.find(g => g.level === unit.grade_level)?.label}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{unit.unit_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{unit.description}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{getLessonCount(unit.id)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{getQuestionCount(unit.id)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleSubjectActive(unit.id)}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                            unit.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {unit.is_active ? '🟢 เปิดใช้งาน' : '⚪ ปิดใช้งาน'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(unit.id)}
                            className="px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >✏️ แก้ไข</button>
                          <button
                            onClick={() => setConfirmDelete(unit.id)}
                            className="px-2 py-1 rounded-lg text-xs bg-red-50 text-red-500 hover:bg-red-100"
                          >🗑️ ลบ</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUnits.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-2">📭</p>
                <p className="font-semibold text-slate-600">ยังไม่มีหน่วยการเรียนรู้</p>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 p-5 text-white">
              <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{editUnit ? '✏️ แก้ไขหน่วยการเรียนรู้' : '➕ เพิ่มหน่วยการเรียนรู้ใหม่'}</span>
              </h3>
              <p className="text-xs text-purple-100/80 mt-0.5">
                กำหนดรหัสและชื่อหน่วยการเรียนรู้เพื่อจัดหมวดหมู่บทเรียน
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">ชั้นเรียน <span className="text-rose-500">*</span></label>
                <select
                  value={formGrade}
                  onChange={e => {
                    const g = Number(e.target.value);
                    setFormGrade(g);
                    if (!editUnit) {
                      const existing = getUnitsByGrade(g);
                      setFormUnitCode(`U.${existing.length + 1}`);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all"
                >
                  {GRADES.map(g => (
                    <option key={g.level} value={g.level}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">รหัสหน่วย <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formUnitCode}
                  onChange={e => setFormUnitCode(e.target.value)}
                  placeholder="เช่น U.1, U.2"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">ชื่อหน่วยการเรียนรู้ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formUnitName}
                  onChange={e => setFormUnitName(e.target.value)}
                  placeholder="เช่น สิ่งมีชีวิตกับสิ่งแวดล้อม"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">คำอธิบาย</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="อธิบายเนื้อหาและสาระสำคัญของหน่วยการเรียนรู้นี้"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none transition-all"
                />
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-all active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!formUnitName.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
                ⚠️
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1.5">ยืนยันการลบหน่วยการเรียนรู้</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                ต้องการลบหน่วยการเรียนรู้นี้จริงหรือไม่?<br />
                <span className="text-rose-500 font-bold">ข้อสอบและบทเรียนที่เชื่อมอยู่จะไม่ถูกลบ</span>
              </p>
              <div className="flex gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDelete)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-95"
                >
                  🗑️ ยืนยันลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
