import { useState, useRef, useMemo } from 'react';
import { useAuth } from '../store/AuthContext';
import { useMissions, useLessonProgress, useLessonSession, useAttendance } from '../store/useStore';
import MobileHeader from '../components/MobileHeader';
import StudentSidebar from '../components/StudentSidebar';
import AdminSidebar from '../components/AdminSidebar';
import { STUDENT_THEME_CSS, TEACHER_THEME_CSS } from '../styles/studentTheme';

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { completions } = useMissions();
  const { progress } = useLessonProgress();
  const { sessions: lessonSessions } = useLessonSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'attendance'>('profile');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  // Stats
  const totalStars = completions.filter(c => c.student_id === user.id).reduce((sum, c) => sum + c.stars_earned, 0);
  const completedLessons = lessonSessions.filter(s => s.student_id === user.id && s.status === 'completed').length;
  const totalQuizzes = completions.filter(c => c.student_id === user.id).length;

  // Attendance
  const { sessions: attendanceSessions, records: attendanceRecords } = useAttendance();
  const myGrade = user.grade_level || 3;
  const openSessions = useMemo(() =>
    attendanceSessions.filter(s => s.status === 'open' && s.grade_level === myGrade),
    [attendanceSessions, myGrade]
  );
  const myRecords = useMemo(() =>
    attendanceRecords
      .filter(r => r.student_id === user.id)
      .sort((a, b) => {
        const sA = attendanceSessions.find(s => s.id === a.session_id);
        const sB = attendanceSessions.find(s => s.id === b.session_id);
        return (sB?.date || '').localeCompare(sA?.date || '');
      }),
    [attendanceRecords, user.id, attendanceSessions]
  );
  const attendanceStats = useMemo(() => {
    const total = myRecords.length;
    const present = myRecords.filter(r => r.status === 'present').length;
    const late = myRecords.filter(r => r.status === 'late').length;
    const absent = myRecords.filter(r => r.status === 'absent').length;
    const leave = myRecords.filter(r => r.status === 'leave').length;
    return { total, present, late, absent, leave };
  }, [myRecords]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'ไฟล์ต้องมีขนาดไม่เกิน 5MB' });
      return;
    }
    // Compress image using canvas to keep base64 small enough for localStorage
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200; // max width/height in pixels
        let { width, height } = img;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          try {
            updateProfile({ profile_image: base64 });
            setMessage({ type: 'success', text: '✅ เปลี่ยนรูปโปรไฟล์สำเร็จ!' });
          } catch {
            setMessage({ type: 'error', text: '❌ พื้นที่จัดเก็บเต็ม กรุณาลบรูปอื่นๆ ก่อน' });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveName = () => {
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่อ-สกุล' });
      return;
    }
    updateProfile({ full_name: fullName.trim() });
    setMessage({ type: 'success', text: '✅ บันทึกชื่อสำเร็จ!' });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
      return;
    }
    changePassword(newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage({ type: 'success', text: '✅ เปลี่ยนรหัสผ่านสำเร็จ!' });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
  };

  return (
    <div className={user.role === 'student' ? 'st-page min-h-screen' : 'teacher-page min-h-screen'}>
      <style>{user.role === 'student' ? STUDENT_THEME_CSS : TEACHER_THEME_CSS}</style>
      {user.role === 'student' ? <StudentSidebar /> : <AdminSidebar />}
      <MobileHeader title={user.role === 'admin' ? 'โปรไฟล์ผู้สอน' : 'โปรไฟล์ของฉัน'} />

      <main className={`${user.role === 'student' ? 'md:ml-20 lg:ml-64' : 'md:ml-64'} pt-16 md:pt-16 lg:pt-4 pb-28 md:pb-12 px-3.5 md:px-6 transition-all`}>
        {/* Header */}
        {user.role === 'admin' ? (
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>👨‍🏫</span> ข้อมูลโปรไฟล์ผู้สอน
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
              จัดการข้อมูลบัญชีผู้สอน รูปโปรไฟล์ และเปลี่ยนรหัสผ่านเพื่อความปลอดภัยของระบบ
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold st-title">🏆 โปรไฟล์ของฉัน</h1>
            <p className="text-xs md:text-sm mt-1 st-sub">จัดการข้อมูลส่วนตัว สถิติการเรียน และรหัสผ่าน</p>
          </div>
        )}

        {/* Profile Card */}
        <div className={user.role === 'admin' ? 'bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden mb-6' : 'bg-white rounded-2xl shadow p-6 mb-6'}>
          {user.role === 'admin' && (
            <div className="relative bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 px-6 py-5 text-white teacher-glow-overlay">
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md text-emerald-200 text-sm">
                    👤
                  </span>
                  <div>
                    <h2 className="text-base font-black text-white">บัญชีผู้ดูแลระบบ / คุณครู</h2>
                    <p className="text-xs text-emerald-100 font-medium">SciTech Learning Instructor Profile</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/20">
                  Role: Teacher / Admin
                </span>
              </div>
            </div>
          )}

          <div className={user.role === 'admin' ? 'p-6 md:p-8' : ''}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div
                  className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg cursor-pointer ring-4 ring-emerald-500/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {user.profile_image ? (
                    <img src={user.profile_image} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-3xl font-bold">
                      {getInitials(user.full_name)}
                    </div>
                  )}
                </div>
                <div
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-white text-2xl">📷</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-slate-800">{user.full_name}</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {user.role === 'admin' ? '👨‍🏫 ครูผู้สอน / แอดมินผู้ดูแลระบบ' : `🎓 นักเรียน ป.${user.grade_level}/${user.classroom?.split('/')[1] || ''}`}
                </p>
                <p className="text-slate-400 text-xs mt-1">Username: <span className="font-mono font-medium text-slate-600">{user.username}</span></p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-3 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all ${user.role === 'admin' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-700'}`}
                >📷 เปลี่ยนรูปโปรไฟล์</button>
              </div>

              {/* Stats */}
              {user.role === 'student' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">⭐ {totalStars}</p>
                    <p className="text-xs text-slate-500">ดาว</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-500">📖 {completedLessons}</p>
                    <p className="text-xs text-slate-500">บทเรียน</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">📝 {totalQuizzes}</p>
                    <p className="text-xs text-slate-500">แบบทดสอบ</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? user.role === 'admin'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >👤 แก้ไขข้อมูล</button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'password'
                ? user.role === 'admin'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >🔒 เปลี่ยนรหัสผ่าน</button>
          {user.role === 'student' && (
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm'}`}
            >📋 การเข้าเรียน</button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-2xl text-sm font-semibold flex items-center justify-between ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' : 'bg-red-50 text-red-800 border border-red-200 shadow-sm'}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 ml-2 font-bold">✕</button>
          </div>
        )}

        {/* Profile Edit */}
        {activeTab === 'profile' && (
          <div className={user.role === 'admin' ? 'bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 md:p-8' : 'bg-white rounded-2xl shadow p-6'}>
            <h3 className="font-bold text-lg mb-4 text-slate-800">👤 แก้ไขข้อมูลส่วนตัว</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">ชื่อ-สกุล</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none ${user.role === 'admin' ? 'focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500' : 'focus:ring-2 focus:ring-blue-400'}`}
                  placeholder="กรอกชื่อ-สกุล"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Username</label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-400 font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Username ไม่สามารถเปลี่ยนได้</p>
              </div>
              {user.role === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">ระดับชั้น</label>
                    <input
                      type="text"
                      value={`ป.${user.grade_level}`}
                      disabled
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">ห้อง</label>
                    <input
                      type="text"
                      value={user.classroom || '-'}
                      disabled
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-400"
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleSaveName}
                className={user.role === 'admin' ? 'px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all' : 'px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700'}
              >💾 บันทึก</button>
            </div>
          </div>
        )}

        {/* Password Change */}
        {activeTab === 'password' && (
          <div className={user.role === 'admin' ? 'bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 md:p-8' : 'bg-white rounded-2xl shadow p-6'}>
            <h3 className="font-bold text-lg mb-4 text-slate-800">🔒 เปลี่ยนรหัสผ่าน</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">รหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none pr-10 ${user.role === 'admin' ? 'focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500' : 'focus:ring-2 focus:ring-blue-400'}`}
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัว)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >{showPassword ? '👁️' : '👁️‍🗨️'}</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none ${user.role === 'admin' ? 'focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500' : 'focus:ring-2 focus:ring-blue-400'}`}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                />
              </div>
              <button
                onClick={handleChangePassword}
                className={user.role === 'admin' ? 'px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all' : 'px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700'}
              >🔒 เปลี่ยนรหัสผ่าน</button>
            </div>
          </div>
        )}

        {/* Attendance */}
        {activeTab === 'attendance' && user.role === 'student' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'ทั้งหมด', value: attendanceStats.total, color: 'from-slate-400 to-slate-500', icon: '📋' },
                { label: 'มา', value: attendanceStats.present, color: 'from-emerald-400 to-teal-500', icon: '✅' },
                { label: 'สาย', value: attendanceStats.late, color: 'from-amber-400 to-orange-500', icon: '⏰' },
                { label: 'ไม่มา', value: attendanceStats.absent, color: 'from-red-400 to-rose-500', icon: '❌' },
                { label: 'ลา', value: attendanceStats.leave, color: 'from-blue-400 to-indigo-500', icon: '📝' },
              ].map((s, i) => (
                <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-white text-center shadow-md`}>
                  <span className="text-lg">{s.icon}</span>
                  <p className="text-xl font-bold mt-1">{s.value}</p>
                  <p className="text-[11px] opacity-80">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Records */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <p className="font-semibold">📋 ประวัติการเข้าเรียน ({myRecords.length} รายการ)</p>
              </div>
              {myRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>ยังไม่มีประวัติการเข้าเรียน</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {myRecords.map((record) => {
                    const session = attendanceSessions.find(s => s.id === record.session_id);
                    const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
                      present: { label: 'มา', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
                      absent: { label: 'ไม่มา', color: 'bg-red-100 text-red-700', icon: '❌' },
                      late: { label: 'สาย', color: 'bg-amber-100 text-amber-700', icon: '⏰' },
                      leave: { label: 'ลา', color: 'bg-blue-100 text-blue-700', icon: '📝' },
                    };
                    const st = STATUS_MAP[record.status] || STATUS_MAP.absent;
                    return (
                      <div key={record.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                        <span className="text-xl">{st.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{session?.title || 'คาบเรียน'}</p>
                          <p className="text-xs text-slate-500">{session?.date || '-'} {session?.time ? `• ${session.time}` : ''}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
