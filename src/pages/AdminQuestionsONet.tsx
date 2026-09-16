import React, { useState, useCallback, useEffect } from 'react';
import MathText from '../components/MathText';
import {
  OnetBankQuestion,
  ensureOnetBankData,
  loadLevelList,
  loadOnetYearList,
  subjectInfo,
  ONET_QUESTION_KEY,
  ONET_LEVELS_KEY,
  ONET_YEARS_KEY,
  ONET_GENERAL,
} from '../data/onetBankData';

/* ---------- helpers ---------- */
const escapeHtml = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseCSV = (text: string): string[][] => {
  const lines: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(current.trim()); current = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        if (row.some(c => c !== '')) lines.push(row);
        row = []; current = '';
        if (ch === '\r') i++;
      } else current += ch;
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== '')) lines.push(row);
  return lines;
};

const parseAnswerIndex = (raw: string): number => {
  if (!raw) return -1;
  const v = raw.trim().toUpperCase();
  if (v === 'A') return 0;
  if (v === 'B') return 1;
  if (v === 'C') return 2;
  if (v === 'D') return 3;
  const n = parseInt(v, 10);
  if (!isNaN(n) && n >= 1 && n <= 4) return n - 1;
  return -1;
};

/* ขึ้นบรรทัดใหม่: ใน CSV พิมพ์ \\n เพื่อขึ้นบรรทัดใหม่ เช่น "ข้อความ\\nบรรทัดสอง"
   (ไม่แตะต้อง \\neq \\nu ฯลฯ — คำสั่ง LaTeX ที่ขึ้นต้นด้วย \\n ตามด้วยตัวอักษร) */
// \n เก็บใน CSV = ขึ้นบรรทัดใหม่จริง — ยกเว้นคำสั่ง LaTeX ที่ขึ้นต้นด้วย \n เท่านั้น (เช่น \neq, \nabla)
const unescNewlines = (s: string) => String(s).replace(/\\n(?!(?:eq|e|abla|ot|otin|mid|subseteq|supseteq|exists|ewline|onumber|oindent|ewpage|ormalsize|atural|angle|ear|ext)(?![a-zA-Z]))/g, '\n');
const escNewlines = (s: string) => String(s).replace(/\n/g, '\\n');

