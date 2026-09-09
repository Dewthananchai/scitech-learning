import { useState, useMemo, useRef } from 'react';
import { useUsers, type AppUser } from '../store/useStore';
import { useAttendance } from '../store/useStore';
import { useMissions } from '../store/useStore';
import { useLessonSession } from '../store/useStore';
import { useLessonProgress } from '../store/useStore';
import { useAppStore } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import MobileHeader from '../components/MobileHeader';
import AdminSidebar from '../components/AdminSidebar';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

const GRADES = [1, 2, 3, 4, 5, 6];
const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  present: { label: 'มา', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  absent: { label: 'ไม่มา', color: 'bg-red-100 text-red-700', icon: '❌' },
  late: { label: 'สาย', color: 'bg-amber-100 text-amber-700', icon: '⏰' },
  leave: { label: 'ลา', color: 'bg-blue-100 text-blue-700', icon: '📝' },
};

type Tab = 'users' | 'attendance' | 'stars';

export default function AdminUsers() {
  const { users, addUser, updateUser, deleteUser, toggleUserActive, getUsersByRole, getStudentsByGrade } = useUsers();
  const { sessions: attSessions, records: attRecords, addSession, updateSession, deleteSession, toggleSessionStatus, addRecord, updateRecord } = useAttendance();
  const { missions, completions, getCompletionsForMission, getCompletionsForStudent } = useMissions();
  const { sessions: lessonSessions } = useLessonSession();
  const { progress: lessonProgress } = useLessonProgress();
  const { grades } = useAppStore();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<AppUser[]>([]);
  const [importPreview, setImportPreview] = useState(false);
  const [showAttForm, setShowAttForm] = useState(false);
  const [editAttId, setEditAttId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  // User form
  const [userForm, setUserForm] = useState({
    username: '', password: '', full_name: '', role: 'student' as 'student' | 'teacher' | 'admin',
    grade_level: 1, class_name: '', school_name: '', is_active: true,
  });

  // Attendance form
  const [attForm, setAttForm] = useState({
    title: '', date: new Date().toISOString().split('T')[0], time: '08:30', grade_level: 1,
  });

  // Filtered users
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (userRoleFilter !== 'all') list = list.filter(u => u.role === userRoleFilter);
    if (gradeFilter) list = list.filter(u => u.role !== 'student' || u.grade_level === gradeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u => u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : a.role === 'teacher' ? 0 : 1;
      return a.id - b.id;
    });
  }, [users, userRoleFilter, gradeFilter, searchQuery]);

  // Filtered attendance sessions
  const filteredAttSessions = useMemo(() => {
    let list = [...attSessions];
    if (gradeFilter) list = list.filter(s => s.grade_level === gradeFilter);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [attSessions, gradeFilter]);

  const activeSession = attSessions.find(s => s.id === selectedSession);
  const sessionRecords = useMemo(() => {
    if (!selectedSession) return [];
    return attRecords.filter(r => r.session_id === selectedSession);
  }, [attRecords, selectedSession]);

  // Stars stats
  const totalStars = useMemo(() => {
    return completions.reduce((sum, c) => sum + c.stars_earned, 0);
  }, [completions]);

  const studentStats = useMemo(() => {
    const students = users.filter(u => u.role === 'student');
    return students.map(s => {
      const studentCompletions = completions.filter(c => c.student_id === s.id);
      const stars = studentCompletions.reduce((sum, c) => sum + c.stars_earned, 0);
      const completedLessons = lessonProgress.filter(p => p.student_id === s.id).length;
      const totalLessons = lessonProgress.length > 0 ? new Set(lessonProgress.map(p => p.lesson_id)).size : 0;
      return {
        ...s,
        stars,
        completedLessons,
        totalLessons,
        quizCount: studentCompletions.length,
      };
    }).sort((a, b) => b.stars - a.stars);
  }, [users, completions, lessonProgress]);

  // User CRUD
  const resetUserForm = () => {
    setUserForm({ username: '', password: '', full_name: '', role: 'student', grade_level: 1, class_name: '', school_name: '', is_active: true });
    setEditUser(null);
    setShowUserForm(false);
  };

  const handleUserSubmit = () => {
    if (!userForm.username || !userForm.full_name) return;
    if (editUser) {
      updateUser(editUser.id, userForm);
    } else {
      addUser(userForm);
    }
    resetUserForm();
  };

  // CSV Import handler
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert('ไฟล์ CSV ว่างเปล่าหรือไม่มีข้อมูล'); return; }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      const nameIdx = header.findIndex(h => h.includes('name') || h.includes('ชื่อ'));
      const usernameIdx = header.findIndex(h => h.includes('username') || h.includes('user'));
      const passwordIdx = header.findIndex(h => h.includes('pass') || h.includes('รหัส'));
      const gradeIdx = header.findIndex(h => h.includes('grade') || h.includes('ชั้น') || h.includes('level'));
      const classIdx = header.findIndex(h => h.includes('class') || h.includes('ห้อง') || h.includes('room'));

      const parsed: AppUser[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        const fullName = nameIdx >= 0 ? cols[nameIdx] : cols[0];
        const username = usernameIdx >= 0 ? cols[usernameIdx] : `student${Date.now()}${i}`;
        const password = passwordIdx >= 0 ? cols[passwordIdx] : '1234';
        const gradeLevel = gradeIdx >= 0 ? parseInt(cols[gradeIdx]) || 1 : 1;
        const className = classIdx >= 0 ? cols[classIdx] : `${gradeLevel}/1`;
        if (!fullName) continue;
        parsed.push({
          id: Date.now() + i,
          username,
          password,
          full_name: fullName,
          role: 'student',
          grade_level: gradeLevel,
          class_name: className,
          is_active: true,
          created_at: new Date().toISOString().split('T')[0],
        });
      }
      setImportData(parsed);
      setShowImportModal(true);
      setImportPreview(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    importData.forEach(u => addUser(u));
    alert(`✅ นำเข้าสำเร็จ ${importData.length} คน`);
    setImportData([]);
    setShowImportModal(false);
    setImportPreview(false);
  };

  const handleEditUser = (u: AppUser) => {
    setUserForm({
      username: u.username, password: u.password, full_name: u.full_name, role: u.role,
      grade_level: u.grade_level || 1, class_name: u.class_name || '', school_name: u.school_name || '', is_active: u.is_active,
    });
    setEditUser(u);
    setShowUserForm(true);
  };

  // Attendance CRUD
  const resetAttForm = () => {
    setAttForm({ title: '', date: new Date().toISOString().split('T')[0], time: '08:30', grade_level: 1 });
    setEditAttId(null);
    setShowAttForm(false);
  };

  const handleAttSubmit = () => {
    if (!attForm.title || !attForm.date) return;
    if (editAttId) {
      updateSession(editAttId, attForm);
    } else {
      addSession({ ...attForm, status: 'open', created_by: currentUser?.full_name || 'Admin' });
    }
    resetAttForm();
  };

  const handleEditAtt = (s: typeof attSessions[0]) => {
    setAttForm({ title: s.title, date: s.date, time: s.time || '08:30', grade_level: s.grade_level });
    setEditAttId(s.id);
    setShowAttForm(true);
  };

  const handleMarkAbsent = (sessionId: number) => {
    const session = attSessions.find(s => s.id === sessionId);
    if (!session) return;
    const students = getStudentsByGrade(session.grade_level);
    students.forEach(st => {
      const exists = attRecords.find(r => r.session_id === sessionId && r.student_id === st.id);
      if (!exists) {
        addRecord({
          session_id: sessionId,
          student_id: st.id,
          student_name: st.full_name,
          grade_level: session.grade_level,
          status: 'absent',
        });
      }
    });
  };

  const toggleRecordStatus = (recordId: number) => {
    const record = attRecords.find(r => r.id === recordId);
    if (!record) return;
    const order: Array<typeof record.status> = ['present', 'late', 'leave', 'absent'];
    const nextStatus = order[(order.indexOf(record.status) + 1) % order.length];
    updateRecord(recordId, { status: nextStatus });
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'users', label: 'จัดการผู้ใช้งาน', icon: '👥' },
    { key: 'attendance', label: 'การเข้าเรียน', icon: '📋' },
    { key: 'stars', label: 'ดาวและสถิติ', icon: '⭐' },
  ];

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <AdminSidebar />
      <MobileHeader title="จัดการผู้ใช้และการเข้าเรียน" />

      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-7xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl shadow-xl shadow-emerald-900/5 border border-emerald-100 overflow-hidden bg-white">
          {/* Emerald/Teal Gradient Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600 p-6 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-emerald-100 text-xs font-semibold mb-2">
                  <span>👥 ระบบบริหารจัดการผู้ใช้และชั้นเรียน</span>
                  <span>•</span>
                  <span>ครูและนักเรียน</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>👥 จัดการผู้ใช้และการเข้าเรียน</span>
                </h1>
                <p className="text-emerald-100/90 text-xs md:text-sm mt-1">
                  จัดการบัญชีผู้ใช้ ครู-นักเรียน บันทึกการเข้าเรียน และสถิติดาวสะสม
                </p>
              </div>
            </div>
          </div>

          {/* Subtabs + Grade Filter Bar */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 md:px-6 py-3 space-y-2.5">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Grade Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-200/50">
              <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">ระดับชั้น:</span>
              <button
                type="button"
                onClick={() => setGradeFilter(null)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !gradeFilter ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด
              </button>
              {GRADES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradeFilter(g)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    gradeFilter === g ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ป.{g}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 md:p-6">

        {/* ==================== TAB: USERS ==================== */}
        {activeTab === 'users' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">👨‍🏫 ครูผู้สอน</p>
                <p className="text-2xl font-bold text-emerald-600">{users.filter(u => u.role === 'teacher' || u.role === 'admin').length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">🎓 นักเรียน</p>
                <p className="text-2xl font-bold text-violet-600">{users.filter(u => u.role === 'student').length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">🟢 เปิดใช้งาน</p>
                <p className="text-2xl font-bold text-amber-600">{users.filter(u => u.is_active).length}</p>
              </div>
            </div>

            {/* Search + Filter + Add */}
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 ค้นหาชื่อหรือ username..."
                className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <div className="flex gap-2">
                {(['all', 'student', 'teacher'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      userRoleFilter === r ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >{r === 'all' ? 'ทั้งหมด' : r === 'student' ? '🎓 นักเรียน' : '👨‍🏫 ครู'}</button>
                ))}
              </div>
              <label className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 cursor-pointer flex items-center gap-1">
                📁 Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>
              <button
                onClick={() => { resetUserForm(); setShowUserForm(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
              >+ เพิ่มผู้ใช้</button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500">ลำดับ</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500">ชื่อ-สกุล</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500">Username</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-slate-500">บทบาท</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-slate-500">ชั้น/ห้อง</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-slate-500">สถานะ</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-slate-500">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                              u.role === 'admin' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' :
                              u.role === 'teacher' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                              'bg-gradient-to-br from-amber-400 to-orange-500'
                            }`}>
                              {u.role === 'student' ? '🎓' : '👨‍🏫'}
                            </div>
                            <span className="font-medium">{u.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{u.username}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'teacher' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {u.role === 'admin' ? '👑 แอดมิน' : u.role === 'teacher' ? '👨‍🏫 ครู' : '🎓 นักเรียน'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {u.role === 'student' ? `ป.${u.grade_level}/${u.class_name?.split('/')[1] || '-'}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleUserActive(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}
                          >{u.is_active ? '🟢 ใช้งาน' : '🔴 ปิด'}</button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handleEditUser(u)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100">✏️</button>
                            <button onClick={() => { if (confirm(`ลบ ${u.full_name}?`)) deleteUser(u.id); }} className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-slate-400">ไม่พบผู้ใช้</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: ATTENDANCE ==================== */}
        {activeTab === 'attendance' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">รายการทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-600">{attSessions.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">เปิดอยู่</p>
                <p className="text-2xl font-bold text-emerald-600">{attSessions.filter(s => s.status === 'open').length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">ปิดแล้ว</p>
                <p className="text-2xl font-bold text-slate-500">{attSessions.filter(s => s.status === 'closed').length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">บันทึกทั้งหมด</p>
                <p className="text-2xl font-bold text-violet-600">{attRecords.length}</p>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => { resetAttForm(); setShowAttForm(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
              >+ สร้างรายการเช็คชื่อ</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Session List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow p-4">
                  <h3 className="font-bold text-sm mb-3">📋 รายการเช็คชื่อ</h3>
                  {filteredAttSessions.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 text-sm">ยังไม่มีรายการ</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredAttSessions.map(s => {
                        const recCount = attRecords.filter(r => r.session_id === s.id);
                        const presentCount = recCount.filter(r => r.status === 'present' || r.status === 'late').length;
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSession(s.id)}
                            className={`p-3 rounded-xl cursor-pointer transition-all border ${
                              selectedSession === s.id
                                ? 'border-blue-400 bg-blue-50 shadow-sm'
                                : 'border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-sm truncate flex-1">{s.title}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                s.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>{s.status === 'open' ? '🟢 เปิด' : '⚫ ปิด'}</span>
                            </div>
                            <p className="text-xs text-slate-500">📅 {s.date} {s.time && `⏰ ${s.time}`}</p>
                            <p className="text-xs text-slate-500 mt-0.5">🎓 ป.{s.grade_level} • {recCount.length} คน ({presentCount} มา)</p>
                            <div className="flex gap-1 mt-2">
                              <button onClick={(e) => { e.stopPropagation(); handleEditAtt(s); }} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">✏️ แก้ไข</button>
                              <button onClick={(e) => { e.stopPropagation(); toggleSessionStatus(s.id); }} className={`text-[10px] px-2 py-1 rounded-lg ${s.status === 'open' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                {s.status === 'open' ? '🔒 ปิด' : '🔓 เปิด'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); if (confirm('ลบรายการนี้?')) deleteSession(s.id); }} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">🗑️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Detail */}
              <div className="lg:col-span-2">
                {activeSession ? (
                  <div className="bg-white rounded-2xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{activeSession.title}</h3>
                        <p className="text-sm text-slate-500">📅 {activeSession.date} | 🎓 ป.{activeSession.grade_level} | {sessionRecords.length} คนถูกบันทึก</p>
                      </div>
                      <button onClick={() => handleMarkAbsent(activeSession.id)} className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-medium hover:bg-amber-600">📝 บันทึกขาดอัตโนมัติ</button>
                    </div>

                    {/* Quick Mark */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getStudentsByGrade(activeSession.grade_level).map(st => {
                        const existing = attRecords.find(r => r.session_id === activeSession.id && r.student_id === st.id);
                        const statusInfo = existing ? STATUS_LABELS[existing.status] : null;
                        return (
                          <button
                            key={st.id}
                            onClick={() => {
                              if (existing) {
                                toggleRecordStatus(existing.id);
                              } else {
                                addRecord({ session_id: activeSession.id, student_id: st.id, student_name: st.full_name, grade_level: activeSession.grade_level, status: 'present' });
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                              existing ? `${statusInfo?.color} border-transparent` : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <span>{existing ? statusInfo?.icon : '⭕'}</span>
                            <span>{st.full_name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Records */}
                    {sessionRecords.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">ลำดับ</th>
                              <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">ชื่อนักเรียน</th>
                              <th className="text-center py-2 px-3 text-xs font-bold text-slate-500">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessionRecords.map((r, idx) => {
                              const stInfo = STATUS_LABELS[r.status];
                              return (
                                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                                  <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-medium">{r.student_name}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button onClick={() => toggleRecordStatus(r.id)} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${stInfo.color}`}>
                                      {stInfo.icon} {stInfo.label}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-8 text-sm">ยังไม่มีบันทึก — คลิกชื่อนักเรียนด้านบนเพื่อบันทึก</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow p-12 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-slate-400 text-lg">เลือกรายการเช็คชื่อทางซ้ายเพื่อดูรายละเอียด</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: STARS & STATS ==================== */}
        {activeTab === 'stars' && (
          <div>
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-md">
                <p className="text-sm opacity-90 mb-1">⭐ ดาวทั้งหมด</p>
                <p className="text-3xl font-bold">{totalStars.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">🎓 นักเรียนทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'student').length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">📝 ทำแบบทดสอบเสร็จ</p>
                <p className="text-2xl font-bold text-emerald-600">{completions.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">📖 บทเรียนที่เรียนจบ</p>
                <p className="text-2xl font-bold text-violet-600">{lessonProgress.length}</p>
              </div>
            </div>

            {/* Stars Leaderboard by Grade */}
            <div className="space-y-6 mb-6">
              {GRADES.map(g => {
                const gradeStudents = studentStats.filter(s => s.grade_level === g);
                if (gradeStudents.length === 0) return null;
                return (
                  <div key={g} className="bg-white rounded-2xl shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">{g}</div>
                      <div>
                        <h3 className="font-bold text-lg">🏆 อันดับดาว ป.{g}</h3>
                        <p className="text-xs text-slate-500">{gradeStudents.length} คน</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {gradeStudents.map((s, idx) => {
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                        return (
                          <div key={s.id} className={`flex items-center gap-4 p-3 rounded-xl ${idx < 3 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
                            <div className="text-lg w-8 text-center font-bold">{medal}</div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm">🎓</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{s.full_name}</p>
                              <p className="text-xs text-slate-500">ห้อง {s.class_name || '-'} • ทำแบบทดสอบ {s.quizCount} ครั้ง • เรียนจบ {s.completedLessons} บท</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-amber-600">⭐ {s.stars}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Per-Grade Stats */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-bold text-lg mb-4">📊 สถิติตามชั้นเรียน</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {GRADES.map(g => {
                  const gradeStudents = studentStats.filter(s => s.grade_level === g);
                  const gradeStars = gradeStudents.reduce((sum, s) => sum + s.stars, 0);
                  const gradeQuizzes = gradeStudents.reduce((sum, s) => sum + s.quizCount, 0);
                  return (
                    <div key={g} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🎓</span>
                        <p className="font-bold">ป.{g}</p>
                        <span className="text-xs text-slate-500">({gradeStudents.length} คน)</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">⭐ ดาวรวม</span>
                          <span className="font-bold text-amber-600">{gradeStars}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">📝 ทำแบบทดสอบ</span>
                          <span className="font-bold text-emerald-600">{gradeQuizzes} ครั้ง</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">👥 นักเรียน</span>
                          <span className="font-bold text-blue-600">{gradeStudents.length} คน</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>

      {/* ==================== USER FORM MODAL ==================== */}
        {showUserForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={resetUserForm}></div>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative z-10 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">{editUser ? '✏️ แก้ไขผู้ใช้' : '➕ เพิ่มผู้ใช้ใหม่'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ชื่อ-สกุล *</label>
                  <input type="text" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="ชื่อเต็ม" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <input type="text" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      placeholder="username" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">รหัสผ่าน *</label>
                    <input type="text" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      placeholder="รหัสผ่าน" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">บทบาท *</label>
                  <div className="flex gap-2">
                    {(['student', 'teacher', 'admin'] as const).map(r => (
                      <button key={r} onClick={() => setUserForm({ ...userForm, role: r })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                          userForm.role === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {r === 'admin' ? '👑 แอดมิน' : r === 'teacher' ? '👨‍🏫 ครู' : '🎓 นักเรียน'}
                      </button>
                    ))}
                  </div>
                </div>
                {userForm.role === 'student' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">ระดับชั้น</label>
                      <div className="flex flex-wrap gap-2">
                        {GRADES.map(g => (
                          <button key={g} onClick={() => setUserForm({ ...userForm, grade_level: g })}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              userForm.grade_level === g ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>ป.{g}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ชั้น/ห้อง</label>
                      <input type="text" value={userForm.class_name} onChange={e => setUserForm({ ...userForm, class_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                        placeholder="เช่น 3/1" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">เปิดใช้งาน</label>
                  <button onClick={() => setUserForm({ ...userForm, is_active: !userForm.is_active })}
                    className={`w-12 h-6 rounded-full transition-all ${userForm.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${userForm.is_active ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={resetUserForm} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">ยกเลิก</button>
                <button onClick={handleUserSubmit} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editUser ? 'บันทึก' : 'เพิ่มผู้ใช้'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ATTENDANCE FORM MODAL ==================== */}
        {showAttForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={resetAttForm}></div>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative z-10">
              <h3 className="text-lg font-bold mb-4">{editAttId ? 'แก้ไขรายการ' : 'สร้างรายการเช็คชื่อใหม่'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ชื่อรายการ *</label>
                  <input type="text" value={attForm.title} onChange={e => setAttForm({ ...attForm, title: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="เช่น เช็คชื่อวิทยาศาสตร์ ป.3" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">วันที่ *</label>
                    <input type="date" value={attForm.date} onChange={e => setAttForm({ ...attForm, date: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">เวลา</label>
                    <input type="time" value={attForm.time} onChange={e => setAttForm({ ...attForm, time: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ระดับชั้น *</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map(g => (
                      <button key={g} onClick={() => setAttForm({ ...attForm, grade_level: g })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                          attForm.grade_level === g ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>ป.{g}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={resetAttForm} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">ยกเลิก</button>
                <button onClick={handleAttSubmit} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editAttId ? 'บันทึก' : 'สร้างรายการ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== IMPORT CSV MODAL ==================== */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => { setShowImportModal(false); setImportData([]); }}></div>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative z-10 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-2">📁 นำเข้านักเรียนจาก CSV</h3>
              <p className="text-sm text-slate-500 mb-4">ตรวจสอบข้อมูลก่อนนำเข้า ({importData.length} คน)</p>

              {/* CSV Format Guide */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">📋 รูปแบบไฟล์ CSV:</p>
                <p className="text-xs text-slate-500 mb-1">คอลัมน์ที่รองรับ: <span className="font-mono bg-white px-1 rounded">name, username, password, grade, class</span></p>
                <div className="bg-white rounded-lg p-3 mt-2 font-mono text-xs text-slate-600 border border-slate-200">
                  <p className="text-slate-400">name,username,password,grade,class</p>
                  <p>ด.ช. สมชาย ใจดี,somchai,1234,3,3/1</p>
                  <p>ด.ญ. สมหญิง สดใส,somying,1234,3,3/2</p>
                </div>
                <a href="/example_students.csv" download className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">⬇️ ดาวน์โหลดตัวอย่าง CSV</a>
              </div>

              {/* Preview Table */}
              {importData.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">#</th>
                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">ชื่อ-สกุล</th>
                        <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">Username</th>
                        <th className="text-center py-2 px-3 text-xs font-bold text-slate-500">รหัสผ่าน</th>
                        <th className="text-center py-2 px-3 text-xs font-bold text-slate-500">ชั้น</th>
                        <th className="text-center py-2 px-3 text-xs font-bold text-slate-500">ห้อง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((u, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium">{u.full_name}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-xs">{u.username}</td>
                          <td className="py-2 px-3 text-center text-slate-500 font-mono text-xs">{u.password}</td>
                          <td className="py-2 px-3 text-center">ป.{u.grade_level}</td>
                          <td className="py-2 px-3 text-center text-slate-500">{u.class_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-6 text-sm">ไม่มีข้อมูลให้นำเข้า</p>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">ยกเลิก</button>
                <button onClick={handleConfirmImport} disabled={importData.length === 0}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${
                    importData.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'
                  }`}>
                  ✅ ยืนยันนำเข้า {importData.length} คน
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
