import { useState, useMemo } from 'react';
import { useCalendarEvents } from '../store/useStore';
import MobileHeader from '../components/MobileHeader';
import StudentSidebar from '../components/StudentSidebar';
import { STUDENT_THEME_CSS } from '../styles/studentTheme';

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const typeIcons: Record<string, string> = {
  lesson: '📚',
  exam: '📝',
  holiday: '🏖️',
  assignment: '📋',
  event: '🎉',
};

export default function StudentCalendar() {
  const { events } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // กันยายน พ.ศ.2569

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

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [events]);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  return (
    <div className="st-page min-h-screen">
      <style>{STUDENT_THEME_CSS}</style>
      <MobileHeader title="ปฏิทิน" />
      <StudentSidebar />

      <main className="md:ml-20 lg:ml-64 pt-16 md:pt-16 lg:pt-4 pb-28 md:pb-12 px-3.5 md:px-6 transition-all">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold st-title">📅 ปฏิทินการเรียน</h1>
          <p className="st-sub text-xs md:text-sm mt-1">ดูกิจกรรม วันสอบ และวันหยุดสำคัญ</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-100 rounded-lg text-lg">◀</button>
              <h2 className="text-lg font-bold">{MONTHS_TH[month]} {year + 543}</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-100 rounded-lg text-lg">▶</button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS_TH.map(d => (
                <div key={d} className="text-center text-xs font-bold text-slate-500 py-2">{d}</div>
              ))}
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`}></div>;
                const dayEvents = getEventsForDay(day);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                return (
                  <div key={day} className={`min-h-[60px] p-1 rounded-lg border transition ${
                    isToday ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' :
                    dayEvents.length > 0 ? 'border-slate-200 bg-slate-50' : 'border-slate-100'
                  }`}>
                    <div className={`font-bold text-sm mb-1 ${isToday ? 'text-blue-600' : dayEvents.length > 0 ? 'text-slate-800' : 'text-slate-500'}`}>
                      {day}
                    </div>
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className="text-[10px] px-1 py-0.5 rounded mb-0.5 truncate" style={{ backgroundColor: e.color + '20', color: e.color }}>
                        {typeIcons[e.type]} {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[10px] text-slate-400">+{dayEvents.length - 2}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-bold text-lg mb-4">📌 กิจกรรมที่จะถึง</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-sm">ยังไม่มีกิจกรรมที่จะถึง</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: e.color + '20' }}>
                      {typeIcons[e.type]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{e.title}</p>
                      <p className="text-xs text-slate-500">📅 {e.date.split('-').map((p, i) => i === 0 ? String(Number(p) + 543) : p).join('-')}</p>
                      {e.description && <p className="text-xs text-slate-500 mt-1">{e.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-sm mb-3 text-slate-600">🔑 สัญลักษณ์</h4>
              <div className="space-y-2 text-xs">
                {Object.entries(typeIcons).map(([type, icon]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-slate-600">
                      {type === 'lesson' ? 'วันเรียน' :
                       type === 'exam' ? 'วันสอบ' :
                       type === 'holiday' ? 'วันหยุด' :
                       type === 'assignment' ? 'กำหนดส่งงาน' : 'กิจกรรม'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
