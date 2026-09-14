/* ============================================================
   🎯 เงื่อนไขการได้ดาว (Star achievements)
   กติกา 3 ข้อ (ค่าเริ่มต้น — ครูแก้ไขได้ที่หน้า จัดการภารกิจ):
     1. เรียนบทเรียนให้ครบ 3 บท        +3⭐
     2. ทำข้อสอบให้ผ่าน 100%          +5⭐
     3. ส่งใบงานครบ 3 ใบ              +10⭐

   ข้อมูลนำเข้า:
     • จำนวนบทเรียนจบ ← scitech_lesson_sessions (status 'completed')
     • ข้อสอบ 100%   ← scitech_quiz_history (บทเรียน) +
                        onet/m1_exam_history_v1 (ข้อสอบ O-NET / เข้า ม.1)
     • ใบงานที่ส่ง    ← scitech_worksheet_submissions (status 'submitted'/'graded')

   การให้ดาว: เขียนลง scitech_star_awards (ซิงก์คลาวด์เหมือนข้อมูลอื่น)
   ดาวรวมที่หน้าจอแสดง = ดาวภารกิจ (scitech_mission_completions) + ดาวเงื่อนไขนี้

   การรีเซ็ต / หมดเวลา: ครูกด "รีเซ็ตดาวนักเรียน" (หรือกำหนดเวลาสิ้นสุดลง) →
   ดาวเงื่อนไขที่ได้ถูกล้าง และความคืบหน้า 3 เงื่อนไข (📘เรียนบทเรียน / 📝ทำข้อสอบ /
   📋ส่งใบงาน) เริ่มนับใหม่จากศูนย์ — กิจกรรมที่ทำ "ก่อน" จุดรีเซ็ตจะไม่ถูกนับในรอบใหม่
   ============================================================ */

export interface StarCondition {
  key: 'lessons3' | 'exam100' | 'worksheets3';
  emoji: string;
  label: string;
  reward: number;
  /** เป้าหมายที่ต้องทำให้ถึง (จำนวนบท/เปอร์เซ็นต์ข้อสอบ/จำนวนใบงาน) */
  target: number;
}

/** ค่าเริ่มต้น — ใช้เมื่อครูยังไม่เคยแก้ไข */
export const DEFAULT_STAR_CONDITIONS: StarCondition[] = [
  { key: 'lessons3', emoji: '📘', label: 'เรียนบทเรียนให้ครบ 3 บท', reward: 3, target: 3 },
  { key: 'exam100', emoji: '📝', label: 'ทำข้อสอบให้ผ่าน 100%', reward: 5, target: 100 },
  { key: 'worksheets3', emoji: '📋', label: 'ส่งใบงานครบ 3 ใบงาน', reward: 10, target: 3 },
];

/* ── การตั้งค่าเงื่อนไข (เก็บรวมกับ กำหนดเวลา) ──────────────────────────
   scitech_star_conditions เก็บออบเจ็กต์เดียว:
     { conditions: StarCondition[], period_start?: string|null, period_end?: string|null,
       started_at?: string|null }
   - period_start/period_end เป็น 'YYYY-MM-DD' (ครูกำหนดช่วงเวลาที่สะสมดาวได้)
   - ช่วงไม่กำหนด = สะสมได้ตลอด                                */
const CONDITIONS_KEY = 'scitech_star_conditions';

export interface StarConditionsSettings {
  conditions: StarCondition[];
  /** วันเริ่มช่วงสะสมดาว 'YYYY-MM-DD' หรือ null = เริ่มแล้วตั้งแต่วันนี้ */
  period_start: string | null;
  /** วันสิ้นสุดช่วงสะสมดาว 'YYYY-MM-DD' หรือ null = ไม่มีวันปิด */
  period_end: string | null;
  /** จุดเวลาเริ่ม "รอบการนับความคืบหน้า" (ISO) — null = นับกิจกรรมทั้งหมด
   *  ครูกดรีเซ็ต → ประทับเวลาใหม่ ความคืบหน้าเก่าไม่ถูกนับอีก */
  started_at?: string | null;
}

