# 📋 แผนงานโครงการ SciTech Learning
## แพลตฟอร์มการเรียนรู้วิทยาศาสตร์ออนไลน์สำหรับนักเรียน

---

## 🎯 เป้าหมายของโครงการ
สร้างระบบที่นักเรียนสามารถเข้ามาอ่านบทเรียน ทำแบบทดสอบแบบสุ่มข้อ และดูเฉลยพร้อมคำอธิบายได้ทันที

---

## 📅 แผนงานเป็น Phase

### Phase 1: ออกแบบระบบ (Week 1-2) ⏱️ ~2 สัปดาห์
| งาน | รายละเอียด | ผู้รับผิดชอบ |
|------|-----------|------------|
| ER Diagram | ออกแบบความสัมพันธ์ระหว่างตาราง | DBA |
| UI/UX Design | ออกแบบ wireframe ทุกหน้าจอ | UI Designer |
| Tech Stack | เลือกเทคโนโลยีและเครื่องมือ | Lead Dev |
| Database Schema | เขียน SQL สร้างตาราง 4 ตาราง | DBA |

**Deliverable:** ER Diagram, Wireframe, Database Schema ที่ผ่าน review

### Phase 2: พัฒนาระบบหลังบ้าน - Admin (Week 3-5) ⏱️ ~3 สัปดาห์
| งาน | รายละเอียด |
|------|-----------|
| Admin Login | ระบบล็อกอินสำหรับ admin/teacher |
| CRUD Subjects & Units | จัดการชั้นเรียนและหน่วยการเรียนรู้ |
| CRUD Lessons | สร้าง/แก้ไข/ลบบทเรียน (6 ขั้นตอน) |
| Question Bank | จัดการคลังข้อสอบ ตัวเลือก เฉลย |
| Quiz Management | จัดการชุดข้อสอบ เชื่อมกับบทเรียน |
| User Management | จัดการข้อมูลนักเรียน |

**Deliverable:** Admin Dashboard ที่ใช้งานได้ครบทุกฟีเจอร์

### Phase 3: พัฒนาระบบหน้าบ้าน - Student (Week 5-7) ⏱️ ~3 สัปดาห์ (overlap)
| งาน | รายละเอียด |
|------|-----------|
| Student Registration | ระบบสมัครสมาชิก/เข้าสู่ระบบ |
| Homepage | หน้าแรก เลือกชั้นเรียน ชมบทเรียน |
| Lesson Viewer | อ่านบทเรียนพร้อมสื่อมัลติมีเดีย |
| Random Quiz Engine | ระบบสุ่มข้อสอบจาก question_bank |
| Auto-Grading | ตรวจคำตอบอัตโนมัติ + แสดงเฉลย |
| Student Dashboard | ดูประวัติการทำแบบทดสอบ |

**Deliverable:** เว็บไซต์ฝั่งนักเรียนใช้งานได้ครบทุกฟีเจอร์

### Phase 4: ทดสอบและปรับปรุง (Week 8-9) ⏱️ ~2 สัปดาห์
| งาน | รายละเอียด |
|------|-----------|
| Unit Testing | ทดสอบฟังก์ชันหลัก |
| Integration Testing | ทดสอบระบบเชื่อมต่อ |
| UAT | ทดสอบกับนักเรียนกลุ่มเป้าหมาย |
| Performance Test | ทดสอบความเร็วและปริมาณผู้ใช้ |
| Bug Fix | แก้ไขข้อผิดพลาด |

**Deliverable:** ระบบผ่านการทดสอบทุก test case

### Phase 5: เปิดใช้งานจริง (Week 10) ⏱️ ~1 สัปดาห์
| งาน | รายละเอียด |
|------|-----------|
| Deploy | ติดตั้งระบบบน server จริง |
| Data Migration | นำเข้าข้อมูลจริง |
| User Training | ฝึกอบรม admin/teacher |
| Go-Live | เปิดให้นักเรียนใช้งาน |
| Monitor | ตรวจสอบระบบหลังเปิดใช้งาน |

**Deliverable:** ระบบเปิดใช้งานจริง พร้อม support

---

## 🏗️ Tech Stack ที่แนะนำ
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js + Express.js (หรือ Next.js API Routes)
- **Database:** MySQL 8.0
- **Auth:** JWT (JSON Web Tokens)
- **Hosting:** Vercel / AWS / Google Cloud

---

## 👥 ทีมงานที่ต้องการ
| ตำแหน่ง | จำนวน | หน้าที่ |
|----------|-------|---------|
| Project Manager | 1 | วางแผน ติดตามงาน |
| Full-Stack Developer | 2 | พัฒนาระบบ |
| UI/UX Designer | 1 | ออกแบบหน้าจอ |
| QA Tester | 1 | ทดสอบระบบ |

---

## 📊 สรุประยะเวลาทั้งหมด: **~10 สัปดาห์** (2.5 เดือน)
