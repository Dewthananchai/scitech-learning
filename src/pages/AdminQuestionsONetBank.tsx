/* ============================================================
   📚 คลังข้อสอบ O-NET — ระบบจัดการข้อมูลข้อสอบ O-NET
   แยกตามระดับชั้น ป.6 / ม.3 / ม.6
   UI ตรงตามตัวอย่าง HTML: _.1.html
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import {
  ensureOnetBankData,
  getOnetBankCount,
  loadLevelList,
  loadOnetYearList,
  subjectInfo,
  ONET_GENERAL,
} from '../data/onetBankData';
import type { OnetBankQuestion } from '../data/onetBankData';

/* ============ Escape helpers ============ */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeJs(str: string): string {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/* ============ CSV helpers ============ */
function parseCSVText(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const out: string[][] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur);
    out.push(result.map(k => k.trim().replace(/^"|"$/g, '')));
  }
  return out;
}
function parseAnswerIndex(raw: string): number {
  if (!raw) return -1;
  const upper = raw.toString().trim().toUpperCase();
  if (upper === 'A') return 0;
  if (upper === 'B') return 1;
  if (upper === 'C') return 2;
  if (upper === 'D') return 3;
  const n = parseInt(upper, 10);
  if (!isNaN(n) && n >= 1 && n <= 4) return n - 1;
  return -1;
}

