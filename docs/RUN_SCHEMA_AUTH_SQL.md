# วิธีรัน supabase/schema-auth.sql — 3 ทางเลือก

## ทางที่ 1: SQL Editor (ง่ายที่สุด)
1. เปิด https://supabase.com/dashboard → เลือกโปรเจกต์ `skqjnkawlmewazmrtevt`
2. เมนูซ้าย → **SQL Editor** → **New query**
3. เปิดไฟล์ `supabase/schema-auth.sql` ในโฟลเดอร์โปรเจกต์ → เลือกทั้งหมด (Cmd+A) → คัดลอก (Cmd+C) → วาง (Cmd+V) → กด **Run**
4. ต้องขึ้น "Success. No rows returned"

## ทางที่ 2: Personal Access Token (ให้ Buffy รันให้)
1. ไปที่ https://supabase.com/dashboard/account/tokens (รูปโปรไฟล์ → Account → Access Tokens)
2. กด **Generate new token** ตั้งชื่อว่า "scitech-deploy" → คัดลอก token (ขึ้นต้น `sbp_...`)
3. วาง token ในแชทนี้ → ฉันจะรัน SQL ผ่าน Management API ให้และตรวจสอบทุกนโยบายเอง
   (token ใช้ได้กับโปรเจกต์ Supabase ของคุณ และลบทิ้งได้ทุกเมื่อหลังงานเสร็จ)

## ทางที่ 3: psql (ถ้ามี database password)
```bash
psql "postgresql://postgres:[PASSWORD]@db.skqjnkawlmewazmrtevt.supabase.co:5432/postgres" -f supabase/schema-auth.sql
```

## ⚠️ อย่าลืม: ปิดยืนยันอีเมล
Dashboard → **Authentication → Sign In / Providers** → ปิด **Confirm email**
(แอปสร้างบัญชีให้ผู้ใช้โดยไม่ส่งเมลยืนยัน — ถ้าเปิด confirm ไว้ ผู้ใช้จะล็อกอินไม่ได้)

## ตรวจสอบว่าสำเร็จ
หลังรันเสร็จ พิมพ์ในแชทว่า "ตรวจสอบ" — ฉันจะยิง probe ไปที่ API เพื่อยืนยันว่า
- anon อ่าน/เขียนไม่ได้แล้ว (401)
- ฟังก์ชัน is_admin_rpc / admin_create_user / admin_set_password มีอยู่จริง
