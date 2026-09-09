import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { useWorksheets, useWorksheetSubmissions, useUsers } from '../store/useStore';
import { GRADES, Worksheet, WorksheetSubmission, WorksheetQuestion } from '../types';
import type { AppUser } from '../store/useStore';
import AdminSidebar from '../components/AdminSidebar';
import MobileHeader from '../components/MobileHeader';

const SUBJECTS = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา'];
const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง'];

/* ============ Types ============ */
interface StudentRow {
  user: AppUser;
  submission: WorksheetSubmission | null;
  status: 'not-submitted' | 'submitted' | 'graded';
}

/* ============ Main Component ============ */
export default function AdminGradeWorksheets() {
  const navigate = useNavigate();
  const { subjects: units } = useAppStore();
  const { worksheets } = useWorksheets();
  const { submissions, gradeSubmission } = useWorksheetSubmissions();
  const { users } = useUsers();

  // Cascading filter state
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | ''>('');
  const [filterUnit, setFilterUnit] = useState<number | ''>('');
  const [filterWorksheet, setFilterWorksheet] = useState<number | ''>('');
  const [currentRoom, setCurrentRoom] = useState('');

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
    return users.filter(u => u.role === 'student' && u.grade_level === filterGrade && u.is_active);
  }, [users, filterGrade]);

  // ---- Rooms (class_names) ----
  const rooms = useMemo(() => {
    const roomSet = new Set<string>();
    studentsForGrade.forEach(s => { if (s.class_name) roomSet.add(s.class_name); });
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
    const roomStudents = studentsForGrade.filter(s => s.class_name === currentRoom);
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
      const wsStudents = users.filter(u => u.role === 'student' && u.grade_level === ws.grade_level && u.is_active);
      const wsSubmissions = submissions.filter(s => s.worksheet_id === ws.id);
      const gradedSubs = wsSubmissions.filter(s => s.status === 'graded');
      const pendingSubs = wsSubmissions.filter(s => s.status !== 'graded');
      const notSubmitted = wsStudents.length - wsSubmissions.length;
      const pendingTotal = pendingSubs.length + notSubmitted;

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/60 to-sky-50">
      <MobileHeader title="ตรวจงาน" />
      <AdminSidebar />

      <div className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-5xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden">
          {/* Green topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 px-6 py-5 text-white">
            <div className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 90% -10%, rgba(255,255,255,.5), transparent 45%)' }} />
            <div className="relative z-10 flex items-center gap-4">
              <button onClick={() => navigate(-1)}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white text-lg transition-all"
              >←</button>
              <div>
                <h1 className="text-xl font-bold">📋 ตรวจงานนักเรียน</h1>
                <p className="text-xs opacity-90 mt-0.5">กรองข้อมูลเพื่อค้นหาใบงานที่ต้องการตรวจ</p>
              </div>
            </div>
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
                  <h3 className="text-sm font-bold text-amber-800">📝 ใบงานที่ยังไม่ได้ตรวจ ({overviewStats.ungradedWorksheets.length} รายการ)</h3>
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
                  const count = studentsForGrade.filter(s => s.class_name === room).length;
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
                            <span className="text-[11px] text-slate-400">· ส่งเมื่อ {new Date(sr.submission.submitted_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
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
                  ส่งเมื่อ {gradingSub.submitted_at ? new Date(gradingSub.submitted_at).toLocaleString('th-TH') : '-'}
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
