# ตั้งค่า Supabase + Vercel สำหรับ SciTech Learning

ระบบพร้อมไว้แล้วทั้งหมด — เหลือเพียงเอาค่าคีย์จาก Supabase มาใส่ แล้วกด deploy บน Vercel

## สิ่งที่ระบบทำอัตโนมัติเมื่อเสร็จแล้ว

- ข้อมูลทั้งหมด (ผู้ใช้ บทเรียน ข้อสอบ O-NET/ม.1 ใบงาน ประกาศ ปฏิทิน เช็คชื่อ ภารกิจ ฯลฯ)
  จะ **ซิงก์ขึ้น Supabase อัตโนมัติ** — แก้จากเครื่องไหนก็เห็นข้อมูลชุดเดียวกัน
- เปิดแอป: ดึงข้อมูลใหม่จากคลาวด์มาก่อน (ถ้าคลาวด์ช้าสุด 1.5 วิ จะเปิดจากข้อมูลเดิมในเครื่องไปก่อน)
- แก้ไขอะไร: อัปเดตขึ้นคลาวด์ทันที (รวบการเขียนถี่ ๆ ทุก ~1.2 วิ, ปิดแท็บส่งทันที)
- **ถ้าไม่ใส่คีย์ แอปก็ยังทำงานปกติ** จาก localStorage เหมือนเดิมทุกอย่าง

## ขั้นตอนที่ 1 — สร้างฐานข้อมูล Supabase (5 นาที)

1. ไปที่ https://supabase.com → Sign up (ฟรี) → **New project**
2. ตั้งชื่อ `scitech-learning` ตั้งรหัสผ่าน DB (จดไว้) เลือก region ใกล้สุด (Singapore)
3. เมื่อโปรเจกต์พร้อม: เมนูซ้าย **SQL Editor** → **New query**
4. วางเนื้อหาทั้งหมดของไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ → **Run**
   (สร้างตาราง `app_state` ที่เก็บข้อมูลทุกประเภทของแอป)
5. ไปที่ **Project Settings → API** แล้วคัดลอก 2 ค่า:
   - **Project URL** เช่น `https://abcd1234.supabase.co`
   - **anon public key** (คีย์ยาว ๆ ขึ้นต้น `eyJ...`)

## ขั้นตอนที่ 2 — Deploy บน Vercel (5 นาที)

1. ไปที่ https://vercel.com → Sign up **ด้วย GitHub** (สำคัญ เพื่อเชื่อม repo)
2. **Add New… → Project** → เลือก repo `scitech-learning` → **Import**
3. Vercel จะตรวจจับ Vite เอง (Build: `npm run build`, Output: `dist`) — ไม่ต้องแก้
4. ก่อนกด Deploy: เปิด **Environment Variables** แล้วเพิ่ม 2 บรรทัดนี้
   (ค่าจากขั้นตอนที่ 1 ใส่ทั้ง Production / Preview / Development):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://abcd1234.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi…` (anon key เต็ม) |

5. กด **Deploy** รอ ~1 นาที ได้ลิงก์ เช่น `https://scitech-learning.vercel.app`

## ขั้นตอนที่ 3 — รันบนเครื่องตัวเองให้ซิงก์ด้วย (ถ้าต้องการ)

```bash
cp .env.example .env.local
# เปิด .env.local แล้วใส่ URL กับ anon key จริง
npm run dev
```

## หลังจากนี้

- ทุกครั้งที่ `git push` → GitHub Actions อัปเดต GitHub Pages และ Vercel ก็ build ให้เอง
  (หน้าเว็บหลักแนะนำใช้ลิงก์ Vercel เพราะมีฐานข้อมูลจริง)
- อยากย้าย/สำรองข้อมูล: Supabase → Table Editor → ตาราง `app_state`
  (แถวละ 1 คีย์ เช่น `scitech_users`, `onet_bank_data_v1`)
- ถ้าเปลี่ยนโปรเจกต์ Supabase: แค่เปลี่ยน env 2 ตัวแล้ว redeploy
