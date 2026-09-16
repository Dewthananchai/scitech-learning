export interface SubjectUnit {
  id: number;
  grade_level: number;
  unit_name: string;
  unit_code: string;
  description: string;
  icon_url?: string;
  is_active: boolean;
}

export interface LessonMedia {
  type: 'youtube' | 'pdf' | 'google_drive' | 'image' | 'video';
  url: string;
  title?: string;
}

export interface Lesson {
  id: number;
  subject_unit_id: number;
  title: string;
  content: string;
  summary?: string;
  cover_image?: string;
  media_type?: 'image' | 'video' | 'pdf' | 'youtube' | 'google_drive' | 'none';
  media_url?: string;
  media_items?: LessonMedia[];
  difficulty: number;
  estimated_minutes?: number;
  view_count: number;
  is_published: boolean;
}

export interface Question {
  id: number;
  subject_unit_id: number;
  lesson_id?: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  explanation?: string;
  difficulty: number;
  is_active: boolean;
  category?: 'lesson' | 'onet' | 'm1';
  subject?: string;
}

export const ONET_SUBJECTS = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ'];
export const M1_SUBJECTS = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา'];

export interface Quiz {
  id: number;
  lesson_id: number;
  subject_unit_id: number;
  quiz_title: string;
  description?: string;
  total_questions: number;
  time_limit_minutes?: number;
  passing_score: number;
  max_attempts: number;
  is_randomized: boolean;
  shuffle_options: boolean;
}

export interface QuizAttempt {
  id: number;
  user_id: number;
  quiz_id: number;
  score: number;
  total_correct: number;
  total_wrong: number;
  answers_json?: string;
  passed: boolean;
  started_at: string;
  completed_at?: string;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'student' | 'admin' | 'teacher';
  grade_level?: number;
  school_name?: string;
  profile_image?: string;
}

export interface QuizResult {
  question_id: number;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

// ===== ANNOUNCEMENTS =====
export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'urgent' | 'event' | 'assignment';
  target_audience: 'all' | 'students' | 'teachers';
  grade_levels?: number[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string;
}

// ===== CALENDAR EVENTS =====
export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  time?: string;
  end_date?: string;
  type: 'lesson' | 'exam' | 'holiday' | 'assignment' | 'event';
  color: string;
  grade_levels?: number[];
  is_recurring?: boolean;
}

export interface GradeInfo {
  level: number;
  label: string;
  color: string;
}

// ===== ATTENDANCE =====
export interface AttendanceSession {
  id: number;
  title: string;
  date: string;
  time?: string;
  grade_level: number;
  subject_unit_id?: number;
  status: 'open' | 'closed';
  created_by: string;
  created_at: string;
}

export interface AttendanceRecord {
  /** uuid (ตาราง attendance_records) หรือตัวเลขเดิม (แถว legacy ก่อนย้าย) */
  id: number | string;
  session_id: number;
  student_id: number;
  student_name: string;
  grade_level: number;
  status: 'present' | 'absent' | 'late' | 'leave';
  checked_in_at?: string;
  note?: string;
}

// ===== DAILY MISSIONS =====
export interface Mission {
  id: number;
  title: string;
  description: string;
  lesson_id?: number;
  subject_unit_id?: number;
  grade_level: number;
  stars_reward: number;
  question_count: number;
  is_active: boolean;
  is_daily_random: boolean; // true = auto-generate from lessons daily
  created_by: string;
  created_at: string;
  date?: string; // for daily missions
  time_slot?: string; // '07:00' | '09:00' | etc.
}

// ===== LESSON PROGRESS =====
export interface LessonProgress {
  lesson_id: number;
  student_id: number;
  completed_at: string;
}

// ===== DAILY AUTO MISSION =====
// Stored per student per date — auto-generated missions
export interface DailyAutoMission {
  id: string; // `${student_id}-${date}-${timeSlot}`
  student_id: number;
  date: string; // YYYY-MM-DD
  time_slot: string; // '07:00' | '09:00' | '11:00' | '13:00' | '15:00' | '17:00'
  lessons_used: number[]; // lesson IDs used for this time slot
  generated_at: string;
}

// ===== LESSON SESSION STATUS =====
export interface LessonSession {
  lesson_id: number;
  student_id: number;
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string;
  elapsed_seconds?: number; // time spent studying
}

export interface MissionCompletion {
  id: number;
  mission_id: number;
  student_id: number;
  student_name: string;
  score: number;
  total_correct: number;
  total_questions: number;
  stars_earned: number;
  completed_at: string;
  answers?: { question_id: number; answer: string; correct: boolean }[];
}

// ===== WORKSHEETS (ใบงาน) =====
export interface WorksheetQuestion {
  id: number;
  type: 'mc' | 'essay' | 'fill';
  text: string;
  choices: string[];        // 4 choices for mc (ก ข ค ง); empty for essay/fill
  correct_index: number;    // 0-3 for mc; -1 for others
  score: number;
  image?: string;           // base64 data URL of attached image
}

export interface Worksheet {
  id: number;
  title: string;
  subject: string;
  grade_level: number;
  unit_id: number | null;   // SubjectUnit.id
  unit_name: string;
  open_at: string;          // datetime-local string
  close_at: string;
  duration_minutes: number;
  questions: WorksheetQuestion[];
  status: 'draft' | 'published';
  created_by: string;
  created_at: string;
}

export interface WorksheetAnswer {
  question_id: number;
  value: string;   // mc: choice index as string; fill/essay: typed text
  score?: number;  // teacher-assigned score (filled during grading)
  comment?: string; // teacher comment (filled during grading)
}

export interface WorksheetSubmission {
  /** uuid (ตาราง worksheet_submissions) หรือตัวเลขเดิม (แถว legacy ก่อนย้าย) */
  id: number | string;
  worksheet_id: number;
  student_id: number;
  answers: WorksheetAnswer[];
  submitted_at: string;
  is_late: boolean;
  status?: 'submitted' | 'graded';
  total_score?: number;
  graded_at?: string;
  graded_by?: string;
  /** true = ยังไม่ขึ้นเซิร์ฟเวอร์ (เซิร์ฟเวอร์ล่มตอนส่ง) — polling จะ push ซ้ำอัตโนมัติ */
  _pending?: boolean;
}

export const GRADES: GradeInfo[] = [
  { level: 1, label: 'ป.1', color: 'bg-green-100 text-green-700 border-green-300' },
  { level: 2, label: 'ป.2', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { level: 3, label: 'ป.3', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { level: 4, label: 'ป.4', color: 'bg-red-100 text-red-700 border-red-300' },
  { level: 5, label: 'ป.5', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { level: 6, label: 'ป.6', color: 'bg-pink-100 text-pink-700 border-pink-300' },
];
