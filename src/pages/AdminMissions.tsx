import { useState, useMemo } from 'react';
import { useMissions, useLessons } from '../store/useStore';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import TeacherMobileHeader from '../components/TeacherMobileHeader';
import TeacherBottomNav from '../components/TeacherBottomNav';
import AdminSidebar from '../components/AdminSidebar';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';
import {
  getStarConditions,
  setStarConditions,
  resetStarConditions,
  starConditionsTotal,
  getStudentAwards,
  type StarCondition,
} from '../lib/starAchievements';
import type { Mission } from '../types';

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function AdminMissions() {
  const { missions, completions, addMission, updateMission, deleteMission, getCompletionsForMission } = useMissions();
  const { lessons } = useLessons();
  const { grades } = useAppStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    grade_level: 1,
    stars_reward: 10,
    question_count: 5,
    lesson_id: 0,
    is_daily_random: false,
  });

  const filteredMissions = useMemo(() => {
    let list = [...missions];
    if (gradeFilter) list = list.filter(m => m.grade_level === gradeFilter);
    return list;
  }, [missions, gradeFilter]);

  const totalStars = completions.reduce((sum, c) => sum + c.stars_earned, 0);
  const totalCompletions = completions.length;

  /* ── 🎯 เงื่อนไขการได้ดาว (แก้ไขได้ — ซิงก์คลาวด์ทุกอุปกรณ์) ── */
  const [starRules, setStarRules] = useState<StarCondition[]>(() => getStarConditions());
  const [starSaved, setStarSaved] = useState(false);
  const [starEdited, setStarEdited] = useState(false);
  const updateStarRule = (key: StarCondition['key'], patch: Partial<StarCondition>) => {
    setStarRules(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
    setStarEdited(true);
    setStarSaved(false);
  };
  const handleSaveStarRules = () => {
    const clean = starRules.map(r => ({
      ...r,
      reward: Math.max(0, Math.min(100, Math.round(r.reward) || 0)),
      target: Math.max(1, Math.round(r.target) || 1),
    }));
    setStarConditions(clean);
    setStarRules(clean);
    setStarEdited(false);
    setStarSaved(true);
    setTimeout(() => setStarSaved(false), 2500);
  };
  const handleResetStarRules = () => {
    if (!confirm('รีเซ็ตเงื่อนไขดาวกลับค่าเริ่มต้น (3 บท +3⭐ · 100% +5⭐ · 3 ใบงาน +10⭐)?')) return;
    resetStarConditions();
    setStarRules(getStarConditions());
    setStarEdited(false);
    setStarSaved(false);
  };
  const starGoal = starRules.reduce((s, r) => s + r.reward, 0);

  const resetForm = () => {
    setForm({ title: '', description: '', grade_level: 1, stars_reward: 10, question_count: 5, lesson_id: 0, is_daily_random: false });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.title) return;
    if (editId) {
      updateMission(editId, form);
    } else {
      addMission({
        ...form,
        is_active: true,
        created_by: user?.full_name || 'Admin',
      });
    }
    resetForm();
  };

  const handleEdit = (m: Mission) => {
    setForm({
      title: m.title,
      description: m.description,
      grade_level: m.grade_level,
      stars_reward: m.stars_reward,
      question_count: m.question_count,
      lesson_id: m.lesson_id || 0,
      is_daily_random: m.is_daily_random,
    });
    setEditId(m.id);
    setShowForm(true);
  };

  const gradeLessons = useMemo(() =>
    lessons.filter(l => {
      const unit = grades.find(g => g.level === form.grade_level);
      return unit;
    }),
    [lessons, form.grade_level, grades]
  );

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <AdminSidebar />
      <TeacherMobileHeader title="จัดการภารกิจ" />
        <TeacherBottomNav />

      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100 overflow-hidden bg-white">
          {/* Fuchsia Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-pink-100 text-xs font-semibold mb-2">
                  <span>🎯 ระบบภารกิจรายวันและรางวัล</span>
                  <span>•</span>
                  <span>⭐ รวมแจก {totalStars} ดาว</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>🎯 จัดการภารกิจและดาวสะสม</span>
                </h1>
                <p className="text-pink-100/90 text-xs md:text-sm mt-1">
                  สร้างภารกิจรายวัน กำหนดจำนวนข้อและดาวรางวัล เพื่อสร้างแรงจูงใจในการเรียนรู้
                </p>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(true); }}
                className="px-4 py-2.5 rounded-xl bg-white text-purple-700 hover:bg-purple-50 text-xs font-bold shadow-md shadow-purple-950/20 transition-all active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>➕</span>
                <span>สร้างภารกิจใหม่</span>
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
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ทั้งหมด ({missions.length})
              </button>
              {GRADE_OPTIONS.map(g => {
                const count = missions.filter(m => m.grade_level === g).length;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradeFilter(g)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      gradeFilter === g
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
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
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                <p className="text-[11px] font-bold text-slate-500 mb-1">🎯 ภารกิจทั้งหมด</p>
                <p className="text-2xl font-black text-purple-700">{missions.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-[11px] font-bold text-slate-500 mb-1">🟢 เปิดใช้งาน</p>
                <p className="text-2xl font-black text-emerald-700">{missions.filter(m => m.is_active).length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100">
                <p className="text-[11px] font-bold text-slate-500 mb-1">👥 ทำเสร็จทั้งหมด</p>
                <p className="text-2xl font-black text-pink-700">{totalCompletions}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <p className="text-[11px] font-bold text-slate-500 mb-1">⭐ ดาวที่แจกแล้ว</p>
                <p className="text-2xl font-black text-amber-600">{totalStars}</p>
              </div>
            </div>

            {/* ── 🎯 เงื่อนไขการได้ดาว (ครูแก้ไขได้) ── */}
            <div className="rounded-2xl border-2 border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow">⭐</span>
                    เงื่อนไขการได้รับดาว
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    กติกา 3 ข้อที่นักเรียนต้องทำเพื่อรับดาว — แก้เป้าหมายและดาวรางวัลได้ (ซิงก์ทุกอุปกรณ์ทันที)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-white text-amber-700 border border-amber-200">
                    รวมสูงสุด {starGoal} ⭐
                  </span>
                  <button
                    type="button"
                    onClick={handleResetStarRules}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all"
                  >
                    ↺ ค่าเริ่มต้น
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStarRules}
                    disabled={!starEdited}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      starSaved ? 'bg-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    }`}
                  >
                    {starSaved ? '✅ บันทึกแล้ว' : '💾 บันทึกเงื่อนไข'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {starRules.map(rule => (
                  <div key={rule.key} className="rounded-2xl bg-white border border-amber-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{rule.emoji}</span>
                      <span className="text-xs font-bold text-slate-700 flex-1">
                        {rule.key === 'lessons3' ? 'เรียนบทเรียนครบ' : rule.key === 'exam100' ? 'ทำข้อสอบผ่าน' : 'ส่งใบงานครบ'}
                      </span>
                    </div>

                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      เป้าหมาย {rule.key === 'exam100' ? '(คะแนน %)' : '(จำนวน)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={rule.key === 'exam100' ? 100 : 50}
                      value={rule.target}
                      onChange={e => updateStarRule(rule.key, { target: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-400 outline-none transition-all mb-2.5"
                    />

                    <label className="block text-[11px] font-bold text-slate-500 mb-1">⭐ ดาวรางวัล</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rule.reward}
                      onChange={e => updateStarRule(rule.key, { reward: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-amber-700 focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                    />

                    <p className="text-[11px] text-slate-500 mt-2.5 leading-snug">
                      นักเรียน{rule.key === 'exam100' ? 'ทำข้อสอบได้' : 'ต้องทำครบ'}{' '}
                      <b className="text-slate-700">{rule.target}{rule.key === 'exam100' ? '%' : ` ${rule.key === 'lessons3' ? 'บทเรียน' : 'ใบงาน'}`}</b>{' '}
                      → รับ <b className="text-amber-600">+{rule.reward}⭐</b>
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 mt-3">
                ℹ️ การเปลี่ยนเงื่อนไขมีผลกับนักเรียนที่ยังไม่ได้รับดาวข้อนั้น — คนที่ได้ไปแล้วจะไม่ถูกเรียกเก็บคืน
              </p>
            </div>

            {/* Mission Cards Grid */}
            {filteredMissions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-purple-100 p-12 text-center text-slate-400 bg-purple-50/10">
                <p className="text-5xl mb-3">🎯</p>
                <p className="text-base font-bold text-slate-700 mb-1">ยังไม่มีภารกิจในหมวดนี้</p>
                <p className="text-xs text-slate-500 mb-4">คลิกปุ่ม "สร้างภารกิจใหม่" ด้านบนเพื่อเริ่มต้น</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMissions.map(m => {
                  const missionCompletions = getCompletionsForMission(m.id);
                  const lessonTitle = lessons.find(l => l.id === m.lesson_id)?.title;
                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                              ป.{m.grade_level}
                            </span>
                            {m.is_daily_random ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700">
                                🎲 สุ่มทุกวัน
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                                📖 เฉพาะบท
                              </span>
                            )}
                          </div>
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-600 border border-amber-200">
                            ⭐ +{m.stars_reward} ดาว
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-800 text-base mb-1">{m.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{m.description || 'ไม่มีคำอธิบาย'}</p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-3">
                          <span>📝 {m.question_count} ข้อ</span>
                          <span>•</span>
                          <span>{lessonTitle ? `📖 ${lessonTitle}` : '🎲 สุ่มข้อสอบ'}</span>
                          <span>•</span>
                          <span>👥 ทำแล้ว {missionCompletions.length} คน</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-[11px] text-slate-400">
                          สร้างโดย {m.created_by || 'ครูผู้สอน'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(m)}
                            className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all"
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (confirm('ต้องการลบภารกิจนี้?')) deleteMission(m.id); }}
                            className="px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Completion Preview */}
                      {missionCompletions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
                          <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span className="font-bold text-[11px]">ผู้ทำเสร็จล่าสุด:</span>
                            <span className="text-[10px] text-purple-600 font-bold">{missionCompletions.length} คน</span>
                          </div>
                          <div className="space-y-0.5">
                            {missionCompletions.slice(0, 3).map(c => (
                              <div key={c.id} className="flex items-center justify-between text-[11px] text-slate-600">
                                <span className="truncate">{c.student_name}</span>
                                <span className="text-amber-600 font-bold shrink-0">⭐ {c.stars_earned} ({c.total_correct}/{c.total_questions})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 p-5 text-white">
              <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{editId ? '✏️ แก้ไขภารกิจ' : '🎯 สร้างภารกิจใหม่'}</span>
              </h3>
              <p className="text-xs text-pink-100/80 mt-0.5">
                กำหนดเป้าหมายภารกิจ จำนวนข้อสอบ และจำนวนดาวรางวัล
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อภารกิจ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all"
                  placeholder="เช่น ตะลุยโจทย์สิ่งมีชีวิตรอบตัว ป.1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบาย</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none transition-all"
                  placeholder="อธิบายภารกิจ เช่น ตอบคำถามให้ถูกต้อง 5 ข้อเพื่อรับ 10 ดาว"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ระดับชั้น *</label>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, grade_level: g })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        form.grade_level === g
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ป.{g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">⭐ จำนวนดาวรางวัล</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.stars_reward}
                    onChange={e => setForm({ ...form, stars_reward: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">📝 จำนวนข้อสอบ</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.question_count}
                    onChange={e => setForm({ ...form, question_count: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">📖 บทเรียนที่เชื่อมโยง</label>
                <select
                  value={form.lesson_id}
                  onChange={e => setForm({ ...form, lesson_id: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all"
                >
                  <option value={0}>🎲 สุ่มจากบทเรียนทั้งหมดในระดับชั้น</option>
                  {lessons.filter(l => l.is_published).map(l => (
                    <option key={l.id} value={l.id}>📖 {l.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-2xl border border-purple-100">
                <input
                  type="checkbox"
                  id="daily_random"
                  checked={form.is_daily_random}
                  onChange={e => setForm({ ...form, is_daily_random: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="daily_random" className="text-xs cursor-pointer">
                  <span className="font-bold text-purple-900">🎲 สุ่มภารกิจใหม่ทุกวัน</span>
                  <span className="text-slate-500 block mt-0.5">ระบบจะสุ่มโจทย์อัตโนมัติจากบทเรียนที่นักเรียนเรียนจบแล้ว</span>
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
                disabled={!form.title.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {editId ? '💾 บันทึกการแก้ไข' : '✅ บันทึกภารกิจ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
