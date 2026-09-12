import { useState } from 'react';
import { useAnnouncements } from '../store/useStore';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import TeacherMobileHeader from '../components/TeacherMobileHeader';
import TeacherBottomNav from '../components/TeacherBottomNav';
import AdminSidebar from '../components/AdminSidebar';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';
import type { Announcement } from '../types';

const typeOptions = [
  { value: 'info', label: '📢 ข้อมูลทั่วไป', color: 'bg-blue-100 text-blue-700' },
  { value: 'urgent', label: '🚨 ด่วน', color: 'bg-red-100 text-red-700' },
  { value: 'event', label: '🎉 กิจกรรม', color: 'bg-purple-100 text-purple-700' },
  { value: 'assignment', label: '📝 งาน/แบบทดสอบ', color: 'bg-amber-100 text-amber-700' },
];

const audienceOptions = [
  { value: 'all', label: 'ทุกคน' },
  { value: 'students', label: 'นักเรียน' },
  { value: 'teachers', label: 'ครู' },
];

export default function AdminAnnouncements() {
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements();
  const { grades } = useAppStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info' as Announcement['type'],
    target_audience: 'all' as Announcement['target_audience'],
    grade_levels: [] as number[],
    is_active: true,
  });

  const resetForm = () => {
    setForm({ title: '', content: '', type: 'info', target_audience: 'all', grade_levels: [], is_active: true });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.title || !form.content) return;
    if (editId) {
      updateAnnouncement(editId, form);
    } else {
      addAnnouncement({ ...form, created_by: user?.full_name || 'ผู้ดูแลระบบ' });
    }
    resetForm();
  };

  const handleEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      target_audience: a.target_audience,
      grade_levels: a.grade_levels || [],
      is_active: a.is_active,
    });
    setEditId(a.id);
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

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <AdminSidebar />
      <TeacherMobileHeader title="จัดการประกาศ" />
        <TeacherBottomNav />
      
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-rose-900/5 border border-rose-100 overflow-hidden bg-white">
          {/* Rose Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-rose-100 text-xs font-semibold mb-2">
                  <span>📢 ระบบสื่อสารและข่าวสารโรงเรียน</span>
                  <span>•</span>
                  <span>{announcements.length} รายการ</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>📢 จัดการประกาศและข่าวสาร</span>
                </h1>
                <p className="text-rose-100/90 text-xs md:text-sm mt-1">
                  สร้างและเผยแพร่ข่าวสาร กิจกรรม และแบบทดสอบสำคัญสำหรับนักเรียนและครู
                </p>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(true); }}
                className="px-4 py-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-md shadow-rose-950/20 transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>➕</span>
                <span>สร้างประกาศใหม่</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 md:p-6">
            {announcements.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-rose-100 p-12 text-center text-slate-400 bg-rose-50/20">
                <p className="text-5xl mb-3">📢</p>
                <p className="text-base font-bold text-slate-700 mb-1">ยังไม่มีประกาศในระบบ</p>
                <p className="text-xs text-slate-500 mb-4">คลิกปุ่มด้านบนเพื่อสร้างประกาศแรกสำหรับนักเรียนและครู</p>
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90"
                >
                  + สร้างประกาศใหม่
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {announcements.map(a => {
                  const typeInfo = typeOptions.find(t => t.value === a.type);
                  return (
                    <div
                      key={a.id}
                      className={`rounded-2xl p-5 border transition-all hover:shadow-md ${
                        a.type === 'urgent'
                          ? 'border-rose-200 bg-rose-50/30'
                          : a.type === 'event'
                          ? 'border-purple-200 bg-purple-50/30'
                          : a.type === 'assignment'
                          ? 'border-amber-200 bg-amber-50/30'
                          : 'border-slate-200 bg-white'
                      } ${!a.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${typeInfo?.color || 'bg-slate-100'}`}>
                              {typeInfo?.label}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">🕒 {a.created_at}</span>
                            {!a.is_active && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-600">
                                ⚪ ปิดใช้งาน
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-800 text-base mb-1.5">{a.title}</h3>
                          <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{a.content}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100/80 text-xs text-slate-500">
                            <span>👤 {a.created_by}</span>
                            <span>•</span>
                            <span>👥 ผู้รับ: <strong>{audienceOptions.find(o => o.value === a.target_audience)?.label}</strong></span>
                            {a.grade_levels && a.grade_levels.length > 0 && (
                              <>
                                <span>•</span>
                                <span>📚 ชั้น: <strong>{a.grade_levels.map(g => `ป.${g}`).join(', ')}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={() => handleEdit(a)}
                            className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all"
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (confirm('ต้องการลบประกาศนี้?')) deleteAnnouncement(a.id); }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            🗑️ ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={resetForm}>
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 p-5 text-white">
              <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{editId ? '✏️ แก้ไขประกาศ' : '📢 สร้างประกาศใหม่'}</span>
              </h3>
              <p className="text-xs text-rose-100/80 mt-0.5">
                กำหนดหัวข้อ ข้อมูลสำคัญ และกลุ่มเป้าหมายผู้รับประกาศ
              </p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">หัวข้อประกาศ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition-all"
                  placeholder="ระบุหัวข้อประกาศ"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เนื้อหาประกาศ <span className="text-rose-500">*</span></label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none resize-none transition-all"
                  placeholder="พิมพ์เนื้อหาประกาศ..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ประเภทประกาศ</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as Announcement['type'] })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition-all"
                  >
                    {typeOptions.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">กลุ่มเป้าหมาย</label>
                  <select
                    value={form.target_audience}
                    onChange={e => setForm({ ...form, target_audience: e.target.value as Announcement['target_audience'] })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition-all"
                  >
                    {audienceOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.target_audience !== 'teachers' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">ระดับชั้น (เลือกได้หลายชั้น หรือเว้นว่างเพื่อส่งทุกชั้น)</label>
                  <div className="flex flex-wrap gap-2">
                    {grades.map(g => (
                      <button
                        key={g.level}
                        type="button"
                        onClick={() => toggleGrade(g.level)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          form.grade_levels.includes(g.level)
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-400"
                  />
                  <span className="text-xs font-bold text-slate-700">เปิดใช้งานประกาศนี้ทันที</span>
                </label>
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
                disabled={!form.title.trim() || !form.content.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {editId ? '💾 บันทึกการแก้ไข' : '✅ สร้างประกาศ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
