import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { asset } from '../lib/asset';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'student' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);
    if (result.success) {
      // Navigate based on actual role from login result
      const stored = localStorage.getItem('scitech_auth_user');
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white/80 backdrop-blur-md shadow-sm border-b border-blue-100">
        <Link to="/" className="flex items-center gap-3">
          <img src={asset('logo.png')} alt="SciTech" className="w-10 h-10 md:w-12 md:h-12 rounded-2xl shadow-fun object-cover" />
          <div>
            <p className="font-bold text-base md:text-lg text-gradient">SciTech Learning</p>
            <p className="text-[10px] md:text-xs text-slate-400">เรียนรู้วิทยาศาสตร์และเทคโนโลยี</p>
          </div>
        </Link>
        <Link to="/" className="text-sm text-slate-500 hover:text-blue-600 transition">← กลับหน้าแรก</Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={asset('logo.png')} alt="SciTech" className="w-20 h-20 rounded-3xl shadow-xl mx-auto mb-4 animate-float object-cover" />
            <h1 className="text-2xl md:text-3xl font-bold text-gradient mb-2">เข้าสู่ระบบ</h1>
            <p className="text-slate-500 text-sm">เลือกบทบาทของคุณเพื่อเข้าสู่ระบบ</p>
          </div>

          {/* Role Selection */}
          {!selectedRole && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedRole('admin')}
                className="w-full bg-white rounded-2xl shadow-lg p-6 border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform">
                    👨‍🏫
                  </div>
                  <div>
                    <p className="font-bold text-lg text-slate-800">ครูผู้สอน / แอดมิน</p>
                    <p className="text-sm text-slate-500">จัดการบทเรียน ข้อสอบ และดูรายงาน</p>
                  </div>
                  <span className="ml-auto text-slate-300 group-hover:text-blue-400 transition text-xl">→</span>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole('student')}
                className="w-full bg-white rounded-2xl shadow-lg p-6 border-2 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all duration-300 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform">
                    🎒
                  </div>
                  <div>
                    <p className="font-bold text-lg text-slate-800">นักเรียน</p>
                    <p className="text-sm text-slate-500">เข้าเรียน ทำแบบทดสอบ และดูคะแนน</p>
                  </div>
                  <span className="ml-auto text-slate-300 group-hover:text-emerald-400 transition text-xl">→</span>
                </div>
              </button>
            </div>
          )}

          {/* Login Form */}
          {selectedRole && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              {/* Role Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    selectedRole === 'admin' ? 'bg-blue-100' : 'bg-emerald-100'
                  }`}>
                    {selectedRole === 'admin' ? '👨‍🏫' : '🎒'}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedRole === 'admin' ? 'ครูผู้สอน' : 'นักเรียน'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedRole(null); setError(''); setUsername(''); setPassword(''); }}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  เปลี่ยน
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <p className="text-sm text-red-600">❌ {error}</p>
                  </div>
                )}

                {/* Username */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อผู้ใช้</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="กรอกชื่อผู้ใช้"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่าน</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 ${
                    selectedRole === 'admin'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                  }`}
                >
                  {submitting ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ'}
                </button>
              </form>

              {/* บัญชีใช้งานจริง — ไม่มีบัญชีทดสอบ */}
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-6">
            🔬 SciTech Learning © 2569 • แพลตฟอร์มการเรียนรู้วิทยาศาสตร์
          </p>
        </div>
      </main>
    </div>
  );
}
