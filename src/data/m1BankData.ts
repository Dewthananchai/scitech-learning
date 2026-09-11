/* ==========================================================
   คลังข้อมูลข้อสอบเข้า ม.1 (ใช้ร่วมกันระหว่าง Admin คลังข้อสอบ
   กับ ระบบฝึกทำข้อสอบ 🎒 ของนักเรียน) — localStorage keys
   ตรงกับไฟล์ตัวอย่าง HTML: m1_bank_data_v1 / m1_bank_schools_v1
   / m1_bank_years_v1
   ========================================================== */

export const QUESTION_KEY = 'm1_bank_data_v1';
export const SCHOOLS_KEY = 'm1_bank_schools_v1';
export const YEARS_KEY = 'm1_bank_years_v1';
export const HISTORY_KEY = 'm1_exam_history_v1';
export const GENERAL = 'ทั่วไป';

export const subjectInfo: Record<string, { name: string; icon: string }> = {
  science: { name: 'วิทยาศาสตร์', icon: '🔬' },
  math: { name: 'คณิตศาสตร์', icon: '➗' },
  thai: { name: 'ภาษาไทย', icon: '🇹🇭' },
  english: { name: 'ภาษาอังกฤษ', icon: '🇬🇧' },
  social: { name: 'สังคมศึกษา', icon: '🌍' },
};

export interface M1BankQuestion {
  id: string;
  isDefault?: boolean;
  school: string;
  year: string;
  set: string;       // ชุดข้อสอบ เช่น '1', '2', '3'
  subject: string;
  q: string;
  q_image?: string;  // base64 รูปภาพในคำถาม
  choices: string[];
  choice_images?: string[]; // base64 รูปภาพในตัวเลือก (index เดียวกับ choices)
  answer: number;
  explain: string;
  explain_image?: string; // base64 รูปภาพในคำอธิบาย
}

/* คลังเริ่มว่าง — admin นำเข้าข้อสอบเอง */


export const DEFAULT_SCHOOLS = [
  GENERAL,
  'สวนกุหลาบวิทยาลัย',
  'เตรียมอุดมศึกษาพัฒนาการ',
  'สาธิตจุฬาลงกรณ์มหาวิทยาลัย',
  'มหิดลวิทยานุสรณ์',
  'บดินทรเดชา (สิงห์ สิงหเสนี)',
];

export const DEFAULT_YEARS = [GENERAL, '2566', '2567', '2568'];

/**
 * โหลดคลังข้อสอบจาก localStorage — เริ่มว่าง (ใช้งานจริง)
 * admin นำเข้าข้อสอบเองผ่านหน้าจัดการคลัง ม.1 (CSV หรือเพิ่มทีละข้อ)
 */
export function ensureBankData(): M1BankQuestion[] {
  let stored: M1BankQuestion[] = [];
  try {
    const raw = localStorage.getItem(QUESTION_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) stored = d;
    }
  } catch { /* ignore */ }
  return stored;
}

/** นับจำนวนข้อในคลัง (พร้อม seed ครั้งแรก) */
export function getM1BankCount(): number {
  return ensureBankData().length;
}

/* ---- รายชื่อโรงเรียน / ปี (จัดการหน้า "โรงเรียน & ปี") ---- */
export function loadSchoolList(): string[] {
  try {
    const raw = localStorage.getItem(SCHOOLS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) return d;
    }
  } catch { /* ignore */ }
  const list = [...DEFAULT_SCHOOLS];
  try { localStorage.setItem(SCHOOLS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list;
}

export function loadYearList(): string[] {
  try {
    const raw = localStorage.getItem(YEARS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) return d;
    }
  } catch { /* ignore */ }
  const list = [...DEFAULT_YEARS];
  try { localStorage.setItem(YEARS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list;
}
