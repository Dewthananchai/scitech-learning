import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { mockSubjects } from '../data/mockData';
import { useAppStore } from '../store/AppContext';
import { GRADES } from '../types';
import type { Lesson } from '../types';
import AdminSidebar from '../components/AdminSidebar';
import MobileHeader from '../components/MobileHeader';
import { TEACHER_THEME_CSS } from '../styles/studentTheme';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getGoogleDriveEmbedUrl(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  return null;
}

function renderMarkdown(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-gray-800 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-700 mt-6 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-gray-700 mt-4 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-gray-800 mt-3">{line.slice(2, -2)}</p>;
    if (line.match(/^\d+\.\s\*\*/)) {
      const boldPart = line.match(/\*\*(.+?)\*\*/)?.[1] || '';
      const rest = line.replace(/^\d+\.\s\*\*.*?\*\*/, '');
      return <div key={i} className="flex gap-2 mt-2"><span className="text-blue-600 font-bold">{line.match(/^\d+/)?.[0]}.</span><p><span className="font-bold">{boldPart}</span>{rest}</p></div>;
    }
    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-600 mt-1">• {line.slice(2)}</li>;
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="text-gray-600 mt-1">{line}</p>;
  });
}

export default function AdminLessons() {
  const { lessons, deleteLesson, togglePublish } = useAppStore();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewLesson = viewId !== null ? lessons.find(l => l.id === viewId) : null;

  const getGradeForLesson = (l: Lesson): number => {
    const subject = mockSubjects.find(s => s.id === l.subject_unit_id);
    return subject?.grade_level || 0;
  };

  const filteredLessons = useMemo(() => {
    let result = lessons;
    if (selectedGrade !== null) result = result.filter(l => getGradeForLesson(l) === selectedGrade);
    if (selectedUnit !== null) result = result.filter(l => l.subject_unit_id === selectedUnit);
    return result;
  }, [lessons, selectedGrade, selectedUnit]);

  const gradeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    lessons.forEach(l => { const g = getGradeForLesson(l); counts[g] = (counts[g] || 0) + 1; });
    return counts;
  }, [lessons]);

  const gradeSubjects = useMemo(() => selectedGrade !== null ? mockSubjects.filter(s => s.grade_level === selectedGrade) : [], [selectedGrade]);

  const unitCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    lessons.forEach(l => { if (selectedGrade !== null && getGradeForLesson(l) !== selectedGrade) return; counts[l.subject_unit_id] = (counts[l.subject_unit_id] || 0) + 1; });
    return counts;
  }, [lessons, selectedGrade]);

  const handleGradeSelect = (grade: number | null) => { setSelectedGrade(grade); setSelectedUnit(null); };
  const handleDelete = (id: number) => { if (confirm('ต้องการลบบทเรียนนี้?')) deleteLesson(id); };

  const renderMedia = (lesson: Lesson) => {
    if (!lesson.media_type || lesson.media_type === 'none' || !lesson.media_url) return null;
    switch (lesson.media_type) {
      case 'youtube': {
        const videoId = getYouTubeId(lesson.media_url);
        if (!videoId) return null;
        return (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">🎬 วิดีโอ YouTube</h3>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow">
              <iframe src={`https://www.youtube.com/embed/${videoId}`} title="YouTube" frameBorder="0" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
            </div>
          </div>
        );
      }
      case 'google_drive': {
        const embedUrl = getGoogleDriveEmbedUrl(lesson.media_url);
        if (!embedUrl) return null;
        return (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">📁 วิดีโอ Google Drive</h3>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow">
              <iframe src={embedUrl} title="Google Drive" frameBorder="0" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
            </div>
          </div>
        );
      }
      case 'pdf':
        return (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">📄 เอกสาร PDF</h3>
            <div className="bg-gray-100 rounded-xl overflow-hidden shadow">
              <iframe src={lesson.media_url} title="PDF" className="w-full h-[500px]"></iframe>
            </div>
            <a href={lesson.media_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-block">📥 ดาวน์โหลดเอกสาร</a>
          </div>
        );
      default:
        return null;
    }
  };

  const getMediaLabel = (l: Lesson) => {
    if (!l.media_type || l.media_type === 'none') return null;
    const labels: Record<string, string> = { youtube: '🎬 YouTube', pdf: '📄 PDF', google_drive: '📁 Drive' };
    return labels[l.media_type] || null;
  };

  return (
    <div className="teacher-page min-h-screen">
      <style>{TEACHER_THEME_CSS}</style>
      <MobileHeader title="คลังบทเรียน" />
      <AdminSidebar />

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-6 max-w-6xl transition-all">
        {/* Main Card with Emerald Topbar */}
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-900/5 border border-emerald-100 overflow-hidden mb-8">
          {/* Emerald Topbar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 px-6 py-5 text-white">
            <div className="teacher-glow-overlay" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xl">📦 จัดการคลังบทเรียน</h2>
                  <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-black px-2.5 py-0.5 rounded-full border border-white/30">
                    {lessons.length} บทเรียน
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  สร้าง จัดการ และเผยแพร่บทเรียนวิทยาศาสตร์ ป.1 - ป.6 พร้อมสื่อการสอนและแบบทดสอบ
                </p>
              </div>
              <Link
                to="/admin/create-lesson"
                className="self-start sm:self-auto px-4 py-2.5 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow-md hover:bg-emerald-50 hover:shadow-lg transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>✨</span>
                <span>สร้างบทเรียนใหม่</span>
              </Link>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 md:p-7 space-y-5">
            {/* Grade & Unit Filter Bar */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 mr-1">ระดับชั้น:</span>
                <button
                  onClick={() => handleGradeSelect(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedGrade === null
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ทั้งหมด ({lessons.length})
                </button>
                {GRADES.map(g => (
                  <button
                    key={g.level}
                    onClick={() => handleGradeSelect(selectedGrade === g.level ? null : g.level)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedGrade === g.level
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {g.label} ({gradeCounts[g.level] || 0})
                  </button>
                ))}
              </div>

              {selectedGrade !== null && gradeSubjects.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-slate-500 mr-1">หน่วยเรียน:</span>
                  <button
                    onClick={() => setSelectedUnit(null)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedUnit === null
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-teal-700 hover:bg-teal-50 border border-teal-200'
                    }`}
                  >
                    ทุกหน่วย
                  </button>
                  {gradeSubjects.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedUnit(selectedUnit === s.id ? null : s.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        selectedUnit === s.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-teal-700 hover:bg-teal-50 border border-teal-200'
                      }`}
                    >
                      {s.unit_code} {s.unit_name} ({unitCounts[s.id] || 0})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lessons Card View (Mobile) */}
            <div className="md:hidden space-y-3">
              {filteredLessons.map(l => {
                const subject = mockSubjects.find(s => s.id === l.subject_unit_id);
                const grade = getGradeForLesson(l);
                const gradeInfo = GRADES.find(g => g.level === grade);
                const mediaLabel = getMediaLabel(l);
                return (
                  <div key={l.id} className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
                    {l.cover_image && (
                      <img src={l.cover_image} alt={l.title} className="w-full h-32 object-cover rounded-xl shadow-xs" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {gradeInfo && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {gradeInfo.label}
                            </span>
                          )}
                          <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {subject?.unit_code || '-'}
                          </span>
                          {mediaLabel && <span className="text-[11px] text-slate-500">{mediaLabel}</span>}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{l.title}</h3>
                        {l.summary && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{l.summary}</p>}
                      </div>
                      <button
                        onClick={() => togglePublish(l.id)}
                        className={`px-2 py-1 rounded-full text-xs font-bold shrink-0 ${
                          l.is_published
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {l.is_published ? '🟢 เผยแพร่' : '⚪ ร่าง'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        l.difficulty === 1 ? 'bg-green-50 text-green-700' : l.difficulty === 2 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {l.difficulty === 1 ? 'ง่าย' : l.difficulty === 2 ? 'ปานกลาง' : 'ยาก'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewId(l.id)} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold">
                          👁 ดู
                        </button>
                        <Link to={`/admin/edit-lesson/${l.id}`} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold">
                          ✏️ แก้ไข
                        </Link>
                        <button onClick={() => handleDelete(l.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Lessons Table (Desktop) */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80">
              {filteredLessons.length === 0 ? (
                <div className="text-center py-12 bg-slate-50">
                  <span className="text-4xl block mb-2">📖</span>
                  <p className="text-slate-600 font-bold text-sm">
                    {selectedGrade !== null ? `ยังไม่มีบทเรียนสำหรับชั้น ป.${selectedGrade}` : 'ยังไม่มีบทเรียนในระบบ'}
                  </p>
                  <Link
                    to="/admin/create-lesson"
                    className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-md transition-all"
                  >
                    <span>✨ สร้างบทเรียนใหม่</span>
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-10">#</th>
                      <th className="py-3 px-4">ชื่อบทเรียน</th>
                      {selectedGrade === null && <th className="py-3 px-4">ชั้น</th>}
                      <th className="py-3 px-4">หน่วยการเรียนรู้</th>
                      <th className="py-3 px-4">สื่อ</th>
                      <th className="py-3 px-4">ระดับ</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLessons.map((l, idx) => {
                      const subject = mockSubjects.find(s => s.id === l.subject_unit_id);
                      const grade = getGradeForLesson(l);
                      const gradeInfo = GRADES.find(g => g.level === grade);
                      const mediaLabel = getMediaLabel(l);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-800 max-w-[280px]">
                            <div className="truncate">{l.title}</div>
                            {l.summary && <div className="text-xs text-slate-400 font-normal truncate mt-0.5">{l.summary}</div>}
                          </td>
                          {selectedGrade === null && (
                            <td className="py-3 px-4">
                              <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-xs">
                                {gradeInfo?.label || '-'}
                              </span>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <span className="bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-md text-xs">
                              {subject?.unit_code || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {mediaLabel || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              l.difficulty === 1 ? 'bg-green-50 text-green-700' : l.difficulty === 2 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {l.difficulty === 1 ? 'ง่าย' : l.difficulty === 2 ? 'ปานกลาง' : 'ยาก'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => togglePublish(l.id)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                                l.is_published
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {l.is_published ? '🟢 เปิดใช้งาน' : '⚪ ฉบับร่าง'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewId(l.id)}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all"
                              >
                                👁 ดู
                              </button>
                              <Link
                                to={`/admin/edit-lesson/${l.id}`}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                              >
                                ✏️ แก้ไข
                              </Link>
                              <button
                                onClick={() => handleDelete(l.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="ลบบทเรียน"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* View Lesson Modal */}
      {viewLesson && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto px-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setViewId(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 animate-slide-in">
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white p-6">
              <div className="teacher-glow-overlay" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{viewLesson.title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-xs text-emerald-100 flex-wrap">
                    {(() => {
                      const s = mockSubjects.find(su => su.id === viewLesson.subject_unit_id);
                      return s ? <span>ป.{s.grade_level} • {s.unit_code} {s.unit_name}</span> : null;
                    })()}
                    <span>⏱ {viewLesson.estimated_minutes} นาที</span>
                    <span>👁 เข้าชม {viewLesson.view_count} ครั้ง</span>
                  </div>
                </div>
                <button
                  onClick={() => setViewId(null)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto teacher-scrollbar space-y-4">
              {viewLesson.summary && (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-sm text-emerald-900">
                  <strong>📋 สรุปเนื้อหา:</strong> {viewLesson.summary}
                </div>
              )}
              {renderMedia(viewLesson)}
              <div className="prose max-w-none text-slate-800 text-sm">{renderMarkdown(viewLesson.content)}</div>
            </div>
            <div className="border-t border-slate-100 p-4 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-bold ${viewLesson.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                  {viewLesson.is_published ? '🟢 เผยแพร่' : '⚪ ฉบับร่าง'}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/admin/edit-lesson/${viewLesson.id}`}
                  onClick={() => setViewId(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  ✏️ แก้ไข
                </Link>
                <Link
                  to={`/lesson/${viewLesson.id}`}
                  target="_blank"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all"
                >
                  📖 เปิดหน้าเรียน
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
