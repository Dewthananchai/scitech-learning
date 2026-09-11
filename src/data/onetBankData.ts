/* ==========================================================
   คลังข้อมูลข้อสอบ O-NET (ใช้ร่วมกันระหว่าง Admin คลังข้อสอบ
   กับ ระบบฝึกทำข้อสอบ O-NET ของนักเรียน) — localStorage keys
   ตรงกับไฟล์ตัวอย่าง HTML: onet_bank_data_v1 / onet_levels_v1
   / onet_years_v1
   ========================================================== */

export const ONET_QUESTION_KEY = 'onet_bank_data_v1';
export const ONET_LEVELS_KEY = 'onet_levels_v1';
export const ONET_YEARS_KEY = 'onet_years_v1';
export const ONET_HISTORY_KEY = 'onet_exam_history_v1';
export const ONET_GENERAL = 'ทั่วไป';

export const subjectInfo: Record<string, { name: string; icon: string }> = {
  science: { name: 'วิทยาศาสตร์', icon: '🔬' },
  math: { name: 'คณิตศาสตร์', icon: '➗' },
  thai: { name: 'ภาษาไทย', icon: '🇹🇭' },
  english: { name: 'ภาษาอังกฤษ', icon: '🇬🇧' },
  social: { name: 'สังคมศึกษา', icon: '🌍' },
};

export interface OnetBankQuestion {
  id: string;
  isDefault?: boolean;
  level: string;
  year: string;
  set: string;       // ชุดข้อสอบ เช่น '1', '2', '3'
  subject: string;
  q: string;
  q_image?: string;
  choices: string[];
  choice_images?: string[];
  answer: number;
  explain: string;
  explain_image?: string;
}

/* คลังเริ่มว่าง — admin นำเข้าข้อสอบเอง */


export const DEFAULT_LEVELS = ['ป.6', 'ม.3', 'ม.6'];

export const DEFAULT_ONET_YEARS = [ONET_GENERAL, '2565', '2566', '2567', '2568'];

/**
 * โหลดคลังข้อสอบ O-NET จาก localStorage — เริ่มว่าง (ใช้งานจริง)
 * admin นำเข้าข้อสอบเองผ่านหน้าจัดการคลัง O-NET (CSV หรือเพิ่มทีละข้อ)
 */
export function ensureOnetBankData(): OnetBankQuestion[] {
  let stored: OnetBankQuestion[] = [];
  try {
    const raw = localStorage.getItem(ONET_QUESTION_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) stored = d;
    }
  } catch { /* ignore */ }
  return stored;
}

/** นับจำนวนข้อในคลัง */
export function getOnetBankCount(): number {
  return ensureOnetBankData().length;
}

/* ---- รายชื่อระดับชั้น / ปี (จัดการหน้า "ระดับชั้น & ปี") ---- */
export function loadLevelList(): string[] {
  try {
    const raw = localStorage.getItem(ONET_LEVELS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) return d;
    }
  } catch { /* ignore */ }
  const list = [...DEFAULT_LEVELS];
  try { localStorage.setItem(ONET_LEVELS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list;
}

export function loadOnetYearList(): string[] {
  try {
    const raw = localStorage.getItem(ONET_YEARS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) return d;
    }
  } catch { /* ignore */ }
  const list = [...DEFAULT_ONET_YEARS];
  try { localStorage.setItem(ONET_YEARS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list;
}
