import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/* ==========================================================
   MathText — รองรับสัญลักษณ์ทางคณิตศาสตร์ (LaTeX) ในข้อความ
   ----------------------------------------------------------
   วิธีใช้ในโจทย์ / ตัวเลือก / เฉลย ได้ 2 แบบ:

   1) ครอบด้วย $ (ระบุชัดเจน):
     $x^2 + 2x$          →  สมการในบรรทัดเดียวกับข้อความ
     $$\frac{a}{b}$$     →  สมการย่อหน้าเด่น (display mode)

   2) พิมพ์คำสั่ง LaTeX ตรง ๆ ได้เลย ไม่ต้องมี $ (ตรวจจับอัตโนมัติ):
     \frac{11}{10}   →  เศษส่วน
     \times \div \pm \leq \geq \neq \sqrt{x} \pi
     x^2  x^{10}  a_1  a_{n+1}

   ตัวอย่าง:
     ถ้า $x^2 = 49$ แล้วค่า $x$ คือข้อใด?
     \frac{4}{15} + \frac{13}{10} มีค่าเท่าใด?   ← ทำงานได้ทั้ง 2 แบบ
   ใช้ร่วมกับการขึ้นบรรทัดใหม่ (\n ใน CSV หรือ Enter ในฟอร์ม) ได้
   ========================================================== */

interface Part {
  math: boolean;
  display: boolean;
  content: string;
  /** true = ตรวจจับเอง (ไม่มี $ ครอบ) → ถ้า parse ไม่ผ่านให้แสดงข้อความเดิม */
  auto?: boolean;
}

/** แยกข้อความเป็นชิ้น ๆ ตาม $...$ (inline) และ $$...$$ (display) */
function splitMath(text: string): Part[] {
  const parts: Part[] = [];
  // $$...$$ ก่อน $...$ เสมอ
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ math: false, display: false, content: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      parts.push({ math: true, display: true, content: m[1] });
    } else if (m[2] !== undefined) {
      parts.push({ math: true, display: false, content: m[2] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, display: false, content: text.slice(last) });
  return parts;
}

/**
 * ตรวจจับคำสั่ง LaTeX ที่พิมพ์โดยไม่มี $ ครอบ เช่น
 *   \frac{11}{10}  \sqrt{2}  \times  \pi   และ  x^2  a_{n+1}
 * รองรับ {} ซ้อนกันได้ 1 ชั้น (\frac{\pi}{2})
 */
const BARE_LATEX_RE = new RegExp(
  [
    // \คำสั่ง ตามด้วยอาร์กิวเมนต์ {...} กี่ตัวก็ได้
    '\\\\[a-zA-Z]+(?:\\s*\\{(?:[^{}]|\\{[^{}]*\\})*\\})*',
    // ยกกำลัง / ดัชนีแบบไม่มี backslash: x^2, 10^{3}, a_1
    '[0-9a-zA-Z)](?:\\^|_)(?:\\{(?:[^{}]|\\{[^{}]*\\})*\\}|[0-9a-zA-Z]+)',
  ].join('|'),
  'g',
);

/** แยกข้อความธรรมดาเพิ่ม โดยห่อชิ้นที่เป็น LaTeX เป็นส่วนคณิตศาสตร์ */
function splitAutoMath(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(BARE_LATEX_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ math: false, display: false, content: text.slice(last, m.index) });
    parts.push({ math: true, display: false, content: m[0], auto: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, display: false, content: text.slice(last) });
  return parts;
}

function splitAll(text: string): Part[] {
  const dollarParts = splitMath(text);
  const out: Part[] = [];
  for (const p of dollarParts) {
    if (p.math) out.push(p);
    else out.push(...splitAutoMath(p.content));
  }
  return out;
}

interface MathTextProps {
  children: string;
  className?: string;
  as?: 'span' | 'div' | 'p' | 'h2' | 'h3' | 'h4';
}

export const MathText: React.FC<MathTextProps> = ({ children, className, as = 'span' }) => {
  const Tag = as as React.ElementType;

  const rendered = useMemo(() => {
    if (!children) return null;
    const parts = splitAll(children);
    if (parts.length === 0) return null;

    // ไม่มีสัญลักษณ์คณิตศาสตร์เลย → แสดงข้อความปกติ (เร็ว, ไม่เรียก katex)
    if (!parts.some(p => p.math)) return null;

    return parts.map((p, i) => {
      if (!p.math) return <React.Fragment key={i}>{p.content}</React.Fragment>;
      try {
        const html = katex.renderToString(p.content, {
          displayMode: p.display,
          // ส่วนที่ตรวจจับเอง: parse ไม่ผ่าน = ไม่ใช่สมการ → คงข้อความเดิม
          // (ส่วนที่ครอบด้วย $ ชัดเจน: แสดง error สีแดงเพื่อให้ผู้ใช้แก้)
          throwOnError: !p.auto,
          strict: false,
          output: 'html',
        });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      } catch {
        return <React.Fragment key={i}>{p.content}</React.Fragment>;
      }
    });
  }, [children]);

  // ข้อความธรรมดา (ไม่มีคณิตศาสตร์) → แท็กเดียว คง whitespace-pre-line จาก className
  if (!rendered) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag className={className} style={{ whiteSpace: 'pre-line' }}>
      {rendered}
    </Tag>
  );
};

export default MathText;
