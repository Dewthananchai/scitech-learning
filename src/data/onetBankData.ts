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

const SEED_FLAG_KEY = 'scitech_onet_seed_v1';

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

/* ---- ข้อสอบเริ่มต้น 20 ข้อ (ตามตัวอย่าง HTML) ---- */
const RAW_SEEDS: Array<Omit<OnetBankQuestion, 'id'>> = [
  /* ===== ป.6 ชุดที่ 1 ===== */
  { level: 'ป.6', year: ONET_GENERAL, set: '1', subject: 'thai', q: "คำว่า 'มานะ' ในบริบท 'เขามีมานะพยายาม' หมายถึงข้อใด?", choices: ['ความเกียจคร้าน', 'ความอดทนพยายาม', 'ความโกรธ', 'ความสงสัย'], answer: 1, explain: 'มานะในที่นี้หมายถึงความอดทนพยายาม' },
  { level: 'ป.6', year: ONET_GENERAL, set: '1', subject: 'math', q: '5/6 - 1/3 มีค่าเท่าใด?', choices: ['1/2', '1/3', '2/3', '4/6'], answer: 0, explain: '5/6-2/6=3/6=1/2' },
  { level: 'ป.6', year: ONET_GENERAL, set: '1', subject: 'science', q: 'สัตว์ในข้อใดเป็นสัตว์เลี้ยงลูกด้วยนม?', choices: ['จระเข้', 'วาฬ', 'งู', 'นกอินทรี'], answer: 1, explain: 'วาฬเป็นสัตว์เลี้ยงลูกด้วยนมที่อาศัยในน้ำ' },
  { level: 'ป.6', year: ONET_GENERAL, set: '1', subject: 'english', q: "What is the plural of 'foot'?", choices: ['Foots', 'Feet', 'Footes', 'Foot'], answer: 1, explain: 'Irregular plural: foot-feet' },
  { level: 'ป.6', year: ONET_GENERAL, set: '1', subject: 'social', q: 'เทศกาลลอยกระทงตรงกับวันใด?', choices: ['วันเพ็ญเดือน 12', 'วันเพ็ญเดือน 6', 'วันขึ้นปีใหม่', 'วันสงกรานต์'], answer: 0, explain: 'ลอยกระทงตรงกับวันเพ็ญเดือน 12' },
  /* ===== ป.6 ชุดที่ 2 ===== */
  { level: 'ป.6', year: ONET_GENERAL, set: '2', subject: 'math', q: 'ถ้าสี่เหลี่ยมผืนผ้ากว้าง 5 ซม. ยาว 8 ซม. มีพื้นที่เท่าใด?', choices: ['13 ตร.ซม.', '40 ตร.ซม.', '26 ตร.ซม.', '45 ตร.ซม.'], answer: 1, explain: 'พื้นที่ = กว้าง×ยาว = 5×8 = 40' },
  { level: 'ป.6', year: ONET_GENERAL, set: '2', subject: 'science', q: 'แหล่งพลังงานใดเป็นพลังงานหมุนเวียน?', choices: ['ถ่านหิน', 'น้ำมัน', 'แสงอาทิตย์', 'ก๊าซธรรมชาติ'], answer: 2, explain: 'แสงอาทิตย์เป็นพลังงานหมุนเวียนที่ใช้ไม่หมด' },

  /* ===== ม.3 ชุดที่ 1 ===== */
  { level: 'ม.3', year: ONET_GENERAL, set: '1', subject: 'math', q: 'ถ้า x²=49 แล้วค่าของ x คือข้อใด?', choices: ['7 เท่านั้น', '-7 เท่านั้น', '7 หรือ -7', '49'], answer: 2, explain: 'รากที่สองของ 49 มีค่า 7 และ -7' },
  { level: 'ม.3', year: ONET_GENERAL, set: '1', subject: 'science', q: 'ปฏิกิริยาเคมีในข้อใดเป็นปฏิกิริยาดูดความร้อน?', choices: ['การเผาไหม้', 'การละลายของแอมโมเนียมไนเตรตในน้ำ', 'การจุดไม้ขีดไฟ', 'การหายใจของสิ่งมีชีวิต'], answer: 1, explain: 'การละลายของแอมโมเนียมไนเตรตดูดความร้อนจากสิ่งแวดล้อม' },
  { level: 'ม.3', year: ONET_GENERAL, set: '1', subject: 'thai', q: "คำในข้อใดเป็นคำพ้องความหมายกับ 'สรรเสริญ'?", choices: ['ตำหนิ', 'ยกย่อง', 'ดูหมิ่น', 'ประณาม'], answer: 1, explain: 'สรรเสริญ หมายถึง ยกย่องชมเชย' },
  { level: 'ม.3', year: ONET_GENERAL, set: '1', subject: 'english', q: 'She ___ finished her homework before dinner.', choices: ['has', 'have', 'had', 'having'], answer: 2, explain: 'Past Perfect ใช้ had + V3 กับเหตุการณ์ที่เกิดก่อน' },
  { level: 'ม.3', year: ONET_GENERAL, set: '1', subject: 'social', q: 'หลักการแบ่งแยกอำนาจในระบอบประชาธิปไตยประกอบด้วยอำนาจใดบ้าง?', choices: ['นิติบัญญัติ บริหาร ตุลาการ', 'ทหาร ตำรวจ พลเรือน', 'ท้องถิ่น ภูมิภาค ส่วนกลาง', 'เศรษฐกิจ สังคม การเมือง'], answer: 0, explain: 'อำนาจอธิปไตยแบ่งเป็น 3 ฝ่าย คือนิติบัญญัติ บริหาร ตุลาการ' },
  { level: 'ม.3', year: ONET_GENERAL, set: '2', subject: 'math', q: 'ความชันของเส้นตรงที่ผ่านจุด (1,2) และ (3,8) คือเท่าใด?', choices: ['2', '3', '4', '6'], answer: 2, explain: 'ความชัน = (8-2)/(3-1) = 6/2 = 3' },

  /* ===== ม.6 ชุดที่ 1 ===== */
  { level: 'ม.6', year: ONET_GENERAL, set: '1', subject: 'math', q: 'อนุพันธ์ของ f(x)=3x²+2x คือข้อใด?', choices: ['6x+2', '3x+2', '6x²+2', 'x²+2x'], answer: 0, explain: "f'(x)=6x+2 ตามกฎอนุพันธ์พหุนาม" },
  { level: 'ม.6', year: ONET_GENERAL, set: '1', subject: 'science', q: 'กฎข้อที่สองของนิวตันคือข้อใด?', choices: ['F=ma', 'E=mc²', 'P=mv', 'W=Fd'], answer: 0, explain: 'F=ma คือกฎข้อที่สองของนิวตัน' },
  { level: 'ม.6', year: ONET_GENERAL, set: '1', subject: 'thai', q: 'ฉันทลักษณ์ในข้อใดใช้แต่งโคลงสี่สุภาพ?', choices: ['สัมผัสสระ วรรณยุกต์เอกโท', 'สัมผัสพยัญชนะเท่านั้น', 'ไม่มีกฎสัมผัส', 'ใช้คำครุลหุเท่านั้น'], answer: 0, explain: 'โคลงสี่สุภาพมีข้อบังคับเรื่องสัมผัสและวรรณยุกต์เอกโท' },
  { level: 'ม.6', year: ONET_GENERAL, set: '1', subject: 'english', q: 'If I ___ more time, I would travel around the world.', choices: ['have', 'had', 'has', 'having'], answer: 1, explain: 'Second Conditional ใช้ If + past simple, would + V1' },
  { level: 'ม.6', year: ONET_GENERAL, set: '1', subject: 'social', q: 'GDP ย่อมาจากอะไร?', choices: ['Gross Domestic Product', 'General Development Plan', 'Global Data Processing', 'Government Debt Percentage'], answer: 0, explain: 'GDP คือผลิตภัณฑ์มวลรวมภายในประเทศ' },
  { level: 'ม.6', year: ONET_GENERAL, set: '2', subject: 'math', q: 'ถ้า log₂8 = x แล้ว x เท่ากับเท่าใด?', choices: ['2', '3', '4', '8'], answer: 1, explain: '2³=8 ดังนั้น log₂8=3' },
];

