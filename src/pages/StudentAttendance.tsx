import { useState, useMemo } from 'react';
import { useAttendance } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import MobileHeader from '../components/MobileHeader';
import StudentSidebar from '../components/StudentSidebar';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  present: { label: 'มา', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  absent: { label: 'ไม่มา', color: 'bg-red-100 text-red-700', icon: '❌' },
  late: { label: 'สาย', color: 'bg-amber-100 text-amber-700', icon: '⏰' },
  leave: { label: 'ลา', color: 'bg-blue-100 text-blue-700', icon: '📝' },
};

export default function StudentAttendance() {
  const { sessions, records, addRecord } = useAttendance();
  const { user } = useAuth();
  const [checkedInSession, setCheckedInSession] = useState<number | null>(null);

  const myGrade = user?.grade_level || 3;

  // Open sessions for my grade
  const openSessions = useMemo(() =>
    sessions.filter(s => s.status === 'open' && s.grade_level === myGrade),
    [sessions, myGrade]
  );

  // My records
  const myRecords = useMemo(() =>
    records
      .filter(r => r.student_id === user?.id)
      .sort((a, b) => {
        const sA = sessions.find(s => s.id === a.session_id);
        const sB = sessions.find(s => s.id === b.session_id);
        return (sB?.date || '').localeCompare(sA?.date || '');
      }),
    [records, user?.id, sessions]
  );

  // Stats
  const totalSessions = myRecords.length;
  const presentCount = myRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const absentCount = myRecords.filter(r => r.status === 'absent').length;
  const leaveCount = myRecords.filter(r => r.status === 'leave').length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  const handleCheckIn = (sessionId: number) => {
    if (!user) return;
    addRecord({
      session_id: sessionId,
      student_id: user.id,
      student_name: user.full_name,
      grade_level: myGrade,
      status: 'present',
    });
    setCheckedInSession(sessionId);
    setTimeout(() => setCheckedInSession(null), 3000);
  };

  const myRecordForSession = (sessionId: number) =>
    myRecords.find(r => r.session_id === sessionId);

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="การเข้าเรียน" />
      <StudentSidebar />

      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-4 pb-28 md:pb-12 px-3.5 md:px-6 transition-all">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold st-title">📋 เช็คชื่อเข้าเรียน</h1>
          <p className="st-sub text-xs md:text-sm mt-1">บันทึกการมาเรียนและดูสถิติการเข้าเรียนของคุณ</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">เข้าเรียนทั้งหมด</p>
            <p className="text-2xl font-bold text-blue-600">{totalSessions} <span className="text-sm font-normal">ครั้ง</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-emerald-500 mb-1">✅ มาเรียน</p>
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-red-500 mb-1">❌ ไม่มา</p>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">อัตราเข้าเรียน</p>
            <p className="text-2xl font-bold text-emerald-600">{attendanceRate}%</p>
          </div>
        </div>

        {/* Open Sessions - Check In */}
        {openSessions.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-lg mb-3 st-title">🟢 เช็คชื่อเข้าเรียน</h2>
            <div className="space-y-3">
              {openSessions.map(s => {
                const existing = myRecordForSession(s.id);
                const justChecked = checkedInSession === s.id;
                return (
                  <div key={s.id} className="bg-white rounded-2xl shadow p-5 border-2 border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{s.title}</p>
                        <p className="text-sm text-slate-500">
                          📅 {s.date.split('-').map((p, i) => i === 0 ? String(Number(p) + 543) : p).join('-')} 
                          {s.time && ` ⏰ ${s.time}`}
                        </p>
                      </div>
                      {existing ? (
                        <div className={`px-4 py-2 rounded-xl text-sm font-bold ${STATUS_LABELS[existing.status].color}`}>
                          {STATUS_LABELS[existing.status].icon} {STATUS_LABELS[existing.status].label}
                        </div>
                      ) : justChecked ? (
                        <div className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-700 animate-bounce">
                          ✅ เช็คชื่อสำเร็จ!
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(s.id)}
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
                        >👋 เช็คชื่อ</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-4">📊 ประวัติการเข้าเรียน</h2>
          {myRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400">ยังไม่มีประวัติการเข้าเรียน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">วันที่</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">รายการ</th>
                    <th className="text-center py-2 px-3 text-xs font-bold text-slate-500">สถานะ</th>
                    <th className="text-center py-2 px-3 text-xs font-bold text-slate-500">เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {myRecords.map(r => {
                    const session = sessions.find(s => s.id === r.session_id);
                    const stInfo = STATUS_LABELS[r.status];
                    return (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-500">
                          {session?.date.split('-').map((p, i) => i === 0 ? String(Number(p) + 543) : p).join('-') || r.checked_in_at?.split('T')[0]}
                        </td>
                        <td className="py-2.5 px-3 font-medium">{session?.title || `Session #${r.session_id}`}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${stInfo.color}`}>
                            {stInfo.icon} {stInfo.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 text-xs">
                          {r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
