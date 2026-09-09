import { useMemo, useEffect } from 'react';
import { useAnnouncements, useAnnouncementReads, filterVisibleAnnouncements } from '../store/useStore';
import { useAuth } from '../store/AuthContext';
import MobileHeader from '../components/MobileHeader';
import StudentSidebar from '../components/StudentSidebar';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

const typeStyles: Record<string, { icon: string; bg: string; border: string }> = {
  info: { icon: '📢', bg: 'bg-blue-50', border: 'border-blue-200' },
  urgent: { icon: '🚨', bg: 'bg-red-50', border: 'border-red-200' },
  event: { icon: '🎉', bg: 'bg-purple-50', border: 'border-purple-200' },
  assignment: { icon: '📝', bg: 'bg-amber-50', border: 'border-amber-200' },
};

export default function StudentAnnouncements() {
  const { announcements } = useAnnouncements();
  const { user } = useAuth();

  const filteredAnnouncements = useMemo(() => {
    return filterVisibleAnnouncements(announcements, user?.grade_level);
  }, [announcements, user]);

  // Mark announcements as read after a short pause so the "ใหม่" tags are visible while reading
  // (clears the 🔔 badge; navigating away early keeps them unread)
  const { readIds, markAsRead } = useAnnouncementReads(user?.id);
  useEffect(() => {
    if (filteredAnnouncements.length === 0) return;
    const timer = setTimeout(() => {
      markAsRead(filteredAnnouncements.map(a => a.id));
    }, 2500);
    return () => clearTimeout(timer);
  }, [filteredAnnouncements, markAsRead]);

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="ประกาศ" />
      <StudentSidebar />

      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-4 pb-28 md:pb-12 px-3.5 md:px-6 transition-all">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold st-title">📢 ประกาศจากคุณครู</h1>
          <p className="st-sub text-xs md:text-sm mt-1">ข่าวสาร กิจกรรม และประกาศสำคัญสำหรับนักเรียน</p>
        </div>

        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-slate-400">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-medium mb-2">ยังไม่มีประกาศ</p>
            <p className="text-sm">รอประกาศจากครูนะครับ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map(a => {
              const style = typeStyles[a.type] || typeStyles.info;
              return (
                <div key={a.id} className={`bg-white rounded-2xl shadow overflow-hidden border-l-4 ${
                  a.type === 'urgent' ? 'border-red-500' :
                  a.type === 'event' ? 'border-purple-500' :
                  a.type === 'assignment' ? 'border-amber-500' : 'border-blue-500'
                }`}>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${style.bg}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800">{a.title}</h3>
                          {!readIds.includes(a.id) && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
                              ใหม่
                            </span>
                          )}
                          {a.type === 'urgent' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              ด่วน
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{a.content}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>👤 {a.created_by}</span>
                          <span>📅 {a.created_at}</span>
                          {a.grade_levels && a.grade_levels.length > 0 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full">
                              ชั้น {a.grade_levels.map(g => `ป.${g}`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
