# Phase 1 — ย้ายข้อมูลที่หลายเครื่องเขียนพร้อมกัน ขึ้น "ตารางจริง" ต่อเรกคอร์ด

## ปัญหาที่แก้
ระบบเดิมเก็บทุกอย่างเป็น JSON blob เดียวต่อคีย์ใน `app_state` ("last write wins" ทั้งชุด)
อุปกรณ์สองเครื่องเขียนพร้อมกัน → สำเนาของเครื่องหนึ่ง **ทับทั้งก้อน** แล้วงานของอีกเครื่องหาย
(สาเหตุเดิมของ "บทเรียน/คะแนนหาย", "เช็คชื่อหาย")

Phase 1 ย้ายข้อมูลที่ **หลายเครื่องเขียนพร้อมกันบ่อยที่สุด** ขึ้นตารางจริง 1 เรกคอร์ด = 1 แถว:

| เดิม (app_state key)              | ใหม่ (ตารางจริง)          |
|-----------------------------------|---------------------------|
| `scitech_worksheet_submissions`   | `worksheet_submissions`   |
| `scitech_attendance_records`      | `attendance_records`      |

- เครื่อง A ส่งใบงาน + เครื่อง B ส่งอีกใบ พร้อมกัน → คนละแถว ไม่มีวันทับกัน
- ครูตรวจคะแนนแถวเดียว → แถวอื่นไม่ถูกแตะ
- ออฟไลน์: เขียนลง cache/outbox ในเครื่อง (ธง id `local:*`) แล้ว push ซ้ำอัตโนมัติ
- realtime ผ่าน Supabase Realtime แทนการ poll ทุก 5 วินาที (มี refresh ทุก 30 วิ เป็น safety net)

## วิธีเปิดใช้ (ครั้งเดียว)

1. **รัน SQL บน Supabase** — เลือกวิธีใดวิธีหนึ่ง:
   - Dashboard → SQL Editor → วางเนื้อหา `supabase/schema-records.sql` → Run
   - หรือ `node scripts/run-schema-records.mjs sbp_...` (token จาก supabase.com/dashboard/account/tokens)

2. **deploy โค้ดใหม่** (git pull ที่เครื่อง/เซิร์ฟเวอร์อื่น + build ใหม่)

3. **เปิดแอปครั้งแรก** — แอปจะ:
   - backfill ข้อมูลเดิมจาก `app_state` เข้าตารางใหม่อัตโนมัติ (ครั้งเดียว, ทำซ้ำได้ ไม่ซ้ำแถว)
   - ใช้ตารางใหม่ตั้งแต่นั้นเป็นต้นไป

## หมายเหตุเทคนิค

- **id เปลี่ยนเป็น string (uuid)** — แถวเก่าได้ `legacy:<ตัวเลขเดิม>`, งานที่ยัง push ไม่ขึ้นได้
  `local:<uuid>` (outbox) ทุกหน้า UI ใช้ id แบบทึบ (opaque) อยู่แล้ว จึงไม่ต้องแก้
- **localStorage ยังเก็บ `scitech_worksheet_submissions` / `scitech_attendance_records`**
  ในฐานะ cache อ่านตอน boot/ออฟไลน์ + outbox — `starAchievements.ts` ที่อ่าน key ตรง ๆ ยังทำงานเหมือนเดิม
- **คีย์ทั้งสองถูกถอดออกจาก `SYNCED_KEYS` ของ cloudSync** — blob sync ไม่แตะข้อมูลกลุ่มนี้อีก
  (สมุดจด `scitech_grades_journal` ยัง sync แบบเดิมเพื่อกู้คะแนนเก่าระหว่าง TRANSITION)
- **RLS ของตารางใหม่** เปิดเท่า app_state ปัจจุบัน (โปรเจกต์นี้ยังให้ anon เขียนตรง — ตรวจสอบ live แล้ว)
  ความถูกต้องของข้อมูลมาจาก unique constraints แทน: คำตอบซ้ำ/เช็คชื่อซ้ำ = upsert ทับแถวเดิม ไม่ซ้ำแถว
  เมื่อรัน `schema-auth.sql` ในอนาคต ให้สลับนโยบายตามคอมเมนต์ท้ายไฟล์ SQL
- **server/index.js (LAN)** ยังทำงานปกติกับใบงาน แต่คำตอบ/เช็คชื่อใช้เส้นทางคลาวด์แล้ว

## ขั้นถัดไป (Phase 2+)
- `scitech_worksheets` → ตาราง `worksheets` (เลิกใช้ server/index.js ได้)
- `scitech_subjects` / `scitech_lessons` / `scitech_questions` → ตารางจริง
- ผู้ใช้ → Supabase Auth เต็มรูปแบบ (ตาม schema-auth.sql)
