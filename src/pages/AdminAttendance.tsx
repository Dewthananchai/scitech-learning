import { useState, useMemo } from 'react';
import { useAttendance } from '../store/useStore';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import MobileHeader from '../components/MobileHeader';
import AdminSidebar from '../components/AdminSidebar';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

// Demo students by grade
const STUDENTS_BY_GRADE: Record<number, { id: number; name: string }[]> = {
  1: [
    { id: 11, name: 'ด.ญ. ปุณญ่า สดใส' },
    { id: 21, name: 'ด.ช. อาทิตย์ ฉายแสง' },
    { id: 22, name: 'ด.ญ. จันทร์เจ้า สว่าง' },
    { id: 23, name: 'ด.ช. วิชญ์ พัฒนา' },
  ],
  2: [
    { id: 12, name: 'ด.ช. นพณัฐ น้ำใจ' },
    { id: 24, name: 'ด.ญ. ดารารัตน์ บุญมี' },
    { id: 25, name: 'ด.ช. พลวัฒน์ ทองดี' },
  ],
  3: [
    { id: 10, name: 'ด.ช. ภูมิภัทร รักเรียน' },
    { id: 26, name: 'ด.ญ. ศรันย์ สดใส' },
    { id: 27, name: 'ด.ช. กฤษณะ พัฒนา' },
    { id: 28, name: 'ด.ญ. ชนิดา สุขใจ' },
  ],
  4: [
    { id: 29, name: 'ด.ช. นเรศ ชาญชัย' },
    { id: 30, name: 'ด.ญ. บุษบา มาลัย' },
    { id: 31, name: 'ด.ช. ปวเรศ รุ่งเรือง' },
  ],
  5: [
    { id: 32, name: 'ด.ช. ภัทร วงศ์ประเสริฐ' },
    { id: 33, name: 'ด.ญ. มณี สดใส' },
    { id: 34, name: 'ด.ช. ยุคล ชนะใจ' },
  ],
  6: [
    { id: 35, name: 'ด.ช. รัฐภูมิ ศรีสุวรรณ' },
    { id: 36, name: 'ด.ญ. วรรณพร เจริญสุข' },
    { id: 37, name: 'ด.ช. อรรถพล นนท์' },
  ],
};

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6];
const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  present: { label: 'มา', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  absent: { label: 'ไม่มา', color: 'bg-red-100 text-red-700', icon: '❌' },
  late: { label: 'สาย', color: 'bg-amber-100 text-amber-700', icon: '⏰' },
  leave: { label: 'ลา', color: 'bg-blue-100 text-blue-700', icon: '📝' },
};

