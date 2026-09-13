import { useState, useCallback, useEffect, useRef } from 'react';
import type { Lesson, Question, Quiz, SubjectUnit, Announcement, CalendarEvent, AttendanceSession, AttendanceRecord, Mission, MissionCompletion, LessonProgress, DailyAutoMission, LessonSession, Worksheet, WorksheetSubmission } from '../types';
import { worksheetApi, submissionApi } from '../api/worksheetApi';

// Storage keys
const KEYS = {
  subjects: 'scitech_subjects',
  lessons: 'scitech_lessons',
  questions: 'scitech_questions',
  quizzes: 'scitech_quizzes',
};

import { onCloudKeyChanged } from '../lib/cloudSync';

// Load from localStorage, fallback to mock data
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error(`Failed to load ${key} from storage:`, e);
  }
  return fallback;
}

// Save to localStorage
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${key} to storage:`, e);
  }
}

// Initial IDs for new items
// Initial IDs for new items (ข้อมูลจริงเริ่มจากว่าง — ไม่มีตัวอย่าง/mock)
// เริ่มจาก id ถัดไปของข้อมูลจริงในเครื่อง (หลัง hydrate จากคลาวด์) — กันสองเครื่อง
// สร้าง id เดียวกันแล้วทับกันเองตอนซิงก์ (เครื่องที่เปิดหลังข้อมูลมีอยู่แล้ว)
const nextIdFrom = (key: string): number => {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(arr) && arr.length > 0) return Math.max(...arr.map((x: { id?: number }) => Number(x.id) || 0)) + 1;
  } catch { /* ข้อมูลพัง → เริ่ม 1 */ }
  return 1;
};
let nextSubjectId = nextIdFrom(KEYS.subjects);
let nextLessonId = nextIdFrom(KEYS.lessons);
let nextQuestionId = nextIdFrom(KEYS.questions);
let nextQuizId = nextIdFrom(KEYS.quizzes);
let nextAnnouncementId = nextIdFrom('scitech_announcements');
let nextCalendarEventId = nextIdFrom('scitech_calendar');

// ===== SUBJECTS & UNITS =====
export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectUnit[]>(() =>
    loadFromStorage<SubjectUnit[]>(KEYS.subjects, [])
  );

  // ครูสร้างหน่วยบนเครื่องอื่น → คลาวด์ส่งมา → อ่านซ้ำทันที (ไม่ต้องรีโหลด)
  useEffect(() => onCloudKeyChanged(KEYS.subjects, () =>
    setSubjects(loadFromStorage<SubjectUnit[]>(KEYS.subjects, []))), []);

  useEffect(() => {
    saveToStorage(KEYS.subjects, subjects);
  }, [subjects]);

  const addSubject = useCallback((subject: Omit<SubjectUnit, 'id'>) => {
    const newSubject: SubjectUnit = {
      ...subject,
      id: nextSubjectId++,
    };
    setSubjects(prev => [...prev, newSubject]);
    return newSubject;
  }, []);

  const updateSubject = useCallback((id: number, updates: Partial<SubjectUnit>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSubject = useCallback((id: number) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleSubjectActive = useCallback((id: number) => {
    setSubjects(prev => prev.map(s =>
      s.id === id ? { ...s, is_active: !s.is_active } : s
    ));
  }, []);

  return { subjects, addSubject, updateSubject, deleteSubject, toggleSubjectActive };
}

// ===== LESSONS =====
export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>(() =>
    loadFromStorage<Lesson[]>(KEYS.lessons, [])
  );

  // ครูสร้างบทเรียนบนเครื่องอื่น → คลาวด์ส่งมา → นักเรียนเห็นภายใน ~5 วินาที
  useEffect(() => onCloudKeyChanged(KEYS.lessons, () =>
    setLessons(loadFromStorage<Lesson[]>(KEYS.lessons, []))), []);

  useEffect(() => {
    saveToStorage(KEYS.lessons, lessons);
  }, [lessons]);

  const addLesson = useCallback((lesson: Omit<Lesson, 'id' | 'view_count'>) => {
    const newLesson: Lesson = {
      ...lesson,
      id: nextLessonId++,
      view_count: 0,
    };
    setLessons(prev => [...prev, newLesson]);
    return newLesson;
  }, []);

  const updateLesson = useCallback((id: number, updates: Partial<Lesson>) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const deleteLesson = useCallback((id: number) => {
    setLessons(prev => prev.filter(l => l.id !== id));
  }, []);

  const togglePublish = useCallback((id: number) => {
    setLessons(prev => prev.map(l =>
      l.id === id ? { ...l, is_published: !l.is_published } : l
    ));
  }, []);

  return { lessons, addLesson, updateLesson, deleteLesson, togglePublish };
}

// ===== QUESTIONS =====
/**
 * โหลดคลังคำถามจาก localStorage — เริ่มว่าง (ข้อมูลจริง) ไม่มีการ seed ตัวอย่าง
 * หมายเหตุ: ถ้าเครื่องเก่ามีข้อมูล mock ติดค้าง จะถูกล้างครั้งเดียวโดย MIGRATE_EMPTY_BINS
 */
function loadQuestions(): Question[] {
  const stored = loadFromStorage<Question[]>(KEYS.questions, []);
  const base = Array.isArray(stored) ? stored : [];
  const maxId = base.reduce((m, q) => Math.max(m, Number(q.id) || 0), 0);
  nextQuestionId = maxId + 1;
  return base;
}

export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>(loadQuestions);

  useEffect(() => {
    saveToStorage(KEYS.questions, questions);
  }, [questions]);

  const addQuestion = useCallback((question: Omit<Question, 'id'>) => {
    const newQuestion: Question = {
      ...question,
      id: nextQuestionId++,
    };
    setQuestions(prev => [...prev, newQuestion]);
    return newQuestion;
  }, []);

  const addQuestionsBatch = useCallback((newQuestions: Omit<Question, 'id'>[]) => {
    const added = newQuestions.map(q => ({
      ...q,
      id: nextQuestionId++,
    }));
    setQuestions(prev => [...prev, ...added]);
    return added;
  }, []);

  const updateQuestion = useCallback((id: number, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  }, []);

  const deleteQuestion = useCallback((id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  const deleteQuestionsByCategory = useCallback((category: string) => {
    setQuestions(prev => prev.filter(q => q.category !== category));
  }, []);

  return { questions, addQuestion, addQuestionsBatch, updateQuestion, deleteQuestion, deleteQuestionsByCategory };
}

// ===== QUIZZES =====
export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(() =>
    loadFromStorage<Quiz[]>(KEYS.quizzes, [])
  );

  useEffect(() => {
    saveToStorage(KEYS.quizzes, quizzes);
  }, [quizzes]);

  const addQuiz = useCallback((quiz: Omit<Quiz, 'id'>) => {
    const newQuiz: Quiz = {
      ...quiz,
      id: nextQuizId++,
    };
    setQuizzes(prev => [...prev, newQuiz]);
    return newQuiz;
  }, []);

  return { quizzes, addQuiz };
}

// ===== ANNOUNCEMENTS =====

const KEYS_ANNOUNCEMENTS = 'scitech_announcements';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    loadFromStorage(KEYS_ANNOUNCEMENTS, [])
  );

  useEffect(() => {
    saveToStorage(KEYS_ANNOUNCEMENTS, announcements);
    // Update next ID
    if (announcements.length > 0) {
      nextAnnouncementId = Math.max(...announcements.map(a => a.id)) + 1;
    }
  }, [announcements]);

  const addAnnouncement = useCallback((announcement: Omit<Announcement, 'id' | 'created_at'>) => {
    const newAnnouncement: Announcement = {
      ...announcement,
      id: nextAnnouncementId++,
      created_at: new Date().toISOString().split('T')[0],
    };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    return newAnnouncement;
  }, []);

  const updateAnnouncement = useCallback((id: number, updates: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAnnouncement = useCallback((id: number) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, []);

  return { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement };
}

// ===== ANNOUNCEMENT READ TRACKING (per student) =====

const announcementReadsKey = (studentId: number) => `scitech_announcement_reads_${studentId}`;

/**
 * Tracks which announcements a student has opened (stored per student in localStorage).
 * The 🔔 bell badge counts only announcements visible to the student that are NOT in this list.
 */
export function useAnnouncementReads(studentId?: number) {
  const storageKey = studentId != null ? announcementReadsKey(studentId) : null;

  const [readIds, setReadIds] = useState<number[]>(() =>
    storageKey != null ? loadFromStorage<number[]>(storageKey, []) : []
  );
  const readIdsRef = useRef<number[]>(readIds);

  // Reload when the logged-in user changes (login/logout without remount)
  useEffect(() => {
    const next = storageKey != null ? loadFromStorage<number[]>(storageKey, []) : [];
    readIdsRef.current = next;
    setReadIds(next);
  }, [storageKey]);

  // Sync across components (e.g. 📢 page marks read → 🔔 badge in MobileHeader updates live)
  useEffect(() => {
    const reload = () => {
      const next = storageKey != null ? loadFromStorage<number[]>(storageKey, []) : [];
      readIdsRef.current = next;
      setReadIds(next);
    };
    window.addEventListener('announcement-reads-changed', reload);
    return () => window.removeEventListener('announcement-reads-changed', reload);
  }, [storageKey]);

  const markAsRead = useCallback((ids: number[]) => {
    const next = Array.from(new Set([...readIdsRef.current, ...ids]));
    readIdsRef.current = next;
    if (storageKey != null) saveToStorage(storageKey, next);
    setReadIds(next);
    window.dispatchEvent(new Event('announcement-reads-changed'));
  }, [storageKey]);

  const isRead = useCallback((id: number) => readIds.includes(id), [readIds]);

  return { readIds, markAsRead, isRead };
}

/**
 * Shared visibility rule for student-facing announcements.
 * Used by both the 📢 StudentAnnouncements page and the 🔔 bell badge in MobileHeader
 * so the badge count always matches what the page shows.
 */
export function filterVisibleAnnouncements(announcements: Announcement[], gradeLevel?: number): Announcement[] {
  return announcements.filter(a => {
    if (!a.is_active) return false;
    if (a.target_audience === 'all') return true;
    if (a.target_audience === 'students') {
      if (!a.grade_levels || a.grade_levels.length === 0) return true;
      return !!gradeLevel && a.grade_levels.includes(gradeLevel);
    }
    return false;
  });
}

// ===== WORKSHEETS (ใบงาน) — shared via API server, localStorage fallback =====
const KEYS_WORKSHEETS = 'scitech_worksheets';
const WS_POLL_MS = 5000;

async function refreshWorksheets(setWorksheets: (w: Worksheet[]) => void) {
  const { data } = await worksheetApi.list();
  setWorksheets(data);
}

export function useWorksheets() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>(() =>
    loadFromStorage<Worksheet[]>(KEYS_WORKSHEETS, [])
  );

  // Initial load + polling so the teacher/student see each other's changes on LAN
  useEffect(() => {
    refreshWorksheets(setWorksheets);
    const timer = setInterval(() => refreshWorksheets(setWorksheets), WS_POLL_MS);
    const onFocus = () => refreshWorksheets(setWorksheets);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Mirror to localStorage so the UI keeps working offline (fallback cache)
  useEffect(() => {
    saveToStorage(KEYS_WORKSHEETS, worksheets);
  }, [worksheets]);

  const addWorksheet = useCallback(async (worksheet: Omit<Worksheet, 'id'>) => {
    const created = await worksheetApi.add(worksheet);
    setWorksheets(prev => [created, ...prev.filter(w => w.id !== created.id)]);
    return created;
  }, []);

  const updateWorksheet = useCallback(async (id: number, updates: Partial<Worksheet>) => {
    setWorksheets(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
    await worksheetApi.update(id, updates);
  }, []);

  const deleteWorksheet = useCallback(async (id: number) => {
    setWorksheets(prev => prev.filter(w => w.id !== id));
    await worksheetApi.remove(id);
  }, []);

  return { worksheets, addWorksheet, updateWorksheet, deleteWorksheet };
}

// ===== WORKSHEET SUBMISSIONS (นักเรียนส่งใบงาน) — shared via API server =====
const KEYS_WS_SUBMISSIONS = 'scitech_worksheet_submissions';

async function refreshSubmissions(setSubmissions: (s: WorksheetSubmission[]) => void) {
  const { data } = await submissionApi.list();
  setSubmissions(data);
}

export function useWorksheetSubmissions() {
  const [submissions, setSubmissions] = useState<WorksheetSubmission[]>(() =>
    loadFromStorage<WorksheetSubmission[]>(KEYS_WS_SUBMISSIONS, [])
  );

  useEffect(() => {
    refreshSubmissions(setSubmissions);
    const timer = setInterval(() => refreshSubmissions(setSubmissions), WS_POLL_MS);
    const onFocus = () => refreshSubmissions(setSubmissions);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    saveToStorage(KEYS_WS_SUBMISSIONS, submissions);
  }, [submissions]);

  const submitWorksheet = useCallback(async (submission: Omit<WorksheetSubmission, 'id'>) => {
    const created = await submissionApi.add(submission);
    setSubmissions(prev => [created, ...prev.filter(s => s.id !== created.id)]);
    return created;
  }, []);

  const gradeSubmission = useCallback(async (id: number, updates: Partial<WorksheetSubmission>) => {
    setSubmissions(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    await submissionApi.update(id, updates);
    // บันทึกผลตรวจลงสมุดจด (append-only, sync ขึ้นคลาวด์) — แม้อุปกรณ์อื่นจะ
    // อัปโหลดสำเนาเก่าทับคำตอบก็ตาม ผลตรวจในสมุดจดจะถูกกู้คืนให้อัตโนมัติ
    try {
      const raw = localStorage.getItem(KEYS_WS_SUBMISSIONS);
      const subs: WorksheetSubmission[] = raw ? JSON.parse(raw) : [];
      const hit = subs.find(s => s.id === id);
      if (hit && updates.status === 'graded') {
        const jRaw = localStorage.getItem('scitech_grades_journal');
        const journal: WorksheetSubmission[] = jRaw ? JSON.parse(jRaw) : [];
        const idx = journal.findIndex(s => s.worksheet_id === hit.worksheet_id && s.student_id === hit.student_id);
        if (idx >= 0) journal[idx] = hit; else journal.push(hit);
        localStorage.setItem('scitech_grades_journal', JSON.stringify(journal));
      }
    } catch { /* ไม่บล็อกการให้คะแนน */ }
  }, []);

  return { submissions, submitWorksheet, gradeSubmission };
}

// ===== CALENDAR EVENTS =====

const KEYS_CALENDAR = 'scitech_calendar';

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    loadFromStorage(KEYS_CALENDAR, [])
  );

  useEffect(() => {
    saveToStorage(KEYS_CALENDAR, events);
    if (events.length > 0) {
      nextCalendarEventId = Math.max(...events.map(e => e.id)) + 1;
    }
  }, [events]);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: nextCalendarEventId++,
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((id: number, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEvent = useCallback((id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return { events, addEvent, updateEvent, deleteEvent };
}

// ===== ATTENDANCE =====


const KEYS_ATTENDANCE_SESSIONS = 'scitech_attendance_sessions';
const KEYS_ATTENDANCE_RECORDS = 'scitech_attendance_records';
let nextSessionId = 3;
let nextRecordId = 2;

export function useAttendance() {
  const [sessions, setSessions] = useState<AttendanceSession[]>(() =>
    loadFromStorage(KEYS_ATTENDANCE_SESSIONS, [])
  );
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    loadFromStorage(KEYS_ATTENDANCE_RECORDS, [])
  );

  useEffect(() => {
    saveToStorage(KEYS_ATTENDANCE_SESSIONS, sessions);
    if (sessions.length > 0) nextSessionId = Math.max(...sessions.map(s => s.id)) + 1;
  }, [sessions]);

  useEffect(() => {
    saveToStorage(KEYS_ATTENDANCE_RECORDS, records);
    if (records.length > 0) nextRecordId = Math.max(...records.map(r => r.id)) + 1;
  }, [records]);

  const addSession = useCallback((session: Omit<AttendanceSession, 'id' | 'created_at'>) => {
    const newSession: AttendanceSession = {
      ...session,
      id: nextSessionId++,
      created_at: new Date().toISOString().split('T')[0],
    };
    setSessions(prev => [newSession, ...prev]);
    return newSession;
  }, []);

  const updateSession = useCallback((id: number, updates: Partial<AttendanceSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSession = useCallback((id: number) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setRecords(prev => prev.filter(r => r.session_id !== id));
  }, []);

  const toggleSessionStatus = useCallback((id: number) => {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, status: s.status === 'open' ? 'closed' : 'open' } : s
    ));
  }, []);

  const addRecord = useCallback((record: Omit<AttendanceRecord, 'id' | 'checked_in_at'>) => {
    // Prevent duplicate check-in for same session
    const existing = records.find(r => r.session_id === record.session_id && r.student_id === record.student_id);
    if (existing) return existing;
    const newRecord: AttendanceRecord = {
      ...record,
      id: nextRecordId++,
      checked_in_at: new Date().toISOString(),
    };
    setRecords(prev => [...prev, newRecord]);
    return newRecord;
  }, [records]);

  const updateRecord = useCallback((id: number, updates: Partial<AttendanceRecord>) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const markAllPresent = useCallback((sessionId: number) => {
    // This is handled in the admin page with known students
  }, []);

  return { sessions, records, addSession, updateSession, deleteSession, toggleSessionStatus, addRecord, updateRecord, markAllPresent };
}

// ===== DAILY MISSIONS =====
const todayStr = () => new Date().toISOString().split('T')[0];



const KEYS_MISSIONS = 'scitech_missions';
const KEYS_MISSION_COMPLETIONS = 'scitech_mission_completions';
let nextMissionId = 3;
let nextCompletionId = 2;

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>(() =>
    loadFromStorage(KEYS_MISSIONS, [])
  );
  const [completions, setCompletions] = useState<MissionCompletion[]>(() =>
    loadFromStorage(KEYS_MISSION_COMPLETIONS, [])
  );

  useEffect(() => {
    saveToStorage(KEYS_MISSIONS, missions);
    if (missions.length > 0) nextMissionId = Math.max(...missions.map(m => m.id)) + 1;
  }, [missions]);

  useEffect(() => {
    saveToStorage(KEYS_MISSION_COMPLETIONS, completions);
    if (completions.length > 0) nextCompletionId = Math.max(...completions.map(c => c.id)) + 1;
  }, [completions]);

  const addMission = useCallback((mission: Omit<Mission, 'id' | 'created_at'>) => {
    // Prevent duplicate daily missions (same date + same lesson)
    if (mission.date && mission.lesson_id) {
      const exists = missions.find(m => m.date === mission.date && m.lesson_id === mission.lesson_id);
      if (exists) return exists;
    }
    const newMission: Mission = {
      ...mission,
      id: nextMissionId++,
      created_at: new Date().toISOString().split('T')[0],
    };
    setMissions(prev => [newMission, ...prev]);
    return newMission;
  }, [missions]);

  const updateMission = useCallback((id: number, updates: Partial<Mission>) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const deleteMission = useCallback((id: number) => {
    setMissions(prev => prev.filter(m => m.id !== id));
    setCompletions(prev => prev.filter(c => c.mission_id !== id));
  }, []);

  const addCompletion = useCallback((completion: Omit<MissionCompletion, 'id' | 'completed_at'>) => {
    // Prevent duplicate completion
    const exists = completions.find(c => c.mission_id === completion.mission_id && c.student_id === completion.student_id);
    if (exists) return exists;
    const newCompletion: MissionCompletion = {
      ...completion,
      id: nextCompletionId++,
      completed_at: new Date().toISOString(),
    };
    setCompletions(prev => [...prev, newCompletion]);
    return newCompletion;
  }, [completions]);

  const getCompletionsForMission = useCallback((missionId: number) => {
    return completions.filter(c => c.mission_id === missionId);
  }, [completions]);

  const getCompletionsForStudent = useCallback((studentId: number) => {
    return completions.filter(c => c.student_id === studentId);
  }, [completions]);

  return { missions, completions, addMission, updateMission, deleteMission, addCompletion, getCompletionsForMission, getCompletionsForStudent };
}

// ===== LESSON PROGRESS =====
const KEYS_LESSON_PROGRESS = 'scitech_lesson_progress';
export function useLessonProgress() {
  const [progress, setProgress] = useState<LessonProgress[]>(() => {
    try {
      const stored = localStorage.getItem(KEYS_LESSON_PROGRESS);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEYS_LESSON_PROGRESS, JSON.stringify(progress));
  }, [progress]);

  const markCompleted = useCallback((lessonId: number, studentId: number) => {
    setProgress(prev => {
      const exists = prev.find(p => p.lesson_id === lessonId && p.student_id === studentId);
      if (exists) return prev;
      return [...prev, { lesson_id: lessonId, student_id: studentId, completed_at: new Date().toISOString() }];
    });
  }, []);

  const getCompletedLessons = useCallback((studentId: number): number[] => {
    return progress.filter(p => p.student_id === studentId).map(p => p.lesson_id);
  }, [progress]);

  const isLessonCompleted = useCallback((lessonId: number, studentId: number): boolean => {
    return progress.some(p => p.lesson_id === lessonId && p.student_id === studentId);
  }, [progress]);

  return { progress, markCompleted, getCompletedLessons, isLessonCompleted };
}

// ===== AUTO DAILY MISSIONS =====
const today = () => new Date().toISOString().split('T')[0];
const KEYS_DAILY_MISSIONS = 'scitech_daily_missions';
function loadDailyMissions(): DailyAutoMission[] {
  try {
    const stored = localStorage.getItem(KEYS_DAILY_MISSIONS);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

/**
 * Time slots for daily mission generation
 */
export const MISSION_TIME_SLOTS = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00'];

/** Get the current time slot */
export function getCurrentTimeSlot(): string {
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let slot = MISSION_TIME_SLOTS[0];
  for (const s of MISSION_TIME_SLOTS) {
    if (current >= s) slot = s;
  }
  return slot;
}

/** Check which new time slots have arrived since last checked */
export function getNewTimeSlots(lastCheckedSlot: string): string[] {
  const current = getCurrentTimeSlot();
  const currentIdx = MISSION_TIME_SLOTS.indexOf(current);
  const lastIdx = MISSION_TIME_SLOTS.indexOf(lastCheckedSlot);
  if (currentIdx <= lastIdx) return [];
  return MISSION_TIME_SLOTS.slice(lastIdx + 1, currentIdx + 1);
}

/**
 * Generate daily auto-missions for a student at a specific time slot.
 * Each slot generates 1 mission from a completed lesson.
 */
export function generateDailyMissions(
  studentId: number,
  gradeLevel: number,
  completedLessonIds: number[],
  allLessons: Lesson[],
  allQuestions: Question[],
  existingMissions: Mission[],
  timeSlot?: string,
): Mission[] {
  const todayStr = today();
  const slot = timeSlot || getCurrentTimeSlot();

  // Check if this time slot already generated
  const slotKey = `${studentId}-${todayStr}-${slot}`;
  const dailyMissionsData = loadDailyMissions();
  const existing = dailyMissionsData.find(d => d.id === slotKey);

  if (existing) {
    return existing.lessons_used
      .map(lessonId => existingMissions.find(m => m.lesson_id === lessonId && m.date === todayStr))
      .filter((m): m is Mission => !!m);
  }

  // Find published lessons that the student has completed
  const completedLessons = allLessons.filter(
    l => l.is_published && completedLessonIds.includes(l.id)
  );

  if (completedLessons.length === 0) return [];

  // Pick a lesson not already used in other time slots today
  const usedToday = new Set(
    dailyMissionsData
      .filter(d => d.student_id === studentId && d.date === todayStr)
      .flatMap(d => d.lessons_used)
  );
  const available = completedLessons.filter(l => !usedToday.has(l.id));
  const pickFrom = available.length > 0 ? available : [...completedLessons].sort(() => Math.random() - 0.5);
  const selectedLesson = pickFrom[Math.floor(Math.random() * pickFrom.length)];

  if (!selectedLesson) return [];

  const lessonQuestions = allQuestions.filter(
    q => q.lesson_id === selectedLesson.id && (!q.category || q.category === 'lesson')
  );
  if (lessonQuestions.length === 0) return [];

  const shuffled = [...lessonQuestions].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(3, lessonQuestions.length));
  const maxStars = picked.length * 3;

  const slotLabel = slot.replace(':', '.');
  const mission: Mission = {
    id: Date.now(),
    title: `🎯 ${selectedLesson.title} (${picked.length} ข้อ)`,
    description: `⏰ ${slot} — สุ่มจาก "${selectedLesson.title}" — ทำถูก 100% รับ ${maxStars} ดาว`,
    lesson_id: selectedLesson.id,
    grade_level: gradeLevel,
    stars_reward: maxStars,
    question_count: picked.length,
    is_active: true,
    is_daily_random: true,
    created_by: `ระบบ (${slot})`,
    created_at: todayStr,
    date: todayStr,
  } as Mission;

  // Save to localStorage
  const dailyRecord: DailyAutoMission = {
    id: slotKey,
    student_id: studentId,
    date: todayStr,
    time_slot: slot,
    lessons_used: [selectedLesson.id],
    generated_at: new Date().toISOString(),
  };
  const updated = [...dailyMissionsData.filter(d => d.id !== slotKey), dailyRecord];
  localStorage.setItem(KEYS_DAILY_MISSIONS, JSON.stringify(updated));

  return [mission];
}

// ===== LESSON SESSION STATUS =====
const KEYS_LESSON_SESSIONS = 'scitech_lesson_sessions';

export function useLessonSession() {
  const [sessions, setSessions] = useState<LessonSession[]>(() => {
    try {
      const stored = localStorage.getItem(KEYS_LESSON_SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // ไม่ seed ข้อมูลตัวอย่าง — เซสชันเริ่มว่าง (ใช้งานจริง)

  useEffect(() => {
    localStorage.setItem(KEYS_LESSON_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  const startLesson = useCallback((lessonId: number, studentId: number) => {
    setSessions(prev => {
      const existing = prev.find(s => s.lesson_id === lessonId && s.student_id === studentId);
      if (existing) {
        // If already completed, don't restart
        if (existing.status === 'completed') return prev;
        return prev;
      }
      return [...prev, {
        lesson_id: lessonId,
        student_id: studentId,
        status: 'in_progress' as const,
        started_at: new Date().toISOString(),
      }];
    });
  }, []);

  const completeLesson = useCallback((lessonId: number, studentId: number) => {
    setSessions(prev => prev.map(s =>
      s.lesson_id === lessonId && s.student_id === studentId
        ? { ...s, status: 'completed' as const, completed_at: new Date().toISOString() }
        : s
    ));
  }, []);

  const getSession = useCallback((lessonId: number, studentId: number): LessonSession | undefined => {
    return sessions.find(s => s.lesson_id === lessonId && s.student_id === studentId);
  }, [sessions]);

  const getStatus = useCallback((lessonId: number, studentId: number): 'not_started' | 'in_progress' | 'completed' => {
    const session = sessions.find(s => s.lesson_id === lessonId && s.student_id === studentId);
    return session?.status || 'not_started';
  }, [sessions]);

  const updateElapsed = useCallback((lessonId: number, studentId: number, seconds: number) => {
    setSessions(prev => prev.map(s =>
      s.lesson_id === lessonId && s.student_id === studentId
        ? { ...s, elapsed_seconds: seconds }
        : s
    ));
  }, []);

  const getElapsed = useCallback((lessonId: number, studentId: number): number => {
    const session = sessions.find(s => s.lesson_id === lessonId && s.student_id === studentId);
    return session?.elapsed_seconds || 0;
  }, [sessions]);

  const resetAllStatus = useCallback(() => {
    setSessions([]);
  }, []);

  return { sessions, startLesson, completeLesson, getSession, getStatus, updateElapsed, getElapsed, resetAllStatus };
}

// ===== USERS (Teachers & Students) =====
export interface AppUser {
  id: number;
  username: string;
  password: string;
  full_name: string;
  role: 'student' | 'admin' | 'teacher';
  grade_level?: number;
  class_name?: string;
  school_name?: string;
  is_active: boolean;
  created_at: string;
  /** รูปโปรไฟล์ (base64) — เขียนโดยหน้าโปรไฟล์และซิงก์ขึ้นคลาวด์พร้อมทะเบียน */
  profile_image?: string;
}

/**
 * บัญชีผู้ดูแลระบบเริ่มต้น (บัญชีเดียว — ใช้งานจริง)
 * ผู้ใช้อื่นทั้งหมดสร้างผ่านหน้า จัดการผู้ใช้ หรือนำเข้า CSV เท่านั้น
 */
const seedUsers: AppUser[] = [
  { id: 1, username: 'admin', password: 'Dew0842239351', full_name: 'ผู้ดูแลระบบ', role: 'admin', is_active: true, created_at: '2026-09-11' },
];

const KEYS_USERS = 'scitech_users';
let nextUserId = Math.max(...seedUsers.map(u => u.id)) + 1;

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>(() => {
    const stored = loadFromStorage<AppUser[]>(KEYS_USERS, seedUsers);
    if (!Array.isArray(stored) || stored.length === 0) return seedUsers;
    // ไม่ merge mock users อีกต่อไป — ข้อมูลจริงเท่านั้น
    return stored;
  });

  useEffect(() => {
    saveToStorage(KEYS_USERS, users);
  }, [users]);

  const addUser = useCallback((user: Omit<AppUser, 'id' | 'created_at'>) => {
    const newUser: AppUser = {
      ...user,
      id: nextUserId++,
      created_at: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, []);

  const updateUser = useCallback((id: number, updates: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const deleteUser = useCallback((id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const toggleUserActive = useCallback((id: number) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, is_active: !u.is_active } : u
    ));
  }, []);

  const getUsersByRole = useCallback((role: 'student' | 'teacher' | 'admin') => {
    return users.filter(u => u.role === role);
  }, [users]);

  const getStudentsByGrade = useCallback((gradeLevel: number) => {
    return users.filter(u => u.role === 'student' && u.grade_level === gradeLevel);
  }, [users]);

  return { users, addUser, updateUser, deleteUser, toggleUserActive, getUsersByRole, getStudentsByGrade };
}
