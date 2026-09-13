/* ============================================================
   🎯 เงื่อนไขการได้ดาว (Star achievements)
   กติกา 3 ข้อ (คงที่):
     1. เรียนบทเรียนให้ครบ 3 บท        +3⭐
     2. ทำข้อสอบให้ผ่าน 100%          +5⭐
     3. ส่งใบงานครบ 3 ใบ              +10⭐
   ผลรวมสูงสุด 18⭐ — ได้ครั้งเดียวต่อบัญชี (one-time)

   ข้อมูลนำเข้า:
     • จำนวนบทเรียนจบ ← scitech_lesson_sessions (status 'completed')
     • ข้อสอบ 100%   ← scitech_quiz_history (บทเรียน) +
                        onet/m1_exam_history_v1 (ข้อสอบ O-NET / เข้า ม.1)
     • ใบงานที่ส่ง    ← scitech_worksheet_submissions (status 'submitted'/'graded')

   การให้ดาว: เขียนลง scitech_star_awards (ซิงก์คลาวด์เหมือนข้อมูลอื่น)
   ดาวรวมที่หน้าจอแสดง = ดาวภารกิจ (scitech_mission_completions) + ดาวเงื่อนไขนี้
   ============================================================ */

export interface StarCondition {
  key: 'lessons3' | 'exam100' | 'worksheets3';
  emoji: string;
  label: string;
  reward: number;
}

export const STAR_CONDITIONS: StarCondition[] = [
  { key: 'lessons3', emoji: '📘', label: 'เรียนบทเรียนให้ครบ 3 บท', reward: 3 },
  { key: 'exam100', emoji: '📝', label: 'ทำข้อสอบให้ผ่าน 100%', reward: 5 },
  { key: 'worksheets3', emoji: '📋', label: 'ส่งใบงานครบ 3 ใบงาน', reward: 10 },
];

export const STAR_CONDITIONS_TOTAL = STAR_CONDITIONS.reduce((s, c) => s + c.reward, 0);

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
  // 1) บทเรียนที่เรียนจบ (เซสชันสถานะ completed — ตัวเดียวกับหน้าแดชบอร์ด/บทเรียน)
  let lessonsCompleted = 0;
  try {
    const sessions: Array<{ student_id: number; status?: string }> =
      JSON.parse(localStorage.getItem('scitech_lesson_sessions') || '[]');
    lessonsCompleted = sessions.filter(
      s => s.student_id === studentId && s.status === 'completed'
    ).length;
  } catch { /* ไม่มีข้อมูล */ }

  // 2) ข้อสอบผ่าน 100% — เช็คทุกแหล่งประวัติ
  let bestExamPercent = 0;
  try {
    // 2a) ข้อสอบบทเรียน (QuizPage บันทึกลง scitech_quiz_history)
    const quizHist: Array<{ student_id: number; score?: number }> =
      JSON.parse(localStorage.getItem('scitech_quiz_history') || '[]');
    bestExamPercent = Math.max(
      bestExamPercent,
      ...quizHist.filter(h => h.student_id === studentId).map(h => Number(h.score) || 0),
      0
    );
  } catch { /* ignore */ }
  try {
    // 2b) ข้อสอบ O-NET และเข้า ม.1 (ประวัติรวม — เก็บต่อเครื่อง ไม่มี student_id)
    for (const key of ['onet_exam_history_v1', 'm1_exam_history_v1']) {
      const hist: Array<{ percentage?: number; student_id?: number }> =
        JSON.parse(localStorage.getItem(key) || '[]');
      bestExamPercent = Math.max(
        bestExamPercent,
        ...hist.filter(h => h.student_id === undefined || h.student_id === studentId)
          .map(h => Number(h.percentage) || 0),
        0
      );
    }
    // ประวัติต่อผู้ใช้ (histKey = scitech_onet_history_<id> / scitech_m1_history_<id>)
    for (const key of [`scitech_onet_history_${studentId}`, `scitech_m1_history_${studentId}`]) {
      const hist: Array<{ percentage?: number }> = JSON.parse(localStorage.getItem(key) || '[]');
      bestExamPercent = Math.max(
        bestExamPercent,
        ...hist.map(h => Number(h.percentage) || 0),
        0
      );
    }
  } catch { /* ignore */ }

  // 3) ใบงานที่ส่ง (นับใบที่ส่งแล้ว — สถานะ submitted หรือ graded)
  let worksheetsSubmitted = 0;
  try {
    const subs: Array<{ student_id: number; worksheet_id: number; status?: string }> =
      JSON.parse(localStorage.getItem('scitech_worksheet_submissions') || '[]');
    worksheetsSubmitted = new Set(
      subs.filter(s => s.student_id === studentId).map(s => s.worksheet_id)
    ).size;
  } catch { /* ไม่มีข้อมูล */ }

  return { lessonsCompleted, bestExamPercent, worksheetsSubmitted };
}

/** เงื่อนไขไหนควรได้รับแล้ว (ตามความคืบหน้า) แต่ยังไม่ถูกบันทึกรางวัล */
export function evaluateStarAwards(studentId: number): StarAward[] {
  const progress = getStarProgress(studentId);
  const earned = loadAwards().filter(a => a.student_id === studentId);
  const has = (k: StarCondition['key']) => earned.some(a => a.condition === k);

  const newAwards: StarAward[] = [];
  const give = (k: StarCondition['key'], ok: boolean) => {
    if (!ok || has(k)) return;
    const cond = STAR_CONDITIONS.find(c => c.key === k)!;
    newAwards.push({
      student_id: studentId,
      condition: k,
      stars: cond.reward,
      awarded_at: new Date().toISOString(),
    });
  };

  give('lessons3', progress.lessonsCompleted >= 3);
  give('exam100', progress.bestExamPercent >= 100);
  give('worksheets3', progress.worksheetsSubmitted >= 3);
  return newAwards;
}

/** ตรวจและบันทึกรางวัลใหม่ (เรียกหลังเรียนจบ/ส่งข้อสอบ/ส่งใบงาน) — คืนรางวัลที่เพิ่งได้ */
export function awardStars(studentId: number): StarAward[] {
  const newAwards = evaluateStarAwards(studentId);
  if (newAwards.length === 0) return [];
  const all = [...loadAwards(), ...newAwards];
  saveAwards(all);
  return newAwards;
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
  StarCondition & { done: boolean; progressText: string }
> {
  const p = getStarProgress(studentId);
  const earned = getStudentAwards(studentId);
  const has = (k: StarCondition['key']) => earned.some(a => a.condition === k);
  // done = ครบตามเงื่อนไข (ความคืบหน้าถึงเป้า) — ดาวจะถูกบันทึกเมื่อ awardStars ทำงาน
  return [
    { ...STAR_CONDITIONS[0], done: p.lessonsCompleted >= 3 || has('lessons3'), progressText: `${Math.min(p.lessonsCompleted, 3)}/3 บท` },
    { ...STAR_CONDITIONS[1], done: p.bestExamPercent >= 100 || has('exam100'), progressText: `${p.bestExamPercent}%` },
    { ...STAR_CONDITIONS[2], done: p.worksheetsSubmitted >= 3 || has('worksheets3'), progressText: `${Math.min(p.worksheetsSubmitted, 3)}/3 ใบ` },
  ];
}
