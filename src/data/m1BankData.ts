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

const SEED_FLAG_KEY = 'scitech_m1_seed_v2';

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

/* ---- ข้อสอบเริ่มต้น 33 ข้อ (ตามตัวอย่าง HTML) ---- */
const RAW_SEEDS: Array<Omit<M1BankQuestion, 'id'>> = [
  // ----- วิทยาศาสตร์ ชุดที่ 1 -----
  { school: GENERAL, year: GENERAL, set: '1', subject: 'science', q: 'หน่วยของแรงในระบบ SI คือข้อใด?', choices: ['จูล', 'นิวตัน', 'วัตต์', 'ปาสคาล'], answer: 1, explain: 'หน่วยแรงคือนิวตัน (N) ตาม F=ma' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'science', q: 'สารใดเป็นธาตุ ไม่ใช่สารประกอบ?', choices: ['น้ำ', 'เกลือแกง', 'ออกซิเจน', 'น้ำตาล'], answer: 2, explain: 'ออกซิเจนเป็นธาตุ ส่วนอื่นเป็นสารประกอบ' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'science', q: 'การสังเคราะห์แสงเกิดที่ส่วนใดของเซลล์พืช?', choices: ['ไมโทคอนเดรีย', 'คลอโรพลาสต์', 'นิวเคลียส', 'ไรโบโซม'], answer: 1, explain: 'คลอโรพลาสต์มีคลอโรฟิลล์ใช้สังเคราะห์แสง' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'science', q: 'pH ของสารละลายกลางมีค่าเท่าใด?', choices: ['0', '7', '14', '-7'], answer: 1, explain: 'สารละลายกลาง pH = 7' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'science', q: 'อวัยวะใดสูบฉีดเลือดไปเลี้ยงร่างกาย?', choices: ['ปอด', 'หัวใจ', 'ตับ', 'ไต'], answer: 1, explain: 'หัวใจสูบฉีดเลือดไปเลี้ยงร่างกาย' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'science', q: 'ก๊าซใดที่พืชใช้สังเคราะห์แสง?', choices: ['ออกซิเจน', 'คาร์บอนไดออกไซด์', 'ไนโตรเจน', 'ไฮโดรเจน'], answer: 1, explain: 'พืชใช้ CO2 ในการสังเคราะห์แสง' },
  // ----- คณิตศาสตร์ ชุดที่ 1 -----
  { school: GENERAL, year: GENERAL, set: '1', subject: 'math', q: 'ถ้า 2x+5=15 แล้ว x เท่าใด?', choices: ['5', '10', '7.5', '2'], answer: 0, explain: '2x=10 → x=5' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'math', q: 'พื้นที่วงกลมรัศมี 7 (π≈22/7)?', choices: ['154', '44', '49', '22'], answer: 0, explain: 'A=πr²=22/7×49=154' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'math', q: 'ค่าเฉลี่ยของ 4,8,12,16?', choices: ['8', '10', '12', '40'], answer: 1, explain: '(4+8+12+16)/4=10' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'math', q: '3²+4² เท่ากับเท่าใด?', choices: ['25', '24', '12', '49'], answer: 0, explain: '9+16=25' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'math', q: 'ร้อยละ 20 ของ 250?', choices: ['25', '50', '20', '500'], answer: 1, explain: '250×0.2=50' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'math', q: '1/2+1/3 เท่ากับเท่าใด?', choices: ['2/5', '5/6', '1/6', '2/6'], answer: 1, explain: '3/6+2/6=5/6' },
  // ----- ภาษาไทย ชุดที่ 1 -----
  { school: GENERAL, year: GENERAL, set: '1', subject: 'thai', q: 'คำว่า อาทิตย์ มาจากภาษาใด?', choices: ['บาลี', 'สันสกฤต', 'เขมร', 'จีน'], answer: 1, explain: 'อาทิตย์มาจากสันสกฤต' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'thai', q: 'คำราชาศัพท์ กิน ของกษัตริย์คือ?', choices: ['เสวย', 'รับประทาน', 'ฉัน', 'ทาน'], answer: 0, explain: 'เสวยใช้กับพระมหากษัตริย์' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'thai', q: 'คำซ้อนคือคำแบบใด?', choices: ['นำคำความหมายคล้ายกันมาซ้อน', 'ออกเสียงซ้ำ', 'มาจากต่างประเทศ', 'พยางค์เดียว'], answer: 0, explain: 'คำซ้อนนำคำความหมายเหมือน/คล้ายมาซ้อนกัน' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'thai', q: 'พระอภัยมณีแต่งโดยใคร?', choices: ['สุนทรภู่', 'เจ้าฟ้าธรรมธิเบศร', 'รัชกาลที่ 2', 'ศรีปราชญ์'], answer: 0, explain: 'สุนทรภู่แต่งพระอภัยมณี' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'thai', q: 'อักษรสามหมู่ได้แก่?', choices: ['สูง กลาง ต่ำ', 'สูง ต่ำ กลาง', 'อะ อิ อุ', 'ก ข ค'], answer: 0, explain: 'พยัญชนะแบ่งเป็นอักษรสูง กลาง ต่ำ' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'thai', q: 'คำในข้อใดเป็นคำสมาส?', choices: ['ราชการ', 'ตู้เย็น', 'รถไฟ', 'บ้านเรือน'], answer: 0, explain: 'ราชการเป็นคำสมาสบาลี-สันสกฤต' },
  // ----- ภาษาอังกฤษ ชุดที่ 1 -----
  { school: GENERAL, year: GENERAL, set: '1', subject: 'english', q: 'Choose the correct sentence.', choices: ['She go to school.', 'She goes to school.', 'She going to school.', 'She gone to school.'], answer: 1, explain: 'Third person singular ใช้ goes' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'english', q: 'Opposite of increase?', choices: ['Raise', 'Decrease', 'Grow', 'Expand'], answer: 1, explain: 'Decrease คือคำตรงข้าม increase' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'english', q: 'I ___ to Paris last year.', choices: ['go', 'goes', 'went', 'gone'], answer: 2, explain: 'Past Simple ใช้ went' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'english', q: 'Plural form of child?', choices: ['childs', 'children', 'childes', 'child'], answer: 1, explain: 'child→children' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'english', q: 'Past participle of eat?', choices: ['Ate', 'Eaten', 'Eating', 'Eats'], answer: 1, explain: 'eat-ate-eaten' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'english', q: 'They ___ playing football now.', choices: ['is', 'am', 'are', 'be'], answer: 2, explain: 'They ใช้ are + Present Continuous' },
  // ----- สังคมศึกษา ชุดที่ 1 -----
  { school: GENERAL, year: GENERAL, set: '1', subject: 'social', q: 'ไทยปกครองด้วยระบอบใด?', choices: ['สังคมนิยม', 'ประชาธิปไตยมีกษัตริย์เป็นประมุข', 'คอมมิวนิสต์', 'สมบูรณาญาสิทธิราชย์'], answer: 1, explain: 'ไทยปกครองแบบประชาธิปไตยอันมีพระมหากษัตริย์ทรงเป็นประมุข' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'social', q: 'แม่น้ำสายใดยาวที่สุดที่ไหลผ่านไทย?', choices: ['เจ้าพระยา', 'โขง', 'มูล', 'ปิง'], answer: 1, explain: 'แม่น้ำโขงยาวที่สุดในภูมิภาค' },
  { school: GENERAL, year: GENERAL, set: '1', subject: 'social', q: 'คนไทยส่วนใหญ่นับถือศาสนาใด?', choices: ['คริสต์', 'อิสลาม', 'พุทธ', 'ฮินดู'], answer: 2, explain: 'คนไทยส่วนใหญ่นับถือศาสนาพุทธ' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'social', q: 'เปลี่ยนแปลงการปกครอง 2475 เกิดในรัชกาลใด?', choices: ['ร.5', 'ร.6', 'ร.7', 'ร.8'], answer: 2, explain: 'เกิดในรัชสมัยรัชกาลที่ 7' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'social', q: 'ภูเขาสูงสุดในไทยคือ?', choices: ['ดอยอินทนนท์', 'ดอยสุเทพ', 'ภูกระดึง', 'เขาหลวง'], answer: 0, explain: 'ดอยอินทนนท์สูงที่สุดในไทย' },
  { school: GENERAL, year: GENERAL, set: '2', subject: 'social', q: 'ทวีปที่ใหญ่ที่สุดในโลกคือ?', choices: ['แอฟริกา', 'เอเชีย', 'อเมริกาเหนือ', 'ยุโรป'], answer: 1, explain: 'ทวีปเอเชียใหญ่ที่สุดในโลก' },
  // ----- ข้อสอบจริงโรงเรียนดัง -----
  { school: 'สวนกุหลาบวิทยาลัย', year: '2568', set: '1', subject: 'math', q: '(ตัวอย่างข้อสอบจริง) ถ้า x+7=20 แล้ว x เท่าใด?', choices: ['13', '27', '7', '20'], answer: 0, explain: 'x=20-7=13' },
  { school: 'สวนกุหลาบวิทยาลัย', year: '2568', set: '1', subject: 'science', q: '(ตัวอย่างข้อสอบจริง) แรงโน้มถ่วงโลกมีค่าประมาณเท่าใด?', choices: ['9.8 m/s²', '5 m/s²', '15 m/s²', '1 m/s²'], answer: 0, explain: 'g ≈ 9.8 m/s²' },
  { school: 'มหิดลวิทยานุสรณ์', year: '2567', set: '1', subject: 'science', q: '(ตัวอย่างข้อสอบจริง) ธาตุที่มีเลขอะตอม 1 คือ?', choices: ['ฮีเลียม', 'ไฮโดรเจน', 'ออกซิเจน', 'คาร์บอน'], answer: 1, explain: 'ไฮโดรเจนมีเลขอะตอม 1' },
];