export function seedOnetAll(): OnetBankQuestion[] {
  return RAW_SEEDS.map((d, i) => ({ ...d, id: 'seed_onet_' + i, isDefault: true }));
}

export const DEFAULT_LEVELS = ['ป.6', 'ม.3', 'ม.6'];

export const DEFAULT_ONET_YEARS = [ONET_GENERAL, '2565', '2566', '2567', '2568'];

/**
 * โหลดคลังข้อสอบ O-NET จาก localStorage — ถ้ายังไม่เคยมีข้อมูล
 * ให้เพิ่มข้อสอบตัวอย่างเข้าไปครั้งเดียว แล้วค่อยให้ admin จัดการเอง
 */
export function ensureOnetBankData(): OnetBankQuestion[] {
  let stored: OnetBankQuestion[] | null = null;
  try {
    const raw = localStorage.getItem(ONET_QUESTION_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) stored = d;
    }
  } catch { /* ignore */ }

  // ยังไม่เคยมีคลังเลย → สร้างพร้อมข้อสอบตัวอย่าง
  if (stored === null) {
    const seeds = seedOnetAll();
    try {
      localStorage.setItem(ONET_QUESTION_KEY, JSON.stringify(seeds));
      localStorage.setItem(SEED_FLAG_KEY, '1');
    } catch { /* ignore */ }
    return seeds;
  }

  // มีคลังเดิมอยู่แล้วแต่ยังไม่ได้ merge seed ใหม่ → เพิ่มข้อที่ขาด
  try {
    if (!localStorage.getItem(SEED_FLAG_KEY)) {
      const existingTexts = new Set(stored.map(q => q.q));
      const missing = seedOnetAll().filter(s => !existingTexts.has(s.q));
      if (missing.length > 0) stored = [...stored, ...missing];
      localStorage.setItem(ONET_QUESTION_KEY, JSON.stringify(stored));
      localStorage.setItem(SEED_FLAG_KEY, '1');
    }
  } catch { /* ignore */ }
  return stored;
}

/** นับจำนวนข้อในคลัง (พร้อม seed ครั้งแรก) */
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