function downloadTextAsFile(text: string, filename: string) {
  const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ============ Main Component ============ */
export default function AdminQuestionsONetBank() {
  const [bank, setBank] = useState<OnetBankQuestion[]>([]);
  const [levelList, setLevelList] = useState<string[]>([]);
  const [yearList, setYearList] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'manage' | 'list'>('import');
  const [importMessage, setImportMessage] = useState('');
  const [importSuccess, setImportSuccess] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState('');
  const [newYear, setNewYear] = useState('');

  /* ---- Load from localStorage ---- */
  const reloadBank = useCallback(() => {
    setBank(ensureOnetBankData());
    setLevelList(loadLevelList());
    setYearList(loadOnetYearList());
  }, []);

  useEffect(() => { reloadBank(); }, [reloadBank]);

  /* Listen for cross-tab updates */
  useEffect(() => {
    const handler = () => {
      setLevelList(loadLevelList());
      setYearList(loadOnetYearList());
    };
    window.addEventListener('onet-bank-updated', handler);
    return () => window.removeEventListener('onet-bank-updated', handler);
  }, []);

  const saveBank = (data: OnetBankQuestion[]) => {
    localStorage.setItem('onet_bank_data_v1', JSON.stringify(data));
    setBank(data);
    window.dispatchEvent(new Event('onet-bank-updated'));
  };
  const saveLevels = (data: string[]) => {
    localStorage.setItem('onet_levels_v1', JSON.stringify(data));
    setLevelList(data);
    window.dispatchEvent(new Event('onet-bank-updated'));
  };
  const saveYears = (data: string[]) => {
    localStorage.setItem('onet_years_v1', JSON.stringify(data));
    setYearList(data);
    window.dispatchEvent(new Event('onet-bank-updated'));
  };

  /* ============ CSV Import ============ */
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSVText(e.target?.result as string);
        if (rows.length === 0) { setImportMessage('ไฟล์ว่างเปล่าหรืออ่านไม่ได้'); setImportSuccess(false); return; }
        let startIdx = 0;
        const header = rows[0]?.map(c => c.trim().toLowerCase()) || [];
        const hasSetCol = header.includes('set');
        if (header.includes('level')) startIdx = 1;
        let success = 0, fail = 0;
        const newLevels = [...levelList];
        const newYears = [...yearList];
        const newQuestions = [...bank];
        for (let i = startIdx; i < rows.length; i++) {
          const r = rows[i];
          if (r.every(c => c === '')) continue;
          if (hasSetCol) {
            if (r.length < 10) continue;
            const level = (r[0] || ONET_GENERAL).trim() || ONET_GENERAL;
            const year = (r[1] || ONET_GENERAL).trim() || ONET_GENERAL;
            const set = (r[2] || '1').trim() || '1';
            const subject = (r[3] || '').trim().toLowerCase();
            const question = r[4] || '';
            const c1 = r[5] || '', c2 = r[6] || '', c3 = r[7] || '', c4 = r[8] || '';
            const answerIdx = parseAnswerIndex(r[9]);
            const explain = r[10] || 'ไม่มีคำอธิบายเพิ่มเติม';
            if (!subjectInfo[subject] || !question || answerIdx === -1 || !c1 || !c2 || !c3 || !c4) { fail++; continue; }
            if (!newLevels.includes(level)) newLevels.push(level);
            if (!newYears.includes(year)) newYears.push(year);
            newQuestions.push({ id: 'c_' + Date.now() + '_' + i, isDefault: false, level, year, set, subject, q: question, choices: [c1, c2, c3, c4], answer: answerIdx, explain });
          } else {
            if (r.length < 9) continue;
            const level = (r[0] || ONET_GENERAL).trim() || ONET_GENERAL;
            const year = (r[1] || ONET_GENERAL).trim() || ONET_GENERAL;
            const subject = (r[2] || '').trim().toLowerCase();
            const question = r[3] || '';
            const c1 = r[4] || '', c2 = r[5] || '', c3 = r[6] || '', c4 = r[7] || '';
            const answerIdx = parseAnswerIndex(r[8]);
            const explain = r[9] || 'ไม่มีคำอธิบายเพิ่มเติม';
            if (!subjectInfo[subject] || !question || answerIdx === -1 || !c1 || !c2 || !c3 || !c4) { fail++; continue; }
            if (!newLevels.includes(level)) newLevels.push(level);
            if (!newYears.includes(year)) newYears.push(year);
            newQuestions.push({ id: 'c_' + Date.now() + '_' + i, isDefault: false, level, year, set: '1', subject, q: question, choices: [c1, c2, c3, c4], answer: answerIdx, explain });
          }
          success++;
        }
        saveBank(newQuestions);
        saveLevels(newLevels);
        saveYears(newYears);
        setImportMessage(`✅ นำเข้าสำเร็จ ${success} ข้อ` + (fail > 0 ? ` ⚠️ ผิดพลาด ${fail} แถว (ตรวจสอบ subject/answer ให้ถูกต้อง)` : ''));
        setImportSuccess(fail === 0);
      } catch (err: any) {
        setImportMessage('เกิดข้อผิดพลาดขณะอ่านไฟล์: ' + (err.message || err));
        setImportSuccess(false);
      }
    };
    reader.onerror = () => { setImportMessage('ไม่สามารถอ่านไฟล์ได้'); setImportSuccess(false); };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  const downloadSampleCSV = () => {
    const sample = [
      'level,year,set,subject,question,choice1,choice2,choice3,choice4,answer,explain',
      'ป.6,ทั่วไป,1,math,7 คูณ 8 เท่ากับเท่าใด?,54,56,64,49,B,7x8=56',
      'ม.3,ทั่วไป,1,science,หน่วยของความต่างศักย์ไฟฟ้าคือข้อใด?,แอมแปร์,โวลต์,วัตต์,โอห์ม,B,หน่วยความต่างศักย์คือโวลต์ (V)',
      'ม.6,ทั่วไป,1,thai,คำว่า ทฤษฎี มาจากภาษาใด?,บาลี,สันสกฤต,เขมร,จีน,B,ทฤษฎีมาจากภาษาสันสกฤต',
      'ม.3,ทั่วไป,2,english,Choose the correct passive voice.,The cake was eaten by him.,The cake ate him.,He was eaten the cake.,The cake eating him.,A,Passive voice: Subject + was/were + V3 + by',
      'ป.6,ทั่วไป,1,social,จังหวัดใดอยู่ภาคเหนือของไทย?,ภูเก็ต,เชียงใหม่,ขอนแก่น,สงขลา,B,เชียงใหม่ตั้งอยู่ในภาคเหนือ',
    ].join('\n');
    downloadTextAsFile(sample, 'ตัวอย่างคลังข้อสอบ O-NET.csv');
  };

  const exportCurrentCSV = () => {
    const rows = ['level,year,set,subject,question,choice1,choice2,choice3,choice4,answer,explain'];
    const esc = (s: string) => '"' + String(s).replace(/"/g, '""') + '"';
    for (const q of bank) {
      const ansLetter = ['A', 'B', 'C', 'D'][q.answer] || 'A';
      rows.push([esc(q.level), esc(q.year), esc(q.set || '1'), esc(q.subject), esc(q.q), esc(q.choices[0]), esc(q.choices[1]), esc(q.choices[2]), esc(q.choices[3]), ansLetter, esc(q.explain)].join(','));
    }
    downloadTextAsFile(rows.join('\n'), 'คลังข้อสอบ O-NET ปัจจุบัน.csv');
  };

  /* ============ Manage Levels/Years ============ */
  const addLevel = () => {
    const val = newLevel.trim();
    if (val && !levelList.includes(val)) {
      saveLevels([...levelList, val]);
      setNewLevel('');
    }
  };
  const removeLevel = (name: string) => {
    if (confirm(`ลบระดับชั้น "${name}" ออกจากรายการ? (ข้อสอบที่ผูกไว้จะยังอยู่ในระบบ)`)) {
      saveLevels(levelList.filter(s => s !== name));
    }
  };
  const addYear = () => {
    const val = newYear.trim();
    if (val && !yearList.includes(val)) {
      saveYears([...yearList, val]);
      setNewYear('');
    }
  };
  const removeYear = (y: string) => {
    if (y === ONET_GENERAL) { alert("ไม่สามารถลบ 'ทั่วไป' ได้"); return; }
    if (confirm(`ลบปีการศึกษา "${y}" ออกจากรายการ?`)) {
      saveYears(yearList.filter(x => x !== y));
    }
  };

  /* ============ Clear / Restore ============ */
  const clearFiltered = () => {
    const toKeep = bank.filter(q => {
      const matchLevel = !filterLevel || q.level === filterLevel;
      const matchYear = !filterYear || q.year === filterYear;
      const matchSubject = !filterSubject || q.subject === filterSubject;
      const matchSet = !filterSet || (q.set || '1') === filterSet;
      return !(matchLevel && matchYear && matchSubject && matchSet);
    });
    const removed = bank.length - toKeep.length;
    if (removed === 0) { alert('ไม่มีข้อสอบตรงเงื่อนไขที่เลือก'); return; }
    if (confirm(`ต้องการลบข้อสอบ ${removed} ข้อ ตามเงื่อนไขที่เลือกใช่หรือไม่?`)) {
      saveBank(toKeep);
      setImportMessage(`ลบข้อสอบ ${removed} ข้อเรียบร้อยแล้ว`);
      setImportSuccess(true);
    }
  };
  const clearAll = () => {
    if (confirm('⚠️ ต้องการล้างข้อสอบทั้งหมดในระบบหรือไม่? (รวมข้อมูลเริ่มต้น) การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      saveBank([]);
      setImportMessage('ล้างข้อสอบทั้งหมดเรียบร้อยแล้ว');
      setImportSuccess(true);
    }
  };
  const restoreDefaults = () => {
    if (confirm('ต้องการโหลดข้อมูลเริ่มต้นกลับมาหรือไม่? (จะเพิ่มเข้าไปโดยไม่ลบข้อมูลที่มีอยู่)')) {
      const seeds = (() => {
        const RAW = [
          { level: 'ป.6', year: '2567', subject: 'thai', q: "คำว่า 'มานะ' ในบริบท 'เขามีมานะพยายาม' หมายถึงข้อใด?", choices: ['ความเกียจคร้าน', 'ความอดทนพยายาม', 'ความโกรธ', 'ความสงสัย'], answer: 1, explain: 'มานะในที่นี้หมายถึงความอดทนพยายาม' },
          { level: 'ป.6', year: '2567', subject: 'math', q: '5/6 - 1/3 มีค่าเท่าใด?', choices: ['1/2', '1/3', '2/3', '4/6'], answer: 0, explain: '5/6-2/6=3/6=1/2' },
          { level: 'ป.6', year: '2567', subject: 'science', q: 'สัตว์ในข้อใดเป็นสัตว์เลี้ยงลูกด้วยนม?', choices: ['จระเข้', 'วาฬ', 'งู', 'นกอินทรี'], answer: 1, explain: 'วาฬเป็นสัตว์เลี้ยงลูกด้วยนมที่อาศัยในน้ำ' },
          { level: 'ป.6', year: '2567', subject: 'english', q: "What is the plural of 'foot'?", choices: ['Foots', 'Feet', 'Footes', 'Foot'], answer: 1, explain: 'Irregular plural: foot-feet' },
          { level: 'ป.6', year: '2567', subject: 'social', q: 'เทศกาลลอยกระทงตรงกับวันใด?', choices: ['วันเพ็ญเดือน 12', 'วันเพ็ญเดือน 6', 'วันขึ้นปีใหม่', 'วันสงกรานต์'], answer: 0, explain: 'ลอยกระทงตรงกับวันเพ็ญเดือน 12' },
          { level: 'ป.6', year: '2566', subject: 'math', q: 'ถ้าสี่เหลี่ยมผืนผ้ากว้าง 5 ซม. ยาว 8 ซม. มีพื้นที่เท่าใด?', choices: ['13 ตร.ซม.', '40 ตร.ซม.', '26 ตร.ซม.', '45 ตร.ซม.'], answer: 1, explain: 'พื้นที่ = กว้าง×ยาว = 5×8 = 40' },
          { level: 'ป.6', year: '2566', subject: 'science', q: 'แหล่งพลังงานใดเป็นพลังงานหมุนเวียน?', choices: ['ถ่านหิน', 'น้ำมัน', 'แสงอาทิตย์', 'ก๊าซธรรมชาติ'], answer: 2, explain: 'แสงอาทิตย์เป็นพลังงานหมุนเวียนที่ใช้ไม่หมด' },
          { level: 'ม.3', year: '2567', subject: 'math', q: 'ถ้า x²=49 แล้วค่าของ x คือข้อใด?', choices: ['7 เท่านั้น', '-7 เท่านั้น', '7 หรือ -7', '49'], answer: 2, explain: 'รากที่สองของ 49 มีค่า 7 และ -7' },
          { level: 'ม.3', year: '2567', subject: 'science', q: 'ปฏิกิริยาเคมีในข้อใดเป็นปฏิกิริยาดูดความร้อน?', choices: ['การเผาไหม้', 'การละลายของแอมโมเนียมไนเตรตในน้ำ', 'การจุดไม้ขีดไฟ', 'การหายใจของสิ่งมีชีวิต'], answer: 1, explain: 'การละลายของแอมโมเนียมไนเตรตดูดความร้อนจากสิ่งแวดล้อม' },
          { level: 'ม.3', year: '2567', subject: 'thai', q: "คำในข้อใดเป็นคำพ้องความหมายกับ 'สรรเสริญ'?", choices: ['ตำหนิ', 'ยกย่อง', 'ดูหมิ่น', 'ประณาม'], answer: 1, explain: 'สรรเสริญ หมายถึง ยกย่องชมเชย' },
          { level: 'ม.3', year: '2567', subject: 'english', q: 'She ___ finished her homework before dinner.', choices: ['has', 'have', 'had', 'having'], answer: 2, explain: 'Past Perfect ใช้ had + V3 กับเหตุการณ์ที่เกิดก่อน' },
          { level: 'ม.3', year: '2567', subject: 'social', q: 'หลักการแบ่งแยกอำนาจในระบอบประชาธิปไตยประกอบด้วยอำนาจใดบ้าง?', choices: ['นิติบัญญัติ บริหาร ตุลาการ', 'ทหาร ตำรวจ พลเรือน', 'ท้องถิ่น ภูมิภาค ส่วนกลาง', 'เศรษฐกิจ สังคม การเมือง'], answer: 0, explain: 'อำนาจอธิปไตยแบ่งเป็น 3 ฝ่าย คือนิติบัญญัติ บริหาร ตุลาการ' },
          { level: 'ม.3', year: '2566', subject: 'math', q: 'ความชันของเส้นตรงที่ผ่านจุด (1,2) และ (3,8) คือเท่าใด?', choices: ['2', '3', '4', '6'], answer: 2, explain: 'ความชัน = (8-2)/(3-1) = 6/2 = 3' },
          { level: 'ม.6', year: '2567', subject: 'math', q: 'อนุพันธ์ของ f(x)=3x²+2x คือข้อใด?', choices: ['6x+2', '3x+2', '6x²+2', 'x²+2x'], answer: 0, explain: "f'(x)=6x+2 ตามกฎอนุพันธ์พหุนาม" },
          { level: 'ม.6', year: '2567', subject: 'science', q: 'กฎข้อที่สองของนิวตันคือข้อใด?', choices: ['F=ma', 'E=mc²', 'P=mv', 'W=Fd'], answer: 0, explain: 'F=ma คือกฎข้อที่สองของนิวตัน' },
          { level: 'ม.6', year: '2567', subject: 'thai', q: 'ฉันทลักษณ์ในข้อใดใช้แต่งโคลงสี่สุภาพ?', choices: ['สัมผัสสระ วรรณยุกต์เอกโท', 'สัมผัสพยัญชนะเท่านั้น', 'ไม่มีกฎสัมผัส', 'ใช้คำครุลหุเท่านั้น'], answer: 0, explain: 'โคลงสี่สุภาพมีข้อบังคับเรื่องสัมผัสและวรรณยุกต์เอกโท' },
          { level: 'ม.6', year: '2567', subject: 'english', q: 'If I ___ more time, I would travel around the world.', choices: ['have', 'had', 'has', 'having'], answer: 1, explain: 'Second Conditional ใช้ If + past simple, would + V1' },
          { level: 'ม.6', year: '2567', subject: 'social', q: 'GDP ย่อมาจากอะไร?', choices: ['Gross Domestic Product', 'General Development Plan', 'Global Data Processing', 'Government Debt Percentage'], answer: 0, explain: 'GDP คือผลิตภัณฑ์มวลรวมภายในประเทศ' },
          { level: 'ม.6', year: '2566', subject: 'math', q: 'ถ้า log₂8 = x แล้ว x เท่ากับเท่าใด?', choices: ['2', '3', '4', '8'], answer: 1, explain: '2³=8 ดังนั้น log₂8=3' },
        ];
        return RAW.map((d, i) => ({ ...d, id: 'seed_onet_' + i, isDefault: true } as OnetBankQuestion));
      })();
      const existingIds = new Set(bank.map(q => q.id));
      const toAdd = seeds.filter(s => !existingIds.has(s.id));
      if (toAdd.length > 0) saveBank([...bank, ...toAdd]);
      setImportMessage('โหลดข้อมูลเริ่มต้นเรียบร้อยแล้ว');
      setImportSuccess(true);
    }
  };

  const deleteQuestion = (id: string) => {
    if (confirm('ลบข้อสอบข้อนี้หรือไม่?')) {
      saveBank(bank.filter(q => q.id !== id));
    }
  };

  /* ============ Edit Modal State ============ */
  const [editData, setEditData] = useState<{
    level: string; year: string; set: string; subject: string; q: string;
    choices: string[]; answer: number; explain: string;
  } | null>(null);
  const [editImages, setEditImages] = useState<{q_image?: string; choice_images?: string[]; explain_image?: string}>({});

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'q_image' | `choice_${number}` | 'explain_image', choiceIdx?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('รูปภาพต้องมีขนาดไม่เกิน 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setEditImages(prev => {
        const next = { ...prev };
        if (target === 'q_image') next.q_image = base64;
        else if (target === 'explain_image') next.explain_image = base64;
        else if (target.startsWith('choice_') && choiceIdx !== undefined) {
          const ci = [...(prev.choice_images || ['', '', '', ''])];
          ci[choiceIdx] = base64;
          next.choice_images = ci;
        }
        return next;
      });
    };
    reader.readAsDataURL(file);
  };
  const removeImage = (target: 'q_image' | `choice_${number}` | 'explain_image', choiceIdx?: number) => {
    setEditImages(prev => {
      const next = { ...prev };
      if (target === 'q_image') next.q_image = undefined;
      else if (target === 'explain_image') next.explain_image = undefined;
      else if (target.startsWith('choice_') && choiceIdx !== undefined) {
        const ci = [...(prev.choice_images || ['', '', '', ''])];
        ci[choiceIdx] = '';
        next.choice_images = ci;
      }
      return next;
    });
  };

  const startEdit = (id: string) => {
    const q = bank.find(x => x.id === id);
    if (!q) return;
    setEditingId(id);
    setEditData({ level: q.level, year: q.year, set: q.set || '1', subject: q.subject, q: q.q, choices: [...q.choices], answer: q.answer, explain: q.explain });
    setEditImages({ q_image: q.q_image, choice_images: q.choice_images, explain_image: q.explain_image });
  };
  const cancelEdit = () => { setEditingId(null); setEditData(null); };

  const saveEdit = () => {
    if (!editingId || !editData) return;
    if (!editData.subject || !subjectInfo[editData.subject]) { alert('กรุณาเลือกวิชา'); return; }
    if (!editData.q.trim()) { alert('กรุณากรอกคำถาม'); return; }
    if (editData.choices.some(c => !c.trim())) { alert('กรุณากรอกตัวเลือกให้ครบทั้ง 4 ข้อ'); return; }
    const newLevels = [...levelList];
    const newYears = [...yearList];
    if (!newLevels.includes(editData.level)) newLevels.push(editData.level);
    if (!newYears.includes(editData.year)) newYears.push(editData.year);
    if (newLevels !== levelList) saveLevels(newLevels);
    if (newYears !== yearList) saveYears(newYears);
    const cleanChoiceImages = editImages.choice_images?.filter((c): c is string => !!c);
    saveBank(bank.map(q => q.id === editingId ? { ...q, ...editData, q_image: editImages.q_image, choice_images: cleanChoiceImages && cleanChoiceImages.length > 0 ? cleanChoiceImages : undefined, explain_image: editImages.explain_image, isDefault: false } : q));
    setEditingId(null);
    setEditData(null);
    setEditImages({});
    setImportMessage('✅ แก้ไขข้อสอบเรียบร้อยแล้ว');
    setImportSuccess(true);
  };

  /* ============ Tab Switch ============ */
  const setTab = (t: 'import' | 'manage' | 'list') => { setActiveTab(t); setImportMessage(''); };

  /* ============ Build Options ============ */
  const buildOptions = (list: string[], selected: string, placeholder: string) => {
    const parts = [`<option value="">${placeholder}</option>`];
    for (const v of list) {
      parts.push(`<option value="${escapeHtml(v)}"${v === selected ? ' selected' : ''}>${escapeHtml(v)}</option>`);
    }
    return parts.join('');
  };
  const buildSubjectOptions = (selected: string) => {
    const parts = ['<option value="">-- ทุกวิชา --</option>'];
    for (const key of Object.keys(subjectInfo)) {
      parts.push(`<option value="${key}"${key === selected ? ' selected' : ''}>${subjectInfo[key].icon} ${subjectInfo[key].name}</option>`);
    }
    return parts.join('');
  };
  const buildSubjectOptionsRequired = (selected: string) => {
    const parts: string[] = [];
    for (const key of Object.keys(subjectInfo)) {
      parts.push(`<option value="${key}"${key === selected ? ' selected' : ''}>${subjectInfo[key].icon} ${subjectInfo[key].name}</option>`);
    }
    return parts.join('');
  };
  const buildLevelOptionsRequired = (selected: string) => {
    const parts: string[] = [];
    for (const v of levelList) {
      parts.push(`<option value="${escapeHtml(v)}"${v === selected ? ' selected' : ''}>${escapeHtml(v)}</option>`);
    }
    return parts.join('');
  };

  /* ============ Stats ============ */
  const statsRows: { lv: string; yr: string; sub: string; count: number }[] = [];
  for (const lv of levelList) {
    for (const yr of yearList) {
      for (const sub of Object.keys(subjectInfo)) {
        const count = bank.filter(q => q.level === lv && q.year === yr && q.subject === sub).length;
        if (count > 0) statsRows.push({ lv, yr, sub, count });
      }
    }
  }

  /* ============ Render ============ */
  const renderImportTab = () => (
    <div className="space-y-6">
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 md:p-5 text-xs md:text-sm text-slate-700 leading-relaxed shadow-xs">
        <b className="text-amber-900 text-sm md:text-base flex items-center gap-2 mb-1.5">📋 รูปแบบไฟล์ CSV</b>
        <p className="mb-2">คอลัมน์ที่ต้องการ: <code className="bg-white text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 font-mono text-xs font-bold">level, year, set, subject, question, choice1, choice2, choice3, choice4, answer, explain</code></p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          <li><b className="text-slate-800">level:</b> ระดับชั้น เช่น ป.6, ม.3, ม.6</li>
          <li><b className="text-slate-800">year:</b> ปีการศึกษา หรือ "ทั่วไป"</li>
          <li><b className="text-slate-800">set:</b> ชุดข้อสอบ เช่น 1, 2, 3 (ถ้าไม่ใส่จะเป็นชุดที่ 1)</li>
          <li><b className="text-slate-800">subject:</b> ใส่ science, math, thai, english, social</li>
          <li><b className="text-slate-800">answer:</b> คำตอบที่ถูกเป็น A/B/C/D (หรือ 1-4)</li>
          <li>ระดับชั้น/ปีใหม่ที่ยังไม่มีในระบบ จะถูกเพิ่มเข้ารายการอัตโนมัติ</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <label className="cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-amber-600/20 text-xs md:text-sm inline-flex items-center gap-2 transition-all active:scale-95">
          📤 อัปโหลดไฟล์ CSV
          <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
        </label>
        <button
          onClick={downloadSampleCSV}
          className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 px-4 py-2.5 rounded-xl text-xs md:text-sm inline-flex items-center gap-2 shadow-xs transition-all active:scale-95"
        >📄 ดาวน์โหลดตัวอย่าง</button>
        <button
          onClick={exportCurrentCSV}
          className="bg-white hover:bg-slate-50 text-amber-700 font-bold border border-amber-200 px-4 py-2.5 rounded-xl text-xs md:text-sm inline-flex items-center gap-2 shadow-xs transition-all active:scale-95"
        >💾 ส่งออกข้อมูลปัจจุบัน</button>
      </div>

      {importMessage && (
        <div className={`p-4 rounded-2xl text-xs md:text-sm font-semibold border shadow-xs flex items-center justify-between ${importSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          <span>{importMessage}</span>
          <button onClick={() => setImportMessage('')} className="text-slate-400 hover:text-slate-600 font-bold ml-2">✕</button>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>🗑️</span> ล้างข้อสอบแบบเลือกเงื่อนไข
        </h3>
        <div className="flex flex-wrap gap-2.5 items-center mb-4">
          <select onChange={e => setFilterLevel(e.target.value)} value={filterLevel} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกระดับชั้น --</option>
            {levelList.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select onChange={e => setFilterYear(e.target.value)} value={filterYear} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกปี --</option>
            {yearList.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select onChange={e => setFilterSubject(e.target.value)} value={filterSubject} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกวิชา --</option>
            {Object.entries(subjectInfo).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
          </select>
          <select onChange={e => setFilterSet(e.target.value)} value={filterSet} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกชุด --</option>
            {[...new Set(bank.map(q => q.set || '1'))].sort((a, b) => Number(a) - Number(b)).map(s => (
              <option key={s} value={s}>ชุดที่ {s}</option>
            ))}
          </select>
          <button onClick={clearFiltered} className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95">
            ล้างตามเงื่อนไข
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button onClick={clearAll} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all active:scale-95">
            🗑️ ล้างข้อสอบทั้งหมด
          </button>
          <button onClick={restoreDefaults} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95">
            ♻️ โหลดข้อมูลเริ่มต้นกลับมา
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>📊</span> สรุปจำนวนข้อสอบ O-NET
        </h3>
        {statsRows.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs md:text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-3xl mb-1">📭</p>
            ยังไม่มีข้อมูลข้อสอบในระบบ
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-2.5 text-left">ระดับชั้น</th>
                  <th className="px-4 py-2.5 text-left">ปีการศึกษา</th>
                  <th className="px-4 py-2.5 text-left">วิชา</th>
                  <th className="px-4 py-2.5 text-right">จำนวนข้อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {statsRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">{row.lv}</span></td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-xs">{row.yr}</span></td>
                    <td className="px-4 py-2.5">{subjectInfo[row.sub]?.icon} {subjectInfo[row.sub]?.name}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right text-xs text-slate-500 font-semibold">
              รวมทั้งหมด <strong className="text-amber-600 text-sm font-black">{bank.length}</strong> ข้อ
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderManageTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>🎓</span> จัดการระดับชั้น O-NET
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={newLevel}
            onChange={e => setNewLevel(e.target.value)}
            placeholder="ระดับชั้นใหม่ เช่น ปวช.1"
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button onClick={addLevel} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all active:scale-95">
            ➕ เพิ่มระดับชั้น
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {levelList.map(name => (
            <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-bold shadow-xs">
              {escapeHtml(name)}
              <button onClick={() => removeLevel(name)} className="text-rose-500 hover:text-rose-700 font-black ml-1">✕</button>
            </span>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>📅</span> จัดการปีการศึกษา
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={newYear}
            onChange={e => setNewYear(e.target.value)}
            placeholder="ปีการศึกษาใหม่ เช่น 2569"
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button onClick={addYear} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all active:scale-95">
            ➕ เพิ่มปี
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {yearList.map(name => (
            <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-bold shadow-xs">
              {escapeHtml(name)}
              {name !== ONET_GENERAL && (
                <button onClick={() => removeYear(name)} className="text-rose-500 hover:text-rose-700 font-black ml-1">✕</button>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderListTab = () => {
    const filtered = bank.filter(q =>
      (!filterLevel || q.level === filterLevel) &&
      (!filterYear || q.year === filterYear) &&
      (!filterSubject || q.subject === filterSubject) &&
      (!filterSet || (q.set || '1') === filterSet) &&
      (!filterSearch || q.q.toLowerCase().includes(filterSearch.toLowerCase()) || q.explain?.toLowerCase().includes(filterSearch.toLowerCase()))
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2.5 items-center">
          <select onChange={e => setFilterLevel(e.target.value)} value={filterLevel} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกระดับชั้น --</option>
            {levelList.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select onChange={e => setFilterYear(e.target.value)} value={filterYear} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกปี --</option>
            {yearList.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select onChange={e => setFilterSubject(e.target.value)} value={filterSubject} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกวิชา --</option>
            {Object.entries(subjectInfo).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
          </select>
          <select onChange={e => setFilterSet(e.target.value)} value={filterSet} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกชุด --</option>
            {[...new Set(bank.map(q => q.set || '1'))].sort((a, b) => Number(a) - Number(b)).map(s => (
              <option key={s} value={s}>ชุดที่ {s}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="ค้นหาคำถาม..." className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30" />
            {filterSearch && <button onClick={() => setFilterSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>}
          </div>
        </div>
        <div className="text-xs text-slate-500 font-semibold">พบ {filtered.length} ข้อ</div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-4xl mb-2">🔍</p>
            <p className="font-semibold text-slate-600">ไม่พบข้อสอบตามเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(q => (
              <div key={q.id} className="bg-white border border-slate-200/80 hover:border-amber-200 rounded-2xl p-4 md:p-5 shadow-xs transition-all space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">🎓 {q.level}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800">📅 {q.year}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700">📋 ชุดที่ {q.set || '1'}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">{subjectInfo[q.subject]?.icon} {subjectInfo[q.subject]?.name}</span>
                </div>
                <div className="font-bold text-slate-800 text-sm md:text-base">{q.q}</div>
                <div className="bg-slate-50 rounded-xl p-3 text-xs md:text-sm text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {q.choices.map((c, ci) => (
                    <div key={ci} className={ci === q.answer ? 'font-bold text-emerald-700' : ''}>
                      {String.fromCharCode(65 + ci)}. {c} {ci === q.answer ? '✓' : ''}
                    </div>
                  ))}
                </div>
                {q.q_image && <img src={q.q_image} alt="รูปคำถาม" className="max-h-40 rounded-xl border border-slate-200" />}
                {q.explain && (
                  <div className="text-xs text-slate-500 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60">
                    💡 <strong>เฉลย:</strong> {q.explain}
                    {q.explain_image && <img src={q.explain_image} alt="รูปเฉลย" className="mt-2 max-h-32 rounded-lg border border-amber-200" />}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                  <button onClick={() => startEdit(q.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all">✏️ แก้ไข</button>
                  <button onClick={() => deleteQuestion(q.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all">🗑️ ลบข้อนี้</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingId || !editData) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) cancelEdit(); }}>
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-5 text-white">
            <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
              <span>✏️ แก้ไขข้อสอบ O-NET</span>
            </h3>
          </div>
          <div className="p-6 space-y-4 text-xs md:text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">🎓 ระดับชั้น</label>
                <select value={editData.level} onChange={e => setEditData({ ...editData, level: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30">
                  <option value="">-- เลือกระดับชั้น --</option>
                  {levelList.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">📅 ปีการศึกษา</label>
                <select value={editData.year} onChange={e => setEditData({ ...editData, year: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30">
                  <option value="">-- เลือกปี --</option>
                  {yearList.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">📋 ชุดที่</label>
                <input type="text" value={editData.set} onChange={e => setEditData({ ...editData, set: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30" placeholder="เช่น 1, 2, 3" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">📚 วิชา</label>
                <select value={editData.subject} onChange={e => setEditData({ ...editData, subject: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30">
                  {Object.entries(subjectInfo).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">❓ คำถาม</label>
              <textarea rows={2} value={editData.q} onChange={e => setEditData({ ...editData, q: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30" />
              <div className="flex items-center gap-2 mt-1.5">
                <label className="cursor-pointer text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 inline-flex items-center gap-1">📷 แนบรูปภาพ<input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'q_image')} /></label>
                {editImages.q_image && <><img src={editImages.q_image} alt="" className="h-10 rounded-lg border" /><button type="button" onClick={() => removeImage('q_image')} className="text-rose-500 text-xs font-bold">✕</button></>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">✅ ตัวเลือก (คลิกวงกลมหน้าข้อที่เป็นคำตอบถูก)</label>
              <div className="space-y-2">
                {editData.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input type="radio" name="editAnswer" checked={editData.answer === ci} onChange={() => setEditData({ ...editData, answer: ci })} className="w-4 h-4 accent-amber-600" />
                    <span className="w-5 font-bold text-amber-800 text-xs">{String.fromCharCode(65 + ci)}.</span>
                    <input type="text" value={c} onChange={e => { const newChoices = [...editData.choices]; newChoices[ci] = e.target.value; setEditData({ ...editData, choices: newChoices }); }} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/30" />
                    <label className="cursor-pointer text-xs text-slate-400 hover:text-amber-600" title="แนบรูปภาพ">📷<input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, `choice_${ci}` as any, ci)} /></label>
                    {editImages.choice_images?.[ci] && <><img src={editImages.choice_images[ci]} alt="" className="h-8 w-8 rounded-lg border object-cover" /><button type="button" onClick={() => removeImage(`choice_${ci}` as any, ci)} className="text-rose-500 text-xs">✕</button></>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">💡 คำอธิบายเฉลย</label>
              <textarea rows={2} value={editData.explain} onChange={e => setEditData({ ...editData, explain: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30" />
              <div className="flex items-center gap-2 mt-1.5">
                <label className="cursor-pointer text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 inline-flex items-center gap-1">📷 แนบรูปภาพ<input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'explain_image')} /></label>
                {editImages.explain_image && <><img src={editImages.explain_image} alt="" className="h-10 rounded-lg border" /><button type="button" onClick={() => removeImage('explain_image')} className="text-rose-500 text-xs font-bold">✕</button></>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={saveEdit} className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/20 hover:from-amber-700 hover:to-orange-700">💾 บันทึกการแก้ไข</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {([
          { key: 'import' as const, label: '📤 นำเข้าข้อมูล' },
          { key: 'manage' as const, label: '🎓 ระดับชั้น & ปี' },
          { key: 'list' as const, label: '📋 รายการข้อสอบ' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'import' && renderImportTab()}
      {activeTab === 'manage' && renderManageTab()}
      {activeTab === 'list' && renderListTab()}

      {/* Edit Modal */}
      {renderEditModal()}
    </div>
  );
}
