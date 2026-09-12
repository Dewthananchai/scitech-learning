import { useState, useMemo } from 'react';
import { useCalendarEvents } from '../store/useStore';
import { useAppStore } from '../store/AppContext';
import TeacherMobileHeader from '../components/TeacherMobileHeader';
import TeacherBottomNav from '../components/TeacherBottomNav';
import AdminSidebar from '../components/AdminSidebar';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';
import type { CalendarEvent } from '../types';

const eventTypeOptions = [
  { value: 'lesson', label: '📚 บทเรียน', color: '#3b82f6' },
  { value: 'exam', label: '📝 สอบ', color: '#ef4444' },
  { value: 'holiday', label: '🏖️ วันหยุด', color: '#10b981' },
  { value: 'assignment', label: '📋 งาน', color: '#f59e0b' },
  { value: 'event', label: '🎉 กิจกรรม', color: '#8b5cf6' },
];

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export default function AdminCalendar() {
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const { grades } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // กันยายน พ.ศ.2569
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    end_date: '',
    type: 'lesson' as CalendarEvent['type'],
    color: '#3b82f6',
    grade_levels: [] as number[],
  });

  const resetForm = () => {
    setForm({ title: '', description: '', date: '', time: '', end_date: '', type: 'lesson', color: '#3b82f6', grade_levels: [] });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.title || !form.date) return;
    if (editId) {
      updateEvent(editId, form);
    } else {
      addEvent(form);
    }
    resetForm();
  };

  const handleEdit = (e: CalendarEvent) => {
    setForm({
      title: e.title,
      description: e.description || '',
      date: e.date,
      time: e.time || '',
      end_date: e.end_date || '',
      type: e.type,
      color: e.color,
      grade_levels: e.grade_levels || [],
    });
    setEditId(e.id);
    setShowForm(true);
  };

  const toggleGrade = (level: number) => {
    setForm(prev => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(level)
        ? prev.grade_levels.filter(g => g !== level)
        : [...prev.grade_levels, level],
    }));
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate]);

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr || (e.end_date && dateStr >= e.date && dateStr <= e.end_date));
  };

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <AdminSidebar />
      <TeacherMobileHeader title="จัดการปฏิทิน" />
        <TeacherBottomNav />
      
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-teal-900/5 border border-teal-100 overflow-hidden bg-white">
          {/* Cyan/Teal Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-teal-100 text-xs font-semibold mb-2">
                  <span>📅 ระบบปฏิทินการศึกษา</span>
                  <span>•</span>
                  <span>{MONTHS_TH[month]} {year + 543}</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>📅 จัดการปฏิทินและกิจกรรม</span>
                </h1>
                <p className="text-teal-100/90 text-xs md:text-sm mt-1">
                  วางแผนกำหนดการสอน การสอบ วันสำคัญ และวันหยุดราชการของโรงเรียน
                </p>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(true); }}
                className="px-4 py-2.5 rounded-xl bg-white text-teal-800 hover:bg-teal-50 text-xs font-bold shadow-md shadow-teal-950/20 transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>➕</span>
                <span>เพิ่มกิจกรรมใหม่</span>
              </button>
            </div>
          </div>

          {/* Month Navigation & Controls */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 md:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month - 1))}
                  className="px-2.5 py-1 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-bold transition-all"
                >
                  ◀ เดือนก่อน
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month + 1))}
                  className="px-2.5 py-1 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-bold transition-all"
                >
                  เดือนถัดไป ▶
                </button>
              </div>
              <span className="text-sm font-black text-slate-800">
                {MONTHS_TH[month]} พ.ศ. {year + 543}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>กิจกรรมทั้งหมด {events.length} รายการ</span>
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {DAYS_TH.map(d => (
                <div key={d} className="text-center text-xs font-black text-slate-500 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  {d}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="min-h-[72px] md:min-h-[90px] rounded-xl bg-slate-50/30"></div>;
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={day}
                    className={`min-h-[72px] md:min-h-[90px] p-2 rounded-xl border transition-all hover:shadow-sm ${
                      dayEvents.length > 0 ? 'border-teal-200 bg-teal-50/20' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className={`font-black text-xs md:text-sm mb-1 ${dayEvents.length > 0 ? 'text-teal-700' : 'text-slate-700'}`}>
                      {day}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map(e => (
                        <div
                          key={e.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: e.color + '20', color: e.color }}
                          title={e.title}
                          onClick={() => handleEdit(e)}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] font-bold text-slate-400 pl-1">
                          +{dayEvents.length - 2} อื่นๆ
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events List Bottom Section */}
          <div className="border-t border-slate-100 p-4 md:p-6 bg-slate-50/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>📋 รายการกิจกรรมทั้งหมด</span>
                <span className="text-xs font-normal text-slate-500">({events.length} รายการ)</span>
              </h3>
            </div>
            {events.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-xs">ยังไม่มีกิจกรรมที่บันทึกไว้</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {events.sort((a, b) => a.date.localeCompare(b.date)).map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/70 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: e.color }}></div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs md:text-sm text-slate-800 truncate">{e.title}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          📅 {e.date.split('-').map((p, i) => i === 0 ? String(Number(p) + 543) : p).join('-')}{e.end_date ? ` - ${e.end_date.split('-').map((p, i) => i === 0 ? String(Number(p) + 543) : p).join('-')}` : ''}
                          {e.grade_levels && e.grade_levels.length > 0 && ` • ${e.grade_levels.map(g => `ป.${g}`).join(', ')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(e)}
                        className="px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm('ต้องการลบกิจกรรมนี้?')) deleteEvent(e.id); }}
                        className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={resetForm}>
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 p-5 text-white">
              <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{editId ? '✏️ แก้ไขกิจกรรม' : '📅 เพิ่มกิจกรรมใหม่'}</span>
              </h3>
              <p className="text-xs text-teal-100/80 mt-0.5">
                กำหนดวันสำคัญ การสอบ วันหยุด หรือกิจกรรมของโรงเรียน
              </p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อกิจกรรม <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all"
                  placeholder="เช่น สอบกลางภาคเรียนที่ 1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบาย</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none resize-none transition-all"
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">วันที่เริ่มต้น <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ถึงวันที่ (ถ้ามี)</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ประเภทกิจกรรม</label>
                <div className="flex flex-wrap gap-2">
                  {eventTypeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.value as CalendarEvent['type'], color: opt.color })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        form.type === opt.value ? 'text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      style={form.type === opt.value ? { backgroundColor: opt.color } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ระดับชั้นที่เกี่ยวข้อง</label>
                <div className="flex flex-wrap gap-2">
                  {grades.map(g => (
                    <button
                      key={g.level}
                      type="button"
                      onClick={() => toggleGrade(g.level)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        form.grade_levels.includes(g.level)
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {g.label}
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
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {editId ? '💾 บันทึกการแก้ไข' : '✅ บันทึกกิจกรรม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