/* ---------- component ---------- */
export const AdminQuestionsONetBank: React.FC = () => {
  const [bank, setBank] = useState<OnetBankQuestion[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);

  /* ----- persistence ----- */
  const persistBank = useCallback((next: OnetBankQuestion[]) => {
    setBank(next);
    localStorage.setItem(ONET_QUESTION_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('onet-bank-updated'));
  }, []);

  const persistLevels = useCallback((next: string[]) => {
    localStorage.setItem(ONET_LEVELS_KEY, JSON.stringify(next));
    setLevels(next);
  }, []);

  const persistYears = useCallback((next: string[]) => {
    localStorage.setItem(ONET_YEARS_KEY, JSON.stringify(next));
    setYears(next);
  }, []);

  useEffect(() => {
    setBank(ensureOnetBankData());
    setLevels(loadLevelList());
    setYears(loadOnetYearList());
  }, []);

  /* ----- tabs / modal ----- */
  type Tab = 'import' | 'manage' | 'list';
  const [tab, setTab] = useState<Tab>('import');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'add'>('edit');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<boolean | null>(null);

  /* ----- state สำหรับฟอร์ม (เพิ่ม/แก้ไข) ----- */
  const [form, setForm] = useState<{
    level: string;
    year: string;
    set: string;
    subject: string;
    q: string;
    choices: string[];
    answer: number;
    explain: string;
    q_image?: string;
    choice_images: string[];
    explain_image?: string;
    choiceCount: 2 | 4;
  }>({
    level: '',
    year: ONET_GENERAL,
    set: '1',
    subject: 'science',
    q: '',
    choices: ['', '', '', ''],
    answer: 0,
    explain: '',
    choice_images: ['', '', '', ''],
    choiceCount: 4,
  });

  /* ----- filters ----- */
  const [fLevel, setFLevel] = useState('');
  const [fYear, setFYear] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fSet, setFSet] = useState('');
  const [fSearch, setFSearch] = useState('');

  /* ===== CSV ===== */
  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(reader.result as string);
        if (rows.length === 0) { setImportMsg('ไฟล์ว่างเปล่า'); setImportOk(false); return; }
        const header = rows[0]?.map(c => c.trim().toLowerCase()) || [];
        const hasHeader = header.includes('level') && header.includes('question');
        const start = hasHeader ? 1 : 0;
        /* ตำแหน่งคอลัมน์อ่านจากหัวไฟล์เป็นหลัก (รองรับทุกรูปแบบ: มี/ไม่มี set, มี/ไม่มี type)
           รูปแบบมาตรฐาน: level, year, set, subject, type, question, choice1..4, answer, explain */
        const hasSetCol = hasHeader && header.includes('set');
        const col = (name: string, fallback: number) => {
          const idx = hasHeader ? header.indexOf(name) : -1;
          return idx >= 0 ? idx : fallback;
        };
        const iLevel = col('level', 0);
        const iYear = col('year', 1);
        const iSet = hasSetCol ? header.indexOf('set') : -1;
        const iSubject = col('subject', hasSetCol ? 3 : 2);
        const iType = hasHeader ? header.indexOf('type') : -1;
        const iQ = col('question', hasSetCol ? 4 : 3);
        const iC1 = col('choice1', iQ + 1);
        const iC2 = col('choice2', iQ + 2);
        const iC3 = col('choice3', iQ + 3);
        const iC4 = col('choice4', iQ + 4);
        const iAns = col('answer', iQ + 5);
        const iExp = col('explain', iQ + 6);
        const YN_TYPES = ['yn', 'yesno', 'y/n', 'ใช่/ไม่ใช่', 'ใช่-ไม่ใช่'];
        let ok = 0, fail = 0;
        const nextLevels = [...levels];
        const nextYears = [...years];
        const nextBank = [...bank];
        for (let i = start; i < rows.length; i++) {
          const r = rows[i];
          const get = (idx: number) => (idx >= 0 && idx < r.length ? r[idx] : '');
          const needed = Math.max(iC4, iAns, iExp) + 1;
          const isBlank = r.slice(0, Math.min(needed, r.length)).every((c) => !c?.trim());
          if (isBlank) continue;
          const level = (get(iLevel) || ONET_GENERAL).trim() || ONET_GENERAL;
          const year = (get(iYear) || ONET_GENERAL).trim() || ONET_GENERAL;
          const set = iSet >= 0 ? ((get(iSet) || '1').trim() || '1') : '1';
          const subject = (get(iSubject) || '').trim().toLowerCase();
          const question = unescNewlines(get(iQ) || '').trim();
          const c1 = unescNewlines(get(iC1) || '').trim();
          const c2 = unescNewlines(get(iC2) || '').trim();
          const c3 = unescNewlines(get(iC3) || '').trim();
          const c4 = unescNewlines(get(iC4) || '').trim();
          const answerIdx = parseAnswerIndex(get(iAns));
          const explain = unescNewlines(get(iExp) || '').trim() || 'ไม่มีคำอธิบายเพิ่มเติม';
          /* ชนิดข้อสอบ: type = yn → ใช่/ไม่ใช่ (2 ตัวเลือก) หรือเติม choice3/4 ว่างอัตโนมัติ */
          const rawType = (iType >= 0 ? get(iType) : '').trim().toLowerCase();
          const isYN = YN_TYPES.includes(rawType);
          const choices = isYN
            ? [c1 || 'ใช่', c2 || 'ไม่ใช่']
            : (!c3 && !c4 && c1 && c2 ? [c1, c2] : [c1, c2, c3, c4]);
          if (!subjectInfo[subject] || !question || answerIdx === -1 || answerIdx >= choices.length || choices.some((c) => !c)) { fail++; continue; }
          if (nextLevels.indexOf(level) === -1) nextLevels.push(level);
          if (nextYears.indexOf(year) === -1) nextYears.push(year);
          nextBank.push({ id: 'c_onet_' + Date.now() + '_' + i, isDefault: false, level, year, set, subject, q: question, choices, answer: answerIdx, explain });
          ok++;
        }
        persistBank(nextBank);
        persistLevels(nextLevels);
        persistYears(nextYears);
        setImportMsg('✅ นำเข้าสำเร็จ ' + ok + ' ข้อ' + (fail > 0 ? ' ⚠️ ผิดพลาด ' + fail + ' แถว' : ''));
        setImportOk(fail === 0);
      } catch (err: any) {
        setImportMsg('เกิดข้อผิดพลาดขณะอ่านไฟล์: ' + err?.message);
        setImportOk(false);
      }
    };
    reader.onerror = () => {
      setImportMsg('ไม่สามารถอ่านไฟล์ได้');
      setImportOk(false);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }, [levels, years, bank, persistBank, persistLevels, persistYears]);

  const downloadTextAsFile = (text: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const downloadSampleCSV = useCallback(() => {
    const sample = [
      ['level', 'year', 'set', 'subject', 'type', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'explain'],
      [ONET_GENERAL, ONET_GENERAL, '1', 'science', 'mc', 'ใส่คำถามข้อที่ 1 ที่นี่', 'ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3', 'ตัวเลือก 4', 'B', 'คำอธิบายเฉลย'],
      [ONET_GENERAL, ONET_GENERAL, '1', 'science', 'yn', 'โลกหมุนรอบดวงอาทิตย์', 'ใช่', 'ไม่ใช่', '', '', 'A', 'โลกหมุนรอบดวงอาทิตย์ 1 รอบใช้เวลา 1 ปี'],
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    downloadTextAsFile(sample, 'ตัวอย่างคลังข้อสอบONET.csv');
  }, []);

  const exportCurrentCSV = useCallback(() => {
    const rows = [['level', 'year', 'set', 'subject', 'type', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'explain']];
    bank.forEach((q) => {
      const isYN = q.choices.length === 2;
      rows.push([
        q.level, q.year, q.set || '1', q.subject, isYN ? 'yn' : 'mc', escNewlines(q.q),
        escNewlines(q.choices[0] ?? ''), escNewlines(q.choices[1] ?? ''), escNewlines(q.choices[2] ?? ''), escNewlines(q.choices[3] ?? ''),
        ['A', 'B', 'C', 'D'][q.answer], escNewlines(q.explain),
      ]);
    });
    downloadTextAsFile(rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n'), 'คลังข้อสอบO-NETปัจจุบัน.csv');
  }, [bank]);

  /* ===== ระดับชั้น / ปี ===== */
  const [newLevel, setNewLevel] = useState('');
  const addLevel = useCallback(() => {
    const v = newLevel.trim();
    if (v && !levels.includes(v)) {
      persistLevels([...levels, v]);
      setNewLevel('');
    }
  }, [newLevel, levels, persistLevels]);

  const removeLevel = useCallback((name: string) => {
    if (confirm(`ลบ "${name}" ใช่หรือไม่? (ข้อสอบที่ผูกไว้ยังอยู่)`)) {
      const next = levels.filter((s) => s !== name);
      persistLevels(next);
    }
  }, [levels, persistLevels]);

  const [newYear, setNewYear] = useState('');
  const addYear = useCallback(() => {
    const v = newYear.trim();
    if (v && !years.includes(v)) {
      persistYears([...years, v]);
      setNewYear('');
    }
  }, [newYear, years, persistYears]);

  const removeYear = useCallback((y: string) => {
    if (confirm(`ลบ "${y}" ใช่หรือไม่?`)) {
      const next = years.filter((x) => x !== y);
      persistYears(next);
    }
  }, [years, persistYears]);

  /* ===== ล้างข้อมูล ===== */
  const clearFiltered = useCallback(() => {
    const kept = bank.filter((q) => {
      const mLevel = !fLevel || q.level === fLevel;
      const mYear = !fYear || q.year === fYear;
      const mSubject = !fSubject || q.subject === fSubject;
      const mSet = !fSet || (q.set || '1') === fSet;
      return !(mLevel && mYear && mSubject && mSet);
    });
    const removed = bank.length - kept.length;
    if (removed === 0) { setImportMsg('ไม่มีข้อสอบตรงเงื่อนไข'); setImportOk(true); return; }
    if (confirm(`ต้องการลบ ${removed} ข้อ ใช่หรือไม่?`)) {
      persistBank(kept);
      setImportMsg('ลบข้อสอบ O-NET ' + removed + ' ข้อเรียบร้อยแล้ว');
      setImportOk(true);
    }
  }, [bank, fLevel, fYear, fSubject, fSet, persistBank]);

  const clearAll = useCallback(() => {
    if (confirm('⚠️ ต้องการล้างข้อสอบทั้งหมดในระบบ ใช่หรือไม่? (ไม่สามารถย้อนกลับ)')) {
      persistBank([]);
      setImportMsg('ล้างข้อสอบทั้งหมดเรียบร้อยแล้ว');
      setImportOk(true);
    }
  }, [persistBank]);


  const deleteOne = useCallback((id: string) => {
    if (confirm('ลบข้อสอบข้อนี้ ใช่หรือไม่?')) {
      persistBank(bank.filter((b) => b.id !== id));
    }
  }, [bank, persistBank]);

  /* ===== image helpers ===== */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, target: 'q_image' | `choice_${number}` | 'explain_image', choiceIdx?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('รูปภาพต้องมีขนาดไม่เกิน 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm(prev => {
        if (target === 'q_image') return { ...prev, q_image: base64 };
        if (target === 'explain_image') return { ...prev, explain_image: base64 };
        if (target.startsWith('choice_') && choiceIdx !== undefined) {
          const ci = [...prev.choice_images];
          ci[choiceIdx] = base64;
          return { ...prev, choice_images: ci };
        }
        return prev;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const removeImage = useCallback((target: 'q_image' | `choice_${number}` | 'explain_image', choiceIdx?: number) => {
    setForm(prev => {
      if (target === 'q_image') return { ...prev, q_image: undefined };
      if (target === 'explain_image') return { ...prev, explain_image: undefined };
      if (target.startsWith('choice_') && choiceIdx !== undefined) {
        const ci = [...prev.choice_images];
        ci[choiceIdx] = '';
        return { ...prev, choice_images: ci };
      }
      return prev;
    });
  }, []);

  /* ===== แก้ไข/เพิ่มข้อสอบ (modal) ===== */
  const startAdd = useCallback(() => {
    setForm({
      level: levels[0] || '',
      year: years[0] || ONET_GENERAL,
      set: '1',
      subject: 'science',
      q: '',
      choices: ['', '', '', ''],
      answer: 0,
      explain: '',
      choice_images: ['', '', '', ''],
      choiceCount: 4,
    });
    setModalMode('add');
    setEditingId('new');
  }, [levels, years]);

  const startEdit = useCallback((id: string) => {
    const q = bank.find(b => b.id === id);
    if (!q) return;
    setModalMode('edit');
    setEditingId(id);
    setForm({
      level: q.level || levels[0] || '',
      year: q.year || ONET_GENERAL,
      set: q.set || '1',
      subject: q.subject || 'science',
      q: q.q || '',
      choices: q.choices ? [...q.choices] : ['', '', '', ''],
      answer: typeof q.answer === 'number' ? q.answer : 0,
      explain: q.explain || '',
      q_image: q.q_image,
      choice_images: q.choice_images ? [...q.choice_images] : ['', '', '', ''],
      explain_image: q.explain_image,
      choiceCount: q.choices?.length === 2 ? 2 : 4,
    });
  }, [bank, levels]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;

    if (!form.q.trim()) { alert('กรุณากรอกคำถาม'); return; }
    const visibleChoices = form.choices.slice(0, form.choiceCount);
    if (visibleChoices.some(c => !c.trim())) { alert(`กรุณากรอกตัวเลือกให้ครบทั้ง ${form.choiceCount} ข้อ`); return; }
    if (form.answer >= form.choiceCount) { alert('กรุณาเลือกคำตอบที่ถูกต้อง'); return; }

    const cleanChoiceImages = form.choice_images.map(c => c || undefined);

    if (modalMode === 'add') {
      const newQuestion: OnetBankQuestion = {
        id: 'onet_' + Date.now(),
        isDefault: false,
        level: form.level,
        year: form.year,
        set: form.set.trim() || '1',
        subject: form.subject,
        q: form.q.trim(),
        q_image: form.q_image || undefined,
        choices: form.choices.slice(0, form.choiceCount).map(c => c.trim()),
        choice_images: cleanChoiceImages.some(c => c) ? form.choice_images.map(c => c || '') : undefined,
        answer: form.answer,
        explain: form.explain.trim(),
        explain_image: form.explain_image || undefined,
      };
      persistBank([...bank, newQuestion]);
      setEditingId(null);
      setImportMsg('✅ เพิ่มข้อสอบใหม่เรียบร้อยแล้ว');
      setImportOk(true);
      return;
    }

    const idx = bank.findIndex((b) => b.id === editingId);
    if (idx === -1) return;

    const updated = [...bank];

    updated[idx] = {
      ...updated[idx],
      level: form.level,
      year: form.year,
      set: form.set.trim() || '1',
      subject: form.subject,
      q: form.q.trim(),
      q_image: form.q_image || undefined,
      choices: form.choices.slice(0, form.choiceCount).map(c => c.trim()),
      choice_images: form.choice_images.some(c => c) ? form.choice_images.map(c => c || '') : undefined,
      answer: form.answer,
      explain: form.explain.trim(),
      explain_image: form.explain_image || undefined,
      isDefault: false,
    };

    persistBank(updated);
    setEditingId(null);
    setImportMsg('✅ บันทึกสำเร็จ');
    setImportOk(true);
    alert('บันทึกสำเร็จ!');
  }, [editingId, modalMode, bank, form, persistBank]);

  /* ===== render helpers ===== */
  const levelOptions = () => (
    <>
      {levels.map((v) => (
        <option key={v} value={v}>{escapeHtml(v)}</option>
      ))}
    </>
  );

  const yearOptions = () => (
    <>
      {years.map((v) => (
        <option key={v} value={v}>{escapeHtml(v)}</option>
      ))}
    </>
  );

  const subjectOptions = () => (
    <>
      {(Object.keys(subjectInfo) as Array<keyof typeof subjectInfo>).map((k) => (
        <option key={k} value={k}>{subjectInfo[k].icon} {subjectInfo[k].name}</option>
      ))}
    </>
  );

  /* ===== TAB: import ===== */
  const renderImportTab = () => (
    <div className="space-y-6">
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 md:p-5 text-xs md:text-sm text-slate-700 leading-relaxed shadow-xs">
        <b className="text-amber-900 text-sm md:text-base flex items-center gap-2 mb-1.5">📋 รูปแบบไฟล์ CSV</b>
        <p className="mb-2">คอลัมน์ที่ต้องการ: <code className="bg-white text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 font-mono text-xs font-bold">level, year, set, subject, type, question, choice1, choice2, choice3, choice4, answer, explain</code></p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          <li><b className="text-slate-800">level:</b> ระดับชั้น เช่น ป.6, ม.3, ม.6 หรือ "ทั่วไป"</li>
          <li><b className="text-slate-800">year:</b> ปี พ.ศ. หรือ "ทั่วไป"</li>
          <li><b className="text-slate-800">set:</b> ชุดข้อสอบ เช่น 1, 2, 3 (ถ้าไม่ใส่จะเป็นชุดที่ 1)</li>
          <li><b className="text-slate-800">subject:</b> ใส่ science, math, thai, english, social</li>
          <li><b className="text-slate-800">type:</b> <code className="bg-white text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px] font-bold">mc</code> = 4 ตัวเลือก (ค่าเริ่มต้น) · <code className="bg-white text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px] font-bold">yn</code> = ใช่/ไม่ใช่ (2 ตัวเลือก)</li>
          <li><b className="text-slate-800">answer:</b> คำตอบที่ถูกเป็น A/B/C/D (หรือ 1-4)</li>
          <li><b className="text-slate-800">ขึ้นบรรทัดใหม่:</b> พิมพ์ <code className="bg-white text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px] font-bold">\n</code> ในข้อความ เช่น <code className="bg-white text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px] font-bold">ก) ...\nข) ...</code></li>
        </ul>
        <p className="mt-2 text-slate-500">รองรับทั้งไฟล์ที่มีคอลัมน์ set (11 คอลัมน์) และไม่มี set (10 คอลัมน์)</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <label className="cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-amber-600/20 text-xs md:text-sm inline-flex items-center gap-2 transition-all active:scale-95">
          📤 อัปโหลดไฟล์ CSV
          <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
        </label>
        <button className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 px-4 py-2.5 rounded-xl text-xs md:text-sm inline-flex items-center gap-2 shadow-xs transition-all active:scale-95" onClick={downloadSampleCSV}>
          📄 ดาวน์โหลดตัวอย่าง
        </button>
        <button className="bg-white hover:bg-slate-50 text-amber-700 font-bold border border-amber-200 px-4 py-2.5 rounded-xl text-xs md:text-sm inline-flex items-center gap-2 shadow-xs transition-all active:scale-95" onClick={exportCurrentCSV}>
          💾 ส่งออกข้อมูลปัจจุบัน
        </button>
      </div>

      {importMsg && (
        <div className={`p-4 rounded-2xl text-xs md:text-sm font-semibold border shadow-xs flex items-center justify-between ${importOk ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          <span>{importMsg}</span>
          <button onClick={() => setImportMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">✕</button>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>🗑️</span> ล้างข้อสอบแบบเลือกเงื่อนไข
        </h3>
        <div className="flex flex-wrap gap-2.5 items-center mb-4">
          <select value={fLevel} onChange={(e) => setFLevel(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกระดับชั้น --</option>
            {levels.map((v) => (
              <option key={v} value={v}>{escapeHtml(v)}</option>
            ))}
          </select>
          <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกปี --</option>
            {years.map((v) => (
              <option key={v} value={v}>{escapeHtml(v)}</option>
            ))}
          </select>
          <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกวิชา --</option>
            {(Object.keys(subjectInfo) as Array<keyof typeof subjectInfo>).map((k) => (
              <option key={k} value={k}>{subjectInfo[k].icon} {subjectInfo[k].name}</option>
            ))}
          </select>
          <select value={fSet} onChange={(e) => setFSet(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกชุด --</option>
            {[...new Set(bank.map(q => q.set || '1'))].sort((a, b) => Number(a) - Number(b)).map(s => (
              <option key={s} value={s}>ชุดที่ {s}</option>
            ))}
          </select>
          <button className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95" onClick={clearFiltered}>
            ล้างตามเงื่อนไข
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all active:scale-95" onClick={clearAll}>
            🗑️ ล้างข้อสอบทั้งหมด
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>📊</span> สรุปจำนวนข้อสอบ O-NET
        </h3>
        {renderStatsTable()}
      </div>
    </div>
  );

  /* ===== TAB: manage ===== */
  const renderManageTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>🎓</span> จัดการระดับชั้น (ป.6 / ม.3 / ม.6)
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            placeholder="ระดับชั้นใหม่ เช่น ป.6"
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all active:scale-95" onClick={addLevel}>
            ➕ เพิ่มระดับชั้น
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {levels.map((name) => (
            <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-bold shadow-xs">
              {escapeHtml(name)}
              <button onClick={() => removeLevel(name)} className="text-rose-500 hover:text-rose-700 font-black ml-1">✕</button>
            </span>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <span>📅</span> จัดการปี พ.ศ.
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            placeholder="ปี พ.ศ. ใหม่ เช่น 2569"
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all active:scale-95" onClick={addYear}>
            ➕ เพิ่มปี
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <span key={y} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-bold shadow-xs">
              {escapeHtml(y)}
              <button onClick={() => removeYear(y)} className="text-rose-500 hover:text-rose-700 font-black ml-1">✕</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  /* ===== TAB: list ===== */
  const renderListTab = () => {
    const filtered = bank.filter((q) =>
      (!fLevel || q.level === fLevel) &&
      (!fYear || q.year === fYear) &&
      (!fSubject || q.subject === fSubject) &&
      (!fSet || (q.set || '1') === fSet) &&
      (!fSearch || q.q.toLowerCase().includes(fSearch.toLowerCase()) || q.explain?.toLowerCase().includes(fSearch.toLowerCase())),
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2.5 items-center">
          <select value={fLevel} onChange={(e) => setFLevel(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกระดับชั้น --</option>
            {levels.map((v) => (
              <option key={v} value={v}>{escapeHtml(v)}</option>
            ))}
          </select>
          <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกปี --</option>
            {years.map((v) => (
              <option key={v} value={v}>{escapeHtml(v)}</option>
            ))}
          </select>
          <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกวิชา --</option>
            {(Object.keys(subjectInfo) as Array<keyof typeof subjectInfo>).map((k) => (
              <option key={k} value={k}>{subjectInfo[k].icon} {subjectInfo[k].name}</option>
            ))}
          </select>
          <select value={fSet} onChange={(e) => setFSet(e.target.value)} className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">-- ทุกชุด --</option>
            {[...new Set(bank.map(q => q.set || '1'))].sort((a, b) => Number(a) - Number(b)).map(s => (
              <option key={s} value={s}>ชุดที่ {s}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
              placeholder="ค้นหาคำถาม..."
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            {fSearch && (
              <button onClick={() => setFSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500 font-semibold">พบ {filtered.length} ข้อ</div>
          <button
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-amber-600/20 transition-all active:scale-95"
            onClick={startAdd}
          >
            ➕ เพิ่มข้อสอบใหม่
          </button>
        </div>
        {renderQuestionList(filtered)}
      </div>
    );
  };

  /* ===== stats ===== */
  const renderStatsTable = () => {
    const rows: Array<{ lv: string; yr: string; st: string; sub: string; count: number }> = [];
    levels.forEach((lv) => {
      years.forEach((yr) => {
        const setsInLvYr = [...new Set(bank.filter(b => b.level === lv && b.year === yr).map(b => b.set || '1'))];
        setsInLvYr.forEach((st) => {
          (Object.keys(subjectInfo) as Array<keyof typeof subjectInfo>).forEach((sub) => {
            const count = bank.filter((b) => b.level === lv && b.year === yr && (b.set || '1') === st && b.subject === sub).length;
            if (count > 0) rows.push({ lv, yr, st, sub, count });
          });
        });
      });
    });
    if (rows.length === 0) {
      return (
        <div className="text-center py-8 text-slate-400 text-xs md:text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-3xl mb-1">📭</p>
          ยังไม่มีข้อมูลข้อสอบในระบบ
        </div>
      );
    }
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-xs md:text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="px-4 py-2.5 text-left">ระดับชั้น</th>
              <th className="px-4 py-2.5 text-left">ปี พ.ศ.</th>
              <th className="px-4 py-2.5 text-left">ชุด</th>
              <th className="px-4 py-2.5 text-left">วิชา</th>
              <th className="px-4 py-2.5 text-right">จำนวนข้อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {rows.map((r) => (
              <tr key={`${r.lv}-${r.yr}-${r.st}-${r.sub}`} className="hover:bg-slate-50/80 transition">
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">{escapeHtml(r.lv)}</span></td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-xs">{escapeHtml(r.yr)}</span></td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-bold text-xs">ชุดที่ {r.st}</span></td>
                <td className="px-4 py-2.5">{subjectInfo[r.sub]?.icon} {subjectInfo[r.sub]?.name}</td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-right text-xs text-slate-500 font-semibold">
          รวมทั้งหมด <strong className="text-amber-600 text-sm font-black">{bank.length}</strong> ข้อ
        </div>
      </div>
    );
  };

  /* ===== question list ===== */
  const renderQuestionList = (filtered: OnetBankQuestion[]) => {
    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-4xl mb-2">🔍</p>
          <p className="font-semibold text-slate-600">ไม่พบข้อสอบตามเงื่อนไขที่เลือก</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {filtered.map((q) => (
          <div key={q.id} className="bg-white border border-slate-200/80 hover:border-amber-200 rounded-2xl p-4 md:p-5 shadow-xs transition-all space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">🎓 {q.level}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800">📅 {q.year}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700">📋 ชุดที่ {q.set || '1'}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                {subjectInfo[q.subject]?.icon || '📌'} {subjectInfo[q.subject]?.name || q.subject}
              </span>
            </div>
            <MathText as="div" className="font-bold text-slate-800 text-sm md:text-base whitespace-pre-line">{q.q}</MathText>

            {q.q_image && (
              <img src={q.q_image} alt="รูปคำถาม" className="max-h-40 rounded-xl border border-slate-200" />
            )}

            <div className="bg-slate-50 rounded-xl p-3 text-xs md:text-sm text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.choices.map((c, idx) => (
                <div key={idx} className={`flex flex-col gap-1 p-1.5 rounded-lg ${idx === q.answer ? 'font-bold text-emerald-700 bg-emerald-50/50' : ''}`}>
                  <div className="whitespace-pre-line">{String.fromCharCode(65 + idx)}. <MathText>{c}</MathText> {idx === q.answer ? '✓' : ''}</div>
                  {q.choice_images?.[idx] && (
                    <img src={q.choice_images[idx]} alt={`รูปตัวเลือก ${String.fromCharCode(65 + idx)}`} className="h-16 w-auto object-contain rounded border border-slate-200 self-start" />
                  )}
                </div>
              ))}
            </div>

            {q.explain && (
              <div className="text-xs text-slate-500 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60">
                💡 <strong>เฉลย:</strong> <MathText className="whitespace-pre-line">{q.explain}</MathText>
                {q.explain_image && (<img src={q.explain_image} alt="รูปเฉลย" className="mt-2 max-h-32 rounded-lg border border-amber-200" />)}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <button className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all" onClick={() => startEdit(q.id)}>
                ✏️ แก้ไข
              </button>
              <button className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all" onClick={() => deleteOne(q.id)}>
                🗑️ ลบข้อนี้
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ===== edit modal ===== */
  const renderEditModal = () => {
    if (!editingId) return null;
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) cancelEdit();
        }}
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-5 text-white">
            <h3 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
              <span>{modalMode === 'add' ? '➕ เพิ่มข้อสอบ O-NET' : '✏️ แก้ไขข้อสอบ O-NET'}</span>
            </h3>
          </div>

          <div className="p-6 space-y-4 text-xs md:text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">🎓 ระดับชั้น</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {levelOptions()}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">📅 ปี พ.ศ.</label>
                <select
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {yearOptions()}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">📋 ชุดที่</label>
                <input
                  type="text"
                  value={form.set}
                  onChange={(e) => setForm(prev => ({ ...prev, set: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="เช่น 1, 2, 3"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">📚 วิชา</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {subjectOptions()}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">❓ คำถาม</label>
              <textarea
                rows={5}
                value={form.q}
                onChange={(e) => setForm(prev => ({ ...prev, q: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <label className="cursor-pointer text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 inline-flex items-center gap-1">
                  📷 แนบรูปภาพคำถาม
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'q_image')} />
                </label>
                {form.q_image && (
                  <>
                    <img src={form.q_image} alt="รูปคำถาม" className="h-10 rounded-lg border object-cover" />
                    <button type="button" onClick={() => removeImage('q_image')} className="text-rose-500 text-xs font-bold">✕</button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">📝 ชนิดข้อสอบ</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, choiceCount: 4, choices: [prev.choices[0] ?? '', prev.choices[1] ?? '', prev.choices[2] ?? '', prev.choices[3] ?? ''] }))}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${form.choiceCount === 4 ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  🔤 4 ตัวเลือก (ก-ง)
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    choiceCount: 2,
                    choices: [prev.choices[0] || 'ใช่', prev.choices[1] || 'ไม่ใช่', '', ''],
                    answer: Math.min(prev.answer, 1),
                  }))}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${form.choiceCount === 2 ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  ✌️ ใช่ / ไม่ใช่
                </button>
              </div>
              <label className="block text-xs font-bold text-slate-700 mb-2">✅ ตัวเลือก (เลือกวงกลมหน้าข้อที่เป็นคำตอบที่ถูกต้อง)</label>
              <div className="space-y-2">
                {[0, 1, 2, 3].slice(0, form.choiceCount).map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="onetEditAnswerRadio"
                      checked={form.answer === c}
                      onChange={() => setForm(prev => ({ ...prev, answer: c }))}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span className="w-5 font-bold text-amber-800 text-xs">{String.fromCharCode(65 + c)}.</span>
                    <input
                      type="text"
                      value={form.choices[c]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(prev => {
                          const next = [...prev.choices];
                          next[c] = val;
                          return { ...prev, choices: next };
                        });
                      }}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <label className="cursor-pointer text-xs text-slate-400 hover:text-amber-600" title="แนบรูปภาพ">
                      📷
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, `choice_${c}` as any, c)} />
                    </label>
                    {form.choice_images[c] && (
                      <>
                        <img src={form.choice_images[c]} alt="" className="h-8 w-8 rounded-lg border object-cover" />
                        <button type="button" onClick={() => removeImage(`choice_${c}` as any, c)} className="text-rose-500 text-xs">✕</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">💡 คำอธิบายเฉลย</label>
              <textarea
                rows={5}
                value={form.explain}
                onChange={(e) => setForm(prev => ({ ...prev, explain: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <label className="cursor-pointer text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 inline-flex items-center gap-1">
                  📷 แนบรูปภาพเฉลย
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'explain_image')} />
                </label>
                {form.explain_image && (
                  <>
                    <img src={form.explain_image} alt="รูปเฉลย" className="h-10 rounded-lg border object-cover" />
                    <button type="button" onClick={() => removeImage('explain_image')} className="text-rose-500 text-xs font-bold">✕</button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50" onClick={cancelEdit}>ยกเลิก</button>
              <button type="button" className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/20 hover:from-amber-700 hover:to-orange-700" onClick={saveEdit}>{modalMode === 'add' ? '💾 เพิ่มข้อสอบ' : '💾 บันทึกการแก้ไข'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ===== main render ===== */
  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        <button
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
            tab === 'import'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => { setTab('import'); setImportMsg(null); }}
        >
          📤 นำเข้าข้อมูล
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
            tab === 'manage'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setTab('manage')}
        >
          🎓 ระดับชั้น &amp; ปี
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
            tab === 'list'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setTab('list')}
        >
          📋 รายการข้อสอบ
        </button>
      </div>

      {tab === 'import' && renderImportTab()}
      {tab === 'manage' && renderManageTab()}
      {tab === 'list' && renderListTab()}

      {editingId && renderEditModal()}
    </div>
  );
};

export default AdminQuestionsONetBank;
