import { useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================
   📅 ThaiDatePicker — ช่องเลือกวันที่พร้อมปฏิทินเดือนภาษาไทย
   ใช้แทน <input type="date"> ให้หน้าตาและภาษาเป็นไทยทั้งหมด
   (เดือนไทย · ปี พ.ศ. · หัวตาราง อา-ส)

   props:
     value    'YYYY-MM-DD' หรือ '' (ยังไม่เลือก)
     onChange (iso: string) => void   — '' เมื่อกดล้าง
     placeholder ข้อความเมื่อยังไม่เลือก
   ============================================================ */

const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTHS_TH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const toISO = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const fromISO = (iso: string): { y: number; m: number; d: number } | null => {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!mt) return null;
  return { y: Number(mt[1]), m: Number(mt[2]) - 1, d: Number(mt[3]) };
};

interface Props {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}

export default function ThaiDatePicker({ value, onChange, placeholder = 'เลือกวันที่' }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = fromISO(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(selected?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(selected?.m ?? today.getMonth());

  // ปิดเมื่อคลิกนอกกล่อง หรือกด Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // เปิดปฏิทิน → กลับไปหน้าเดือนของวันที่ที่เลือกไว้
  const toggleOpen = () => {
    if (!open && selected) {
      setViewYear(selected.y);
      setViewMonth(selected.m);
    }
    setOpen(v => !v);
  };

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1).getDay();
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    const list: (number | null)[] = [];
    for (let i = 0; i < first; i++) list.push(null);
    for (let d = 1; d <= days; d++) list.push(d);
    return list;
  }, [viewYear, viewMonth]);

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const fmtDisplay = (iso: string) => {
    const s = fromISO(iso);
    return s ? `${s.d} ${MONTHS_TH_SHORT[s.m]} ${s.y + 543}` : '';
  };

  const nav = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div className="relative" ref={wrapRef}>
      {/* ช่องแสดงค่า — คลิกเพื่อเปิด/ปิดปฏิทิน */}
      <button
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-sm font-bold text-left transition-all outline-none ${
          open ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-200 hover:border-amber-300'
        }`}
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400 font-medium'}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
        <span className="text-base shrink-0">📅</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 left-0 w-72 rounded-2xl border border-amber-200 bg-white shadow-xl shadow-amber-900/10 p-3">
          {/* หัวปฏิทิน: ‹ เดือน ปีพศ › */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="w-7 h-7 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700 font-black transition-all"
            >‹</button>
            <span className="text-sm font-black text-slate-800">
              {MONTHS_TH[viewMonth]} {viewYear + 543}
            </span>
            <button
              type="button"
              onClick={() => nav(1)}
              className="w-7 h-7 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700 font-black transition-all"
            >›</button>
          </div>

          {/* หัวตารางวัน */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS_TH.map(w => (
              <div key={w} className="text-center text-[10px] font-black text-slate-400 py-0.5">{w}</div>
            ))}
          </div>

          {/* ตารางวันที่ */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const iso = toISO(viewYear, viewMonth, d);
              const isSel = iso === value;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`h-8 rounded-lg text-xs font-bold transition-all active:scale-90 ${
                    isSel
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                      : isToday
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300'
                      : 'text-slate-600 hover:bg-amber-50'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* แถบล่าง: วันนี้ · ล้าง */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { onChange(todayISO); setOpen(false); }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              ล้าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