const DEFAULT_SETTINGS: StarConditionsSettings = {
  conditions: DEFAULT_STAR_CONDITIONS,
  period_start: null,
  period_end: null,
  started_at: null,
};
/** กติกาปัจจุบัน — อ่านจาก scitech_star_conditions (ซิงก์คลาวด์ ทุกอุปกรณ์เห็นเหมือนกัน)
 *  ถ้าครูแก้เงื่อนไข ค่าที่เปลี่ยนจะมีผลกับนักเรียนที่ "ยังไม่ได้รางวัล" เท่านั้น */
export function getStarConditionsSettings(): StarConditionsSettings {
  try {
    const raw = localStorage.getItem(CONDITIONS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw);
    // รองรับทั้งฟอร์แมตเก่า (array ของเงื่อนไข) และใหม่ (ออบเจ็กต์ settings)
    if (Array.isArray(saved)) {
      if (saved.length !== 3) return DEFAULT_SETTINGS;
      return {
        conditions: DEFAULT_STAR_CONDITIONS.map(d => {
          const s = saved.find((x: StarCondition) => x.key === d.key);
          return s ? { ...d, reward: Math.max(0, Number(s.reward) || d.reward), target: Math.max(1, Number(s.target) || d.target) } : d;
        }),
        period_start: null,
        period_end: null,
        started_at: null,
      };
    }
    if (!saved || !Array.isArray(saved.conditions) || saved.conditions.length !== 3) return DEFAULT_SETTINGS;
    const norm = (v: unknown): string | null => {
      const s = String(v ?? '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    };
    return {
      conditions: DEFAULT_STAR_CONDITIONS.map(d => {
        const s = saved.conditions.find((x: StarCondition) => x.key === d.key);
        return s ? { ...d, reward: Math.max(0, Number(s.reward) || d.reward), target: Math.max(1, Number(s.target) || d.target) } : d;
      }),
      period_start: norm(saved.period_start),
      period_end: norm(saved.period_end),
      started_at: typeof saved.started_at === 'string' && saved.started_at ? saved.started_at : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** เงื่อนไขดาว 3 ข้อ (ตัวย่อของ getStarConditionsSettings) */
export function getStarConditions(): StarCondition[] {
  return getStarConditionsSettings().conditions;
}

/** บันทึกกติกา + กำหนดเวลา (ครูแก้จากหน้าจัดการภารกิจ) — sync layer อัปขึ้นคลาวด์เอง
 *  ไม่ส่ง started_at → คง "รอบนับ" ปัจจุบันไว้ (ไม่รีเซ็ตความคืบหน้าโดยไม่ตั้งใจ) */
export function setStarConditionsSettings(settings: StarConditionsSettings): void {
  const cur = getStarConditionsSettings();
  const clean = {
    conditions: settings.conditions.map(r => ({
      ...r,
      reward: Math.max(0, Math.min(100, Math.round(r.reward) || 0)),
      target: Math.max(1, Math.round(r.target) || 1),
    })),
    period_start: settings.period_start || null,
    period_end: settings.period_end || null,
    started_at: settings.started_at !== undefined ? (settings.started_at || null) : (cur.started_at || null),
  };
  localStorage.setItem(CONDITIONS_KEY, JSON.stringify(clean));
}

/** บันทึกเฉพาะเงื่อนไข (คงกำหนดเวลาเดิมไว้) */
export function setStarConditions(conditions: StarCondition[]): void {
  setStarConditionsSettings({ ...getStarConditionsSettings(), conditions });
}

/** รีเซ็ตกลับค่าเริ่มต้น */
export function resetStarConditions(): void {
  localStorage.removeItem(CONDITIONS_KEY);
}

/** เริ่ม "รอบการนับความคืบหน้า" ใหม่ ณ เวลานี้ — กิจกรรมที่ทำก่อนหน้านี้จะไม่ถูกนับ
 *  (ครูกดรีเซ็ตดาว → เรียนบทเรียน/ทำข้อสอบ/ส่งใบงาน เริ่มนับใหม่จากศูนย์)
 *  คืนเวลาที่ประทับ (ISO) */
export function beginStarRound(): string {
  const started_at = new Date().toISOString();
  const cur = getStarConditionsSettings();
  setStarConditionsSettings({ ...cur, started_at });
  return started_at;
}

/* ── กำหนดเวลาการสะสมดาว ─────────────────────────────────────────── */
const todayLocalISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface StarPeriodInfo {
  start: string | null;
  end: string | null;
  /** สะสมดาวได้ในช่วงนี้หรือไม่ (นอกช่วง = หยุดให้ดาวชั่วคราว) */
  open: boolean;
  /** ข้อความสถานะภาษาไทย สำหรับแสดงบนหน้าจอ */
  statusText: string;
  /** จำนวนวันที่เหลือ (ถ้ามีวันปิด) */
  daysLeft: number | null;
  /** กำหนดเวลา "จบลงแล้ว" หรือยัง (ปีจจุบันหลัง period_end) */
  expired: boolean;
}

/** ข้อมูลช่วงเวลาสะสมดาวปัจจุบัน + เปิด/ปิดอยู่หรือไม่ */
export function getStarPeriodInfo(): StarPeriodInfo {
  const { period_start, period_end } = getStarConditionsSettings();
  const today = todayLocalISO();
  const startOK = !period_start || today >= period_start;
  const endOK = !period_end || today <= period_end;
  const expired = !!period_end && today > period_end;
  let daysLeft: number | null = null;
  if (period_end) daysLeft = Math.max(0, Math.round((new Date(period_end).getTime() - new Date(today).getTime()) / 86400000));
  let statusText: string;
  if (startOK && endOK) {
    statusText = daysLeft !== null ? `เปิดสะสม — เหลืออีก ${daysLeft} วัน (ถึง ${period_end})` : 'เปิดสะสมดาวตลอดเวลา';
  } else if (!startOK) {
    statusText = `ยังไม่เริ่ม — เริ่มวันที่ ${period_start}`;
  } else {
    statusText = `ปิดสะสมแล้ว (จบเมื่อ ${period_end})`;
  }
  return { start: period_start, end: period_end, open: startOK && endOK, statusText, daysLeft, expired };
}

/** เวลาเริ่ม "รอบนับความคืบหน้า" (ISO) — กิจกรรมที่เกิดก่อนหน้านี้ไม่ถูกนับ
 *  เอาค่าล่าสุดจาก 3 จุด:
 *   1) settings.started_at      — ครูกด "รีเซ็ตดาวนักเรียน" (beginStarRound ประทับ)
 *   2) เที่ยงคืนวัน period_start — ครูเปิดกำหนดเวลาใหม่ → รอบนับเริ่มที่วันเริ่ม
 *   3) เที่ยงคืนถัดจาก period_end — กำหนดเวลาหมดลง → รอบใหม่เริ่มอัตโนมัติ
 *  ไม่มีจุดใดเลย (null) = นับทุกกิจกรรม */
function getRoundStart(): string | null {
  const s = getStarConditionsSettings();
  let latest: string | null = s.started_at || null;
  const isoOf = (d: Date) => (Number.isNaN(d.getTime()) ? null : d.toISOString());
  if (s.period_start) {
    const iso = isoOf(new Date(`${s.period_start}T00:00:00`));
    if (iso && (!latest || iso > latest)) latest = iso;
  }
  if (s.period_end) {
    const endMs = new Date(`${s.period_end}T00:00:00`).getTime();
    if (!Number.isNaN(endMs) && Date.now() > endMs + 86400000) { // หมดเวลาแล้ว
      const iso = isoOf(new Date(endMs + 86400000));
      if (iso && (!latest || iso > latest)) latest = iso;
    }
  }
  return latest;
}

/** เวลา (ISO) มากกว่า/เท่ากับ จุดเริ่มรอบหรือไม่
 *  • ไม่มีจุดเริ่มรอบ (roundStart = null) → นับทุกรายการ
 *  • มีจุดเริ่มรอบแต่รายการไม่มีเวลา → ไม่นับ (เผื่อความถูกต้องของรอบ)
 *  รองรับ timestamp 2 รูปแบบ: ISO และ "dd/mm/yyyy, hh:mm" แบบ th-TH */
function afterRoundStart(ts: string | undefined | null, roundStart: string | null): boolean {
  if (!roundStart) return true; // ไม่มีรอบเก่า → นับหมด
  if (!ts) return false; // มีจุดเริ่มรอบ แต่รายการไม่มีเวลา → ถือว่าเก่า
  const startMs = new Date(roundStart).getTime();
  if (Number.isNaN(startMs)) return true;
  const th = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[\s,]+(\d{1,2}):(\d{2})/.exec(ts);
  if (th) {
    // รูปแบบ th-TH dd/mm/yyyy, hh:mm (ปี พ.ศ.) — Date ไม่ parse เอง เขียนแบบชัด ๆ
    const yearBE = Number(th[3]);
    const ms = new Date(yearBE > 2000 ? yearBE - 543 : yearBE, Number(th[2]) - 1, Number(th[1]), Number(th[4]), Number(th[5])).getTime();
    if (!Number.isNaN(ms)) return ms >= startMs;
  }
  const ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) return true; // ไม่เข้าใจรูปแบบ → เผื่อไว้ (ไม่ตัดทิ้ง)
  return ms >= startMs;
}

/** ผลรวมดาวสูงสุดตามกติกาปัจจุบัน (อ่านสด — อย่าแคชค่านี้ในโมดูล) */
export function starConditionsTotal(): number {
  return getStarConditions().reduce((s, c) => s + c.reward, 0);
}

/** @deprecated ใช้ starConditionsTotal() แทน — คงไว้เพื่อความเข้ากันได้ */
export const STAR_CONDITIONS_TOTAL = DEFAULT_STAR_CONDITIONS.reduce((s, c) => s + c.reward, 0);

const AWARDS_KEY = 'scitech_star_awards';

export interface StarAward {
  student_id: number;
  condition: StarCondition['key'];
  stars: number;
  awarded_at: string;
}

function loadAwards(): StarAward[] {
  try {
    const raw = localStorage.getItem(AWARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAwards(awards: StarAward[]): void {
  localStorage.setItem(AWARDS_KEY, JSON.stringify(awards));
}

export interface StarProgress {
  lessonsCompleted: number;
  bestExamPercent: number;
  worksheetsSubmitted: number;
}

export function getStarProgress(studentId: number): StarProgress {
  // จุดเริ่มรอบนับ — กิจกรรมที่เกิดก่อนหน้านี้ (รอบเก่า/ถูกรีเซ็ต/หมดเวลา) ไม่ถูกนับ
  const roundStart = getRoundStart();

  // 1) บทเรียนที่เรียนจบ (เซสชันสถานะ completed — ตัวเดียวกับหน้าแดชบอร์ด/บทเรียน)
  //    นับเฉพาะที่จบ "หลังจุดเริ่มรอบ" → รีเซ็ตแล้วเริ่มนับใหม่จากศูนย์
  let lessonsCompleted = 0;
  try {
    const sessions: Array<{ student_id: number; status?: string; completed_at?: string }> =
      JSON.parse(localStorage.getItem('scitech_lesson_sessions') || '[]');
    lessonsCompleted = sessions.filter(
      s => s.student_id === studentId && s.status === 'completed'
        && afterRoundStart(s.completed_at, roundStart)
    ).length;
  } catch { /* ไม่มีข้อมูล */ }

  // 2) ข้อสอบผ่านเป้า (คะแนนสูงสุด) — เช็คทุกแหล่งประวัติ เฉพาะที่สอบ "หลังจุดเริ่มรอบ"
  let bestExamPercent = 0;
  try {
    // 2a) ข้อสอบบทเรียน (QuizPage บันทึกลง scitech_quiz_history)
    const quizHist: Array<{ student_id: number; score?: number; completed_at?: string }> =
      JSON.parse(localStorage.getItem('scitech_quiz_history') || '[]');
    bestExamPercent = Math.max(
      bestExamPercent,
      ...quizHist.filter(h => h.student_id === studentId && afterRoundStart(h.completed_at, roundStart))
        .map(h => Number(h.score) || 0),
      0
    );
  } catch { /* ignore */ }
  try {
    // 2b) ข้อสอบ O-NET และเข้า ม.1 — ระเบียนมี student_id หลัง 2569-09-13 เท่านั้น
    //     (ระเบียนเก่าไม่มี student_id → ไม่นับ เพื่อไม่ให้ตัวเลขข้ามบัญชี)
    for (const key of ['onet_exam_history_v1', 'm1_exam_history_v1']) {
      const hist: Array<{ percentage?: number; student_id?: number; created_at?: string }> =
        JSON.parse(localStorage.getItem(key) || '[]');
      bestExamPercent = Math.max(
        bestExamPercent,
        ...hist.filter(h => h.student_id === studentId && afterRoundStart(h.created_at, roundStart))
          .map(h => Number(h.percentage) || 0),
        0
      );
    }
    // ประวัติต่อผู้ใช้ (histKey = scitech_onet_history_<id> / scitech_m1_history_<id>)
    for (const key of [`scitech_onet_history_${studentId}`, `scitech_m1_history_${studentId}`]) {
      const hist: Array<{ percentage?: number; date?: string }> = JSON.parse(localStorage.getItem(key) || '[]');
      bestExamPercent = Math.max(
        bestExamPercent,
        ...hist.filter(h => afterRoundStart(h.date, roundStart)).map(h => Number(h.percentage) || 0),
        0
      );
    }
  } catch { /* ignore */ }

  // 3) ใบงานที่ส่ง (นับใบที่ส่งแล้ว — สถานะ submitted หรือ graded)
  //    นับเฉพาะที่ส่ง "หลังจุดเริ่มรอบ" → รีเซ็ตแล้วเริ่มนับใหม่จากศูนย์
  let worksheetsSubmitted = 0;
  try {
    const subs: Array<{ student_id: number; worksheet_id: number; status?: string; submitted_at?: string }> =
      JSON.parse(localStorage.getItem('scitech_worksheet_submissions') || '[]');
    worksheetsSubmitted = new Set(
      subs.filter(s => s.student_id === studentId
        && (!s.status || s.status === 'submitted' || s.status === 'graded')
        && afterRoundStart(s.submitted_at, roundStart))
        .map(s => s.worksheet_id)
    ).size;
  } catch { /* ไม่มีข้อมูล */ }

  return { lessonsCompleted, bestExamPercent, worksheetsSubmitted };
}

/** ชื่อกติกาแบบไดนามิก — ฝังเป้าหมายปัจจุบันที่ครูตั้งลงในข้อความ
 *  (เช่น ครูตั้งเป้า 5 บท → "เรียนบทเรียนให้ครบ 5 บท" ไม่ใช่ข้อความเดิมติด 3) */
export function starConditionLabel(c: StarCondition): string {
  if (c.key === 'lessons3') return `เรียนบทเรียนให้ครบ ${c.target} บท`;
  if (c.key === 'exam100') return `ทำข้อสอบให้ผ่าน ${c.target}%`;
  return `ส่งใบงานครบ ${c.target} ใบงาน`;
}

/** เงื่อนไขไหนควรได้รับแล้ว (ตามความคืบหน้า) แต่ยังไม่ถูกบันทึกรางวัล */
export function evaluateStarAwards(studentId: number): StarAward[] {
  const progress = getStarProgress(studentId);
  const conditions = getStarConditions();
  const earned = loadAwards().filter(a => a.student_id === studentId);
  const has = (k: StarCondition['key']) => earned.some(a => a.condition === k);

  const newAwards: StarAward[] = [];
  const give = (cond: StarCondition, value: number) => {
    if (value < cond.target || has(cond.key)) return;
    newAwards.push({
      student_id: studentId,
      condition: cond.key,
      stars: cond.reward,
      awarded_at: new Date().toISOString(),
    });
  };

  for (const cond of conditions) {
    if (cond.key === 'lessons3') give(cond, progress.lessonsCompleted);
    else if (cond.key === 'exam100') give(cond, progress.bestExamPercent);
    else if (cond.key === 'worksheets3') give(cond, progress.worksheetsSubmitted);
  }
  return newAwards;
}

/** ตรวจและบันทึกรางวัลใหม่ (เรียกหลังเรียนจบ/ส่งข้อสอบ/ส่งใบงาน) — คืนรางวัลที่เพิ่งได้
 *  นอกช่วงกำหนดเวลา (period_start–period_end) จะไม่บันทึกรางวัลใหม่ */
export function awardStars(studentId: number): StarAward[] {
  if (!getStarPeriodInfo().open) return []; // ปิดสะสม — ไม่ให้ดาวชั่วคราว
  const newAwards = evaluateStarAwards(studentId);
  if (newAwards.length === 0) return [];
  const all = [...loadAwards(), ...newAwards];
  saveAwards(all);
  return newAwards;
}

/** ล้างดาวเงื่อนไขทั้งหมดของทุกนักเรียน (ครูกดรีเซ็ตเพื่อเริ่มรอบใหม่) */
export function resetStarAwards(): void {
  saveAwards([]);
}

/** จำนวนรางวัลดาวที่แจกไปทั้งหมด (ทุกนักเรียน) */
export function countAllStarAwards(): number {
  return loadAwards().length;
}

/** ดาวที่ได้จากเงื่อนไขทั้งหมดของนักเรียน (รวมที่ได้แล้ว) */
export function getStarAwardTotal(studentId: number): number {
  return loadAwards()
    .filter(a => a.student_id === studentId)
    .reduce((sum, a) => sum + a.stars, 0);
}

/** รางวัลทั้งหมดของนักเรียน (สำหรับแสดงหน้าภารกิจ) */
export function getStudentAwards(studentId: number): StarAward[] {
  return loadAwards().filter(a => a.student_id === studentId);
}

/** ดาวรวมทั้งหมดของนักเรียน = ภารกิจ (mission completions) + เงื่อนไข 3 ข้อ
 *  ใช้ทุกจุดที่แสดง ⭐ (header/sidebar/dashboard/profile) เพื่อให้ตัวเลขตรงกันทุกที่ */
export function getTotalStarsForStudent(studentId: number, missionStars: number): number {
  return missionStars + getStarAwardTotal(studentId);
}

/** สถานะเงื่อนไขครบทั้ง 3 ข้อ (แสดงเช็คลิสต์) */
export function getStarConditionStates(studentId: number): Array<
  StarCondition & { done: boolean; progressText: string; progressValue: number }
> {
  const p = getStarProgress(studentId);
  const conditions = getStarConditions();
  const earned = getStudentAwards(studentId);
  // นอกช่วงสะสม → ไม่นับเป็นสำเร็จเพิ่ม (คนที่ได้ไปแล้วยังโชว์ ✅ เหมือนเดิม)
  const periodOpen = getStarPeriodInfo().open;
  const has = (k: StarCondition['key']) => earned.some(a => a.condition === k);
  const valueOf = (k: StarCondition['key']): number =>
    k === 'lessons3' ? p.lessonsCompleted : k === 'exam100' ? p.bestExamPercent : p.worksheetsSubmitted;
  const unitOf = (k: StarCondition['key']): string =>
    k === 'lessons3' ? 'บท' : k === 'exam100' ? '%' : 'ใบ';
  // done = ครบตามเงื่อนไข (ความคืบหน้าถึงเป้า) — ดาวจะถูกบันทึกเมื่อ awardStars ทำงาน
  return conditions.map(c => {
    const v = valueOf(c.key);
    const capped = c.key === 'exam100' ? v : Math.min(v, c.target);
    return {
      ...c,
      label: starConditionLabel(c), // ชื่อตามเป้าหมายที่ครูตั้งจริง
      done: has(c.key) || (periodOpen && v >= c.target),
      progressText: c.key === 'exam100' ? `${v}%` : `${capped}/${c.target} ${unitOf(c.key)}`,
      progressValue: v,
    };
  });
}