export function seedAll(): M1BankQuestion[] {
  return RAW_SEEDS.map((d, i) => ({ ...d, id: 'seed_m1_' + i, isDefault: true }));
}

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
 * โหลดคลังข้อสอบจาก localStorage — ถ้ายังไม่เคยมีข้อมูล (หรือเพิ่งเปลี่ยนเวอร์ชัน seed)
 * ให้เพิ่มข้อสอบตัวอย่างเข้าไปครั้งเดียว แล้วค่อยให้ admin จัดการเอง
 */
export function ensureBankData(): M1BankQuestion[] {
  let stored: M1BankQuestion[] | null = null;
  try {
    const raw = localStorage.getItem(QUESTION_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d)) stored = d;
    }
  } catch { /* ignore */ }

  // ยังไม่เคยมีคลังเลย → สร้างพร้อมข้อสอบตัวอย่าง
  if (stored === null) {
    const seeds = seedAll();
    try {
      localStorage.setItem(QUESTION_KEY, JSON.stringify(seeds));
      localStorage.setItem(SEED_FLAG_KEY, '1');
    } catch { /* ignore */ }
    return seeds;
  }

  // มีคลังเดิมอยู่แล้วแต่ยังไม่ได้ merge seed ใหม่ (อัปเกรดจากเวอร์ชันเก่า) → เพิ่มข้อที่ขาด
  try {
    if (!localStorage.getItem(SEED_FLAG_KEY)) {
      const existingTexts = new Set(stored.map(q => q.q));
      const missing = seedAll().filter(s => !existingTexts.has(s.q));
      if (missing.length > 0) stored = [...stored, ...missing];
      localStorage.setItem(QUESTION_KEY, JSON.stringify(stored));
      localStorage.setItem(SEED_FLAG_KEY, '1');
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