export default function AdminAttendance() {
  const { sessions, records, addSession, updateSession, deleteSession, toggleSessionStatus, addRecord, updateRecord } = useAttendance();
  const { grades } = useAppStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:30',
    grade_level: 1,
  });

  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    if (gradeFilter) list = list.filter(s => s.grade_level === gradeFilter);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, gradeFilter]);

  const activeSession = sessions.find(s => s.id === selectedSession);
  const sessionRecords = useMemo(() => {
    if (!selectedSession) return [];
    return records.filter(r => r.session_id === selectedSession);
  }, [records, selectedSession]);

  const resetForm = () => {
    setForm({ title: '', date: new Date().toISOString().split('T')[0], time: '08:30', grade_level: 1 });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.title || !form.date) return;
    if (editId) {
      updateSession(editId, form);
    } else {
      addSession({
        ...form,
        status: 'open',
        created_by: user?.full_name || 'Admin',
      });
    }
    resetForm();
  };

  const handleEdit = (s: typeof sessions[0]) => {
    setForm({ title: s.title, date: s.date, time: s.time || '08:30', grade_level: s.grade_level });
    setEditId(s.id);
    setShowForm(true);
  };

  // Auto-mark absent for students who haven't checked in
  const handleMarkAbsent = (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const students = STUDENTS_BY_GRADE[session.grade_level] || [];
    students.forEach(st => {
      const exists = records.find(r => r.session_id === sessionId && r.student_id === st.id);
      if (!exists) {
        addRecord({
          session_id: sessionId,
          student_id: st.id,
          student_name: st.name,
          grade_level: session.grade_level,
          status: 'absent',
        });
      }
    });
  };

  const toggleRecordStatus = (recordId: number) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    const order: Array<typeof record.status> = ['present', 'late', 'leave', 'absent'];
    const currentIdx = order.indexOf(record.status);
    const nextStatus = order[(currentIdx + 1) % order.length];
    updateRecord(recordId, { status: nextStatus });
  };

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <AdminSidebar />
      <MobileHeader title="จัดการการเข้าเรียน" />

      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-teal-900/5 border border-teal-100 overflow-hidden bg-white">
          {/* Teal/Emerald Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-emerald-100 text-xs font-semibold mb-2">
                  <span>📋 ระบบบันทึกการเข้าเรียน</span>
                  <span>•</span>
                  <span>{sessions.length} รายการ</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>📋 จัดการการเข้าเรียน</span>
                </h1>
                <p className="text-emerald-100/90 text-xs md:text-sm mt-1">
                  สร้างรายการเช็คชื่อประจำวัน บันทึกสถานะ มา-สาย-ลา-ขาด และสรุปสถิติชั้นเรียน
                </p>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(true); }}
                className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-md shadow-emerald-950/20 transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>➕</span>
                <span>สร้างรายการเช็คชื่อ</span>
              </button>
            </div>
          </div>

          {/* Grade Filter Bar */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 md:px-6 py-3 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button
                type="button"
                onClick={() => setGradeFilter(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !gradeFilter
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ทั้งหมด ({sessions.length})
              </button>
              {GRADE_OPTIONS.map(g => {
                const count = sessions.filter(s => s.grade_level === g).length;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradeFilter(g)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      gradeFilter === g
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    ป.{g} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 md:p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-[11px] font-bold text-slate-500 mb-1">📋 รายการทั้งหมด</p>
                <p className="text-2xl font-black text-emerald-700">{sessions.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100">
                <p className="text-[11px] font-bold text-slate-500 mb-1">🟢 กำลังเปิดอยู่</p>
                <p className="text-2xl font-black text-teal-700">{sessions.filter(s => s.status === 'open').length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-500 mb-1">⚫ ปิดรายการแล้ว</p>
                <p className="text-2xl font-black text-slate-600">{sessions.filter(s => s.status === 'closed').length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <p className="text-[11px] font-bold text-slate-500 mb-1">👥 บันทึกทั้งหมด</p>
                <p className="text-2xl font-black text-blue-700">{records.length}</p>
              </div>
            </div>

            {/* Split View: Left Sessions List, Right Attendance Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Session List */}
              <div className="lg:col-span-1 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>รายการเช็คชื่อ</span>
                    <span className="text-slate-400 font-normal">({filteredSessions.length})</span>
                  </h3>
                  {filteredSessions.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 text-xs">ยังไม่มีรายการเช็คชื่อ</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredSessions.map(s => {
                        const recCount = records.filter(r => r.session_id === s.id);
                        const presentCount = recCount.filter(r => r.status === 'present' || r.status === 'late').length;
                        const isSelected = selectedSession === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSession(s.id)}
                            className={`p-3 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                                : 'bg-white border-slate-200/70 hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-800 truncate">{s.title}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {s.status === 'open' ? '🟢 เปิด' : '⚫ ปิด'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>ป.{s.grade_level} • 🕒 {s.date} {s.time}</span>
                              <span className="font-bold text-emerald-700">มา {presentCount}/{recCount.length}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Details Sheet */}
              <div className="lg:col-span-2">
                {activeSession ? (
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            ป.{activeSession.grade_level}
                          </span>
                          <h3 className="font-black text-base text-slate-800">{activeSession.title}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 {activeSession.date} {activeSession.time} • สร้างโดย {activeSession.created_by}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSessionStatus(activeSession.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            activeSession.status === 'open'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {activeSession.status === 'open' ? '🔒 ปิดรายการ' : '🔓 เปิดรายการ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutoFillStudents(activeSession.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                        >
                          👥 โหลดรายชื่อ ป.{activeSession.grade_level}
                        </button>
                      </div>
                    </div>

                    {/* Quick Student Status Bar */}
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-2">คลิกเพื่อเปลี่ยนสถานะนักเรียน:</p>
                      <div className="flex flex-wrap gap-2">
                        {(STUDENTS_BY_GRADE[activeSession.grade_level] || []).map(st => {
                          const existing = sessionRecords.find(r => r.student_id === st.id);
                          const statusInfo = existing ? STATUS_LABELS[existing.status] : null;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                if (existing) {
                                  toggleRecordStatus(existing.id);
                                } else {
                                  addRecord({
                                    session_id: activeSession.id,
                                    student_id: st.id,
                                    student_name: st.name,
                                    grade_level: activeSession.grade_level,
                                    status: 'present',
                                  });
                                }
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                                existing
                                  ? `${statusInfo?.color} border-transparent shadow-xs`
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              <span>{existing ? statusInfo?.icon : '⭕'}</span>
                              <span>{st.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Records Table */}
                    {sessionRecords.length > 0 ? (
                      <div className="overflow-x-auto pt-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                              <th className="text-left py-2.5 px-3 font-bold w-12">#</th>
                              <th className="text-left py-2.5 px-3 font-bold">ชื่อ-สกุลนักเรียน</th>
                              <th className="text-center py-2.5 px-3 font-bold">สถานะการเข้าเรียน</th>
                              <th className="text-center py-2.5 px-3 font-bold">เวลาที่บันทึก</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sessionRecords.map((r, idx) => {
                              const stInfo = STATUS_LABELS[r.status];
                              return (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-bold text-slate-800">{r.student_name}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleRecordStatus(r.id)}
                                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all hover:scale-105 active:scale-95 ${stInfo.color}`}
                                    >
                                      {stInfo.icon} {stInfo.label}
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-400">
                                    {r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                        <p className="text-3xl mb-1">📋</p>
                        <p className="text-xs">ยังไม่มีบันทึก — คลิกชื่อนักเรียนด้านบนเพื่อเริ่มเช็คชื่อ</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                    <p className="text-4xl mb-2">📋</p>
                    <p className="text-sm font-bold text-slate-600">เลือกรายการเช็คชื่อจากรายการทางซ้าย</p>
                    <p className="text-xs text-slate-400 mt-1">เพื่อเปิดสมุดบันทึกเวลาเรียนและเช็คชื่อนักเรียน</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={resetForm}>
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600 p-5 text-white">
              <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{editId ? '✏️ แก้ไขรายการ' : '📋 สร้างรายการเช็คชื่อใหม่'}</span>
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                กำหนดชื่อวิชา วันที่ เวลา และระดับชั้นเรียน
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อรายการเช็คชื่อ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
                  placeholder="เช่น เช็คชื่อวิทยาศาสตร์ ป.1 (เช้า)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">วันที่ <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">เวลา</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ระดับชั้นเรียน *</label>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, grade_level: g })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        form.grade_level === g
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ป.{g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!form.title.trim() || !form.date}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {editId ? '💾 บันทึก' : '✅ สร้างรายการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
