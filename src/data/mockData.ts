import type { SubjectUnit, Lesson, Question, Quiz } from '../types';

export const mockSubjects: SubjectUnit[] = [
  { id: 1, grade_level: 1, unit_name: 'สิ่งมีชีวิตกับสิ่งแวดล้อม', unit_code: 'U.1', description: 'รู้จักสิ่งมีชีวิตและสิ่งแวดล้อมรอบตัว', is_active: true },
  { id: 2, grade_level: 1, unit_name: 'วัสดุรอบตัว', unit_code: 'U.2', description: 'ศึกษาวัสดุที่พบในชีวิตประจำวัน', is_active: true },
  { id: 3, grade_level: 2, unit_name: 'สิ่งมีชีวิต', unit_code: 'U.1', description: 'ชนิดของสิ่งมีชีวิตและการดูแล', is_active: true },
  { id: 4, grade_level: 3, unit_name: 'ร่างกายกับการเจริญเติบโต', unit_code: 'U.1', description: 'การเจริญเติบโตของร่างกาย', is_active: true },
  { id: 5, grade_level: 3, unit_name: 'ของเหลว', unit_code: 'U.2', description: 'คุณสมบัติของของเหลว', is_active: true },
  { id: 6, grade_level: 4, unit_name: 'โลกและอวกาศ', unit_code: 'U.1', description: 'โลก ดวงจันทร์ และดวงอาทิตย์', is_active: true },
  { id: 7, grade_level: 4, unit_name: 'ไฟฟ้า', unit_code: 'U.2', description: 'ไฟฟ้าสถิตและไฟฟ้าวงจร', is_active: true },
  { id: 8, grade_level: 5, unit_name: 'เนื้อเยื่อพืช', unit_code: 'U.1', description: 'โครงสร้างและหน้าที่ของเนื้อเยื่อพืช', is_active: true },
  { id: 9, grade_level: 6, unit_name: 'ปรากฏการณ์ทางธรรมชาติ', unit_code: 'U.1', description: 'ภัยธรรมชาติและการป้องกัน', is_active: true },
];

export const mockLessons: Lesson[] = [
  { id: 1, subject_unit_id: 1, title: 'สิ่งมีชีวิตคืออะไร', content: `# สิ่งมีชีวิตคืออะไร

สิ่งมีชีวิต คือ สิ่งที่มีชีวิต สามารถดำรงชีวิตอยู่ได้ด้วยตัวเอง มีลักษณะสำคัญ 6 ประการ ได้แก่:

## ลักษณะของสิ่งมีชีวิต

1. **การเจริญเติบโต** - สิ่งมีชีวิตทุกชนิดมีการเจริญเติบโต เช่น เด็กโตเป็นผู้ใหญ่ ต้นกล้าโตเป็นต้นไม้
2. **การสืบพันธุ์** - สามารถสร้างลูกหลานเพื่อดำรงเผ่าพันธุ์ต่อไป เช่น แม่ไก่ออกไข่ แมวออกลูก
3. **การตอบสนองต่อสิ่งเร้า** - สิ่งมีชีวิตตอบสนองต่อสิ่งแวดล้อม เช่น ดอกไม้หุบยามกลางคืน
4. **การเคลื่อนที่** - สิ่งมีชีวิตส่วนใหญ่สามารถเคลื่อนที่ได้ เช่น คนเดิน ปลาว่ายน้ำ
5. **การหายใจ** - ใช้ออกซิเจนในการดำรงชีวิต
6. **การขับถ่าย** - กำจัดของเสียออกจากร่างกาย

## ตัวอย่างสิ่งมีชีวิต
- คน สัตว์ พืช จุลินทรีย์
- แมว สุนัข นก ปลา ผีเสื้อ
- ต้นไม้ ดอกไม้ สาหร่าย`, summary: 'รู้จักคำจำกัดความและลักษณะของสิ่งมีชีวิต', media_type: 'youtube' as const, media_url: 'https://www.youtube.com/watch?v=8nJBBqjRJ4o', difficulty: 1, estimated_minutes: 15, view_count: 156, is_published: true },
  // ===== ป.1 - สิ่งมีชีวิตกับสิ่งแวดล้อม =====
  { id: 2, subject_unit_id: 1, title: 'สิ่งแวดล้อมรอบตัว', content: '# สิ่งแวดล้อมรอบตัว\n\nสิ่งแวดล้อม คือ สิ่งต่างๆ ที่อยู่รอบตัวเรา แบ่งเป็น 2 ประเภท:\n\n## 1. สิ่งแวดล้อมธรรมชาติ\n- แม่น้ำ ลำคลอง ทะเล\n- ป่าไม้ ภูเขา\n- อากาศ ดวงอาทิตย์\n\n## 2. สิ่งแวดล้อมเทียม (ที่มนุษย์สร้าง)\n- อาคาร บ้านเรือน\n- ถนน สะพาน\n- รถยนต์ เครื่องจักร', summary: 'รู้จักสิ่งแวดล้อมธรรมชาติและเทียม', media_type: 'pdf' as const, media_url: 'https://www.ael.or.th/wp-content/uploads/2020/07/sample-pdf.pdf', difficulty: 1, estimated_minutes: 15, view_count: 120, is_published: true },
  // ===== ป.1 - วัสดุรอบตัว =====
  { id: 3, subject_unit_id: 2, title: 'รู้จักวัสดุรอบตัว', content: '# วัสดุรอบตัว\n\nวัสดุ คือ สิ่งที่นำมาใช้ทำสิ่งของต่างๆ แบ่งเป็นหลายประเภท:\n\n## ประเภทของวัสดุ\n\n### โลหะ\n- เหล็ก ทองแดง อลูมิเนียม\n- นำความร้อนได้ดี แข็งแรง\n\n### ไม้\n- ไม้เนื้ออ่อน ไม้เนื้อแข็ง\n- ใช้ทำเฟอร์นิเจอร์ บ้านเรือน\n\n### พลาสติก\n- เบา ทนน้ำ ราคาถูก\n- ใช้ทำภาชนะ ของเล่น\n\n### แก้ว\n- โปร่งใส แตกง่าย\n- ใช้ทำหน้าต่าง แก้วน้ำ', summary: 'รู้จักวัสดุที่ใช้ในชีวิตประจำวัน', media_type: 'none' as const, difficulty: 1, estimated_minutes: 20, view_count: 98, is_published: true },
  // ===== ป.2 - สิ่งมีชีวิต =====
  { id: 5, subject_unit_id: 3, title: 'รู้จักสิ่งมีชีวิต', content: '# สิ่งมีชีวิต\n\nสิ่งมีชีวิตมีหลาย.types แบ่งออกเป็นกลุ่มใหญ่ๆ:\n\n## 1. พืช\n- ดอกไม้ ต้นไม้ หญ้า\n- ผลิตอาหารเองได้ (สังเคราะห์ด้วยแสง)\n- ไม่สามารถเคลื่อนที่ได้\n\n## 2. สัตว์\n- สัตว์บก แมว สุนัข ช้าง\n- สัตว์น้ำ ปลา วาฬ กุ้ง\n- สัตว์ปีก นก ผีเสื้อ\n\n## 3. จุลินทรีย์\n- แบคทีเรีย ไวรัส\n- มองด้วยตาเปล่าไม่เห็น\n- ทั้งมีประโยชน์และมีโทษ', summary: 'รู้จักชนิดของสิ่งมีชีวิต ได้แก่ พืช สัตว์ จุลินทรีย์', media_type: 'none' as const, difficulty: 1, estimated_minutes: 20, view_count: 145, is_published: true },
  // ===== ป.3 - ร่างกายกับการเจริญเติบโต =====
  { id: 6, subject_unit_id: 4, title: 'การเจริญเติบโตของร่างกาย', content: '# การเจริญเติบโตของร่างกาย\n\nร่างกายของคนเราเปลี่ยนแปลงตลอดเวลา ตั้งแต่เกิดจนเป็นผู้ใหญ่\n\n## ขั้นตอนการเจริญเติบโต\n\n### ทารก (0-1 ปี)\n- น้ำหนักเพิ่มขึ้นอย่างรวดเร็ว\n- เริ่มหัดเดิน หัดพูด\n\n### เด็ก (2-12 ปี)\n- ส่วนสูงเพิ่มขึ้นเรื่อยๆ\n- ฟันน้ำมันหลุด ฟันแท้ขึ้น\n\n### วัยรุ่น (13-19 ปี)\n- เปลี่ยนแปลงของร่างกายมาก\n- เริ่มเป็นผู้ใหญ่\n\n## สิ่งที่ช่วยให้ร่างกายแข็งแรง\n- อาหารที่มีประโยชน์\n- การออกกำลังกาย\n- การพักผ่อนให้เพียงพอ', summary: 'เรียนรู้การเจริญเติบโตของร่างกายมนุษย์', media_type: 'none' as const, difficulty: 1, estimated_minutes: 20, view_count: 132, is_published: true },
  // ===== ป.3 - ของเหลว =====
  { id: 7, subject_unit_id: 5, title: 'คุณสมบัติของของเหลว', content: '# ของเหลว\n\nของเหลวเป็นสถานะของสสารที่มีรูปร่างไม่คงที่ ไหลไปตามภาชนะได้\n\n## คุณสมบัติของของเหลว\n\n### 1. ไหลได้\n- น้ำไหลจากที่สูงลงที่ต่ำ\n- น้ำมันไหลช้าน้ำ\n\n### 2. ไม่มีรูปร่างคงที่\n- ใส่ขวดก็มีรูปทรงขวด\n- ใส่แก้วก็มีรูปทรงแก้ว\n\n### 3. มีปริมาตรคงที่\n- น้ำ 1 ลิตร ใส่ภาชนะใดก็ยังคงเป็น 1 ลิตร\n\n## ตัวอย่างของเหลว\n- น้ำ น้ำมัน น้ำมะนาว\n- นม น้ำปลา น้ำยาล้างจาน', summary: 'เรียนรู้คุณสมบัติของของเหลว', media_type: 'none' as const, difficulty: 1, estimated_minutes: 18, view_count: 110, is_published: true },
  // ===== ป.4 - โลกและอวกาศ =====
  { id: 8, subject_unit_id: 6, title: 'โลก ดวงจันทร์ และดวงอาทิตย์', content: '# โลก ดวงจันทร์ และดวงอาทิตย์\n\n## โลก\n- โลกเป็นดาวเคราะห์ที่เราอาศัยอยู่\n- มีชั้นบรรยากาศห่อหุ้ม\n- หมุนรอบตัวเองใช้เวลา 24 ชั่วโมง = 1 วัน\n- โคจรรอบดวงอาทิตย์ใช้เวลา 365 วัน = 1 ปี\n\n## ดวงจันทร์\n- เป็นบริวารของโลก\n- ไม่มีแสงสว่างในตัว สะท้อนแสงจากดวงอาทิตย์\n- ใช้เวลา 27.3 วัน โคจรรอบโลก 1 รอบ\n\n## ดวงอาทิตย์\n- เป็นดาวฤกษ์ที่ให้แสงและความร้อน\n- มีอุณหภูมิสูงมาก ประมาณ 5,500°C\n- โลกอยู่ห่างจากดวงอาทิตย์ประมาณ 150 ล้าน กม.', summary: 'เรียนรู้เกี่ยวกับโลก ดวงจันทร์ และดวงอาทิตย์', media_type: 'youtube' as const, media_url: 'https://www.youtube.com/watch?v=LIB2KvsmBlM', difficulty: 2, estimated_minutes: 25, view_count: 89, is_published: true },
  // ===== ป.4 - ไฟฟ้า =====
  { id: 9, subject_unit_id: 7, title: 'ไฟฟ้าสถิตและไฟฟ้าวงจร', content: '# ไฟฟ้า\n\n## ไฟฟ้าสถิต\n- เกิดจากการเสียดสีของวัสดุบางชนิด\n- ตัวอย่าง: หวีพลาสติกเสียดสีผม ลูกโป่งเสียดสีเสื้อ\n- มีทั้ง + และ - ดูดซึ่งกันและกัน\n\n## ไฟฟ้าวงจร\n- ไฟฟ้าที่ไหลไปในลวดตัวนำ\n- ต้องมีแหล่งกำเนิดไฟฟ้า (ถ่านไฟฉาย, ปลั๊กไฟ)\n- ต้องมีวงจรปิด (ต่อวงจรครบ)\n\n## อันตรายจากไฟฟ้า\n- อย่าจับสายไฟที่ฉีกขาด\n- อย่าใช้มือเปียกจับอุปกรณ์ไฟฟ้า\n- อย่าเสียบปลั๊กหลายตัวต่อกัน', summary: 'เรียนรู้เกี่ยวกับไฟฟ้าสถิตและไฟฟ้าวงจร', media_type: 'none' as const, difficulty: 2, estimated_minutes: 25, view_count: 156, is_published: true },
  // ===== ป.5 - เนื้อเยื่อพืช =====
  { id: 10, subject_unit_id: 8, title: 'โครงสร้างและหน้าที่ของเนื้อเยื่อพืช', content: '# เนื้อเยื่อพืช\n\nเนื้อเยื่อ คือ กลุ่มเซลล์ที่ทำงานร่วมกัน มีหน้าที่เฉพาะเจาะจง\n\n## ประเภทของเนื้อเยื่อพืช\n\n### 1. เนื้อเยื่อเจริญ (Meristematic Tissue)\n- อยู่ที่ปลายรากและปลายยอด\n- ทำหน้าที่เจริญเติบโต\n\n### 2. เนื้อเยื่อปกคลุม (Dermal Tissue)\n- ผิวเปลือกนอกของพืช\n- ปกป้องส่วนต่างๆ\n\n### 3. เนื้อเยื่อลำเลียง (Vascular Tissue)\n- ท่อลำเลียงน้ำ (Xylem)\n- ท่อลำเลียงอาหาร (Phloem)\n\n### 4. เนื้อเยื่อพื้นฐาน (Ground Tissue)\n- เก็บอาหาร สร้างอาหาร', summary: 'เรียนรู้โครงสร้างเนื้อเยื่อพืช 4 ประเภท', media_type: 'none' as const, difficulty: 2, estimated_minutes: 25, view_count: 98, is_published: true },
  // ===== ป.6 - ปรากฏการณ์ทางธรรมชาติ =====
  { id: 11, subject_unit_id: 9, title: 'ภัยธรรมชาติและการป้องกัน', content: '# ภัยธรรมชาติ\n\nภัยธรรมชาติ คือ ภัยพิบัติที่เกิดขึ้นเองตามธรรมชาติ ก่อให้เกิดความเสียหายต่อชีวิตและทรัพย์สิน\n\n## ประเภทของภัยธรรมชาติ\n\n### 1. น้ำท่วม\n- เกิดจากฝนตกหนักติดต่อกันหลายวัน\n- แม่น้ำล้นเขื่อน\n- **การป้องกัน:** ก่อสร้างเขื่อน ขุดลอกแม่น้ำ\n\n### 2. แผ่นดินไหว\n- เกิดจากการเคลื่อนตัวของเปลือกโลก\n- วัดแรงสั่นสะเทือนเป็นริกเตอร์\n- **การป้องกัน:** สร้างอาคารให้ทนทาน ซ้อมหนีไฟ\n\n### 3. สึนามิ\n- เกิดจากแผ่นดินไหวใต้ทะเล\n- คลื่นขนาดใหญ่ซัดชายฝั่ง\n- **การป้องกัน:** ฟังเตือนภัย วิ่งขึ้นที่สูง\n\n### 4. พายุ\n- พายุโซนร้อน พายุฝนฟ้าคะนอง\n- **การป้องกัน:** หลบในอาคาร ปิดประตูหน้าต่าง', summary: 'เรียนรู้ภัยธรรมชาติและวิธีป้องกัน', media_type: 'none' as const, difficulty: 2, estimated_minutes: 30, view_count: 167, is_published: true },
];

export const mockQuestions: Question[] = [
  // ===== ป.1 - U.1 สิ่งมีชีวิตกับสิ่งแวดล้อม =====
  { id: 1, subject_unit_id: 1, lesson_id: 1, question_text: 'ข้อใดไม่ใช่สิ่งมีชีวิต?', question_type: 'multiple_choice', option_a: 'แมว', option_b: 'ต้นไม้', option_c: 'ก้อนหิน', option_d: 'ปลา', correct_answer: 'C', explanation: 'ก้อนหินไม่ใช่สิ่งมีชีวิต เพราะไม่สามารถเจริญเติบโตและสืบพันธุ์ได้', difficulty: 1, is_active: true },
  { id: 2, subject_unit_id: 1, lesson_id: 1, question_text: 'ข้อใดจัดเป็นสิ่งมีชีวิตได้ถูกต้อง?', question_type: 'multiple_choice', option_a: 'น้ำ', option_b: 'ดิน', option_c: 'ผีเสื้อ', option_d: 'หิน', correct_answer: 'C', explanation: 'ผีเสื้อเป็นสัตว์ที่มีชีวิต สามารถเจริญเติบโต สืบพันธุ์ และตอบสนองต่อสิ่งเร้าได้', difficulty: 1, is_active: true },
  { id: 3, subject_unit_id: 1, lesson_id: 1, question_text: 'ลักษณะใดที่สิ่งมีชีวิตทุกชนิดมีร่วมกัน?', question_type: 'multiple_choice', option_a: 'บินได้', option_b: 'มีสี', option_c: 'หายใจ', option_d: 'ว่ายน้ำได้', correct_answer: 'C', explanation: 'สิ่งมีชีวิตทุกชนิดต้องหายใจเพื่อดำรงชีวิต แม้จะหายใจในรูปแบบที่ต่างกัน', difficulty: 1, is_active: true },
  { id: 4, subject_unit_id: 1, lesson_id: 1, question_text: 'สิ่งแวดล้อมที่มนุษย์สร้างขึ้น เรียกว่าอะไร?', question_type: 'multiple_choice', option_a: 'สิ่งแวดล้อมธรรมชาติ', option_b: 'สิ่งแวดล้อมเทียม', option_c: 'ระบบนิเวศ', option_d: 'บรรยากาศ', correct_answer: 'B', explanation: 'สิ่งแวดล้อมเทียมคือสิ่งแวดล้อมที่มนุษย์สร้างขึ้น เช่น อาคาร ถนน สะพาน', difficulty: 1, is_active: true },
  { id: 5, subject_unit_id: 1, lesson_id: 2, question_text: 'ข้อใดเป็นสิ่งแวดล้อมธรรมชาติ?', question_type: 'multiple_choice', option_a: 'อาคาร', option_b: 'ถนน', option_c: 'แม่น้ำ', option_d: 'รถยนต์', correct_answer: 'C', explanation: 'แม่น้ำเป็นสิ่งแวดล้อมธรรมชาติที่เกิดขึ้นเองตามธรรมชาติ ไม่ได้มนุษย์สร้าง', difficulty: 1, is_active: true },
  // ===== ป.1 - U.2 วัสดุรอบตัว =====
  { id: 6, subject_unit_id: 2, lesson_id: 3, question_text: 'วัสดุใดเป็นโลหะ?', question_type: 'multiple_choice', option_a: 'ไม้', option_b: 'แก้ว', option_c: 'เหล็ก', option_d: 'พลาสติก', correct_answer: 'C', explanation: 'เหล็กเป็นโลหะชนิดหนึ่งที่มีความแข็งแรง นำความร้อนได้ดี', difficulty: 1, is_active: true },
  { id: 7, subject_unit_id: 2, lesson_id: 3, question_text: 'วัสดุใดนำความร้อนได้ดีที่สุด?', question_type: 'multiple_choice', option_a: 'ไม้', option_b: 'เหล็ก', option_c: 'พลาสติก', option_d: 'ผ้า', correct_answer: 'B', explanation: 'โลหะนำความร้อนได้ดีกว่าวัสดุอื่นๆ', difficulty: 1, is_active: true },
  // ===== ป.2 - U.1 สิ่งมีชีวิต =====
  { id: 8, subject_unit_id: 3, lesson_id: 5, question_text: 'สิ่งมีชีวิตกลุ่มใดผลิตอาหารเองได้?', question_type: 'multiple_choice', option_a: 'สัตว์', option_b: 'จุลินทรีย์', option_c: 'พืช', option_d: 'เห็ด', correct_answer: 'C', explanation: 'พืชสามารถสังเคราะห์แสงสร้างอาหารเองได้', difficulty: 1, is_active: true },
  { id: 9, subject_unit_id: 3, lesson_id: 5, question_text: 'ข้อใดเป็นจุลินทรีย์?', question_type: 'multiple_choice', option_a: 'ช้าง', option_b: 'ต้นมะม่วง', option_c: 'แบคทีเรีย', option_d: 'นก', correct_answer: 'C', explanation: 'แบคทีเรียเป็นจุลินทรีย์ที่มองด้วยตาเปล่าไม่เห็น', difficulty: 1, is_active: true },
  // ===== ป.3 - U.1 ร่างกายกับการเจริญเติบโต =====
  { id: 10, subject_unit_id: 4, lesson_id: 6, question_text: 'เด็กอายุ 1 ปี เรียกว่าอะไร?', question_type: 'multiple_choice', option_a: 'ทารก', option_b: 'เด็กเล็ก', option_c: 'วัยรุ่น', option_d: 'ผู้ใหญ่', correct_answer: 'B', explanation: 'เด็กอายุ 2-12 ปี เรียกว่าเด็กเล็ก', difficulty: 1, is_active: true },
  { id: 11, subject_unit_id: 4, lesson_id: 6, question_text: 'สิ่งใดช่วยให้ร่างกายแข็งแรง?', question_type: 'multiple_choice', option_a: 'กินขนมเยอะๆ', option_b: 'นอนดึก', option_c: 'ออกกำลังกาย', option_d: 'เล่นเกมทั้งวัน', correct_answer: 'C', explanation: 'การออกกำลังกายช่วยให้ร่างกายแข็งแรง', difficulty: 1, is_active: true },
  // ===== ป.3 - U.2 ของเหลว =====
  { id: 12, subject_unit_id: 5, lesson_id: 7, question_text: 'ของเหลวมีคุณสมบัติอย่างไร?', question_type: 'multiple_choice', option_a: 'มีรูปร่างคงที่', option_b: 'แข็ง', option_c: 'ไหลได้', option_d: 'ไม่สามารถเปลี่ยนรูปได้', correct_answer: 'C', explanation: 'ของเหลวไหลได้และไม่มีรูปร่างคงที่', difficulty: 1, is_active: true },
  { id: 13, subject_unit_id: 5, lesson_id: 7, question_text: 'น้ำ 1 ลิตร ใส่ขวดทรงกระบอก จะมีปริมาตรเท่าใด?', question_type: 'multiple_choice', option_a: 'ครึ่งลิตร', option_b: '1 ลิตร', option_c: '2 ลิตร', option_d: 'ครึ่งขวด', correct_answer: 'B', explanation: 'ของเหลวมีปริมาตรคงที่ ไม่ว่าจะใส่ภาชนะใด', difficulty: 1, is_active: true },
  // ===== ป.4 - U.1 โลกและอวกาศ =====
  { id: 14, subject_unit_id: 6, lesson_id: 8, question_text: 'โลกใช้เวลาหมุนรอบตัวเองกี่ชั่วโมง?', question_type: 'multiple_choice', option_a: '12 ชั่วโมง', option_b: '24 ชั่วโมง', option_c: '30 วัน', option_d: '365 วัน', correct_answer: 'B', explanation: 'โลกหมุนรอบตัวเอง 1 รอบ ใช้เวลา 24 ชั่วโมง เท่ากับ 1 วัน', difficulty: 2, is_active: true },
  { id: 15, subject_unit_id: 6, lesson_id: 8, question_text: 'ดวงจันทร์มีแสงสว่างเองหรือไม่?', question_type: 'multiple_choice', option_a: 'มีแสงเอง', option_b: 'ไม่มีแสงเอง สะท้อนแสงจากดวงอาทิตย์', option_c: 'ไม่มีแสงเลย', option_d: 'ไม่แน่ใจ', correct_answer: 'B', explanation: 'ดวงจันทร์ไม่มีแสงในตัว แต่สะท้อนแสงจากดวงอาทิตย์มาให้เราเห็น', difficulty: 2, is_active: true },
  // ===== ป.4 - U.2 ไฟฟ้า =====
  { id: 16, subject_unit_id: 7, lesson_id: 9, question_text: 'ไฟฟ้าสถิตเกิดจากอะไร?', question_type: 'multiple_choice', option_a: 'น้ำ', option_b: 'ลม', option_c: 'เสียดสี', option_d: 'ความร้อน', correct_answer: 'C', explanation: 'ไฟฟ้าสถิตเกิดจากการเสียดสีของวัสดุบางชนิด', difficulty: 2, is_active: true },
  { id: 17, subject_unit_id: 7, lesson_id: 9, question_text: 'ข้อใดทำให้เกิดอันตรายจากไฟฟ้า?', question_type: 'multiple_choice', option_a: 'ใช้มือแห้งจับสายไฟ', option_b: 'ใช้มือเปียกจับอุปกรณ์ไฟฟ้า', option_c: 'ปิดไฟก่อนนอน', option_d: 'ชาร์จโทรศัพท์', correct_answer: 'B', explanation: 'น้ำนำไฟฟ้าได้ ไม่ควรใช้มือเปียกจับอุปกรณ์ไฟฟ้า', difficulty: 2, is_active: true },
  // ===== ป.5 - U.1 เนื้อเยื่อพืช =====
  { id: 18, subject_unit_id: 8, lesson_id: 10, question_text: 'ท่อลำเลียงน้ำในพืช เรียกว่าอะไร?', question_type: 'multiple_choice', option_a: 'Phloem', option_b: 'Xylem', option_c: 'Cambium', option_d: 'Epidermis', correct_answer: 'B', explanation: 'Xylem เป็นท่อลำเลียงน้ำจากรากขึ้นไปยังส่วนต่างๆ ของพืช', difficulty: 2, is_active: true },
  { id: 19, subject_unit_id: 8, lesson_id: 10, question_text: 'เนื้อเยื่อเจริญอยู่บริเวณใดของพืช?', question_type: 'multiple_choice', option_a: 'กลางลำต้น', option_b: 'ใต้ดิน', option_c: 'ปลายรากและปลายยอด', option_d: 'ใบ', correct_answer: 'C', explanation: 'เนื้อเยื่อเจริญอยู่ที่ปลายรากและปลายยอด ทำหน้าที่เจริญเติบโต', difficulty: 2, is_active: true },
  // ===== ป.6 - U.1 ปรากฏการณ์ทางธรรมชาติ =====
  { id: 20, subject_unit_id: 9, lesson_id: 11, question_text: 'สึนามิเกิดจากสาเหตุใด?', question_type: 'multiple_choice', option_a: 'ฝนตกหนัก', option_b: 'แผ่นดินไหวใต้ทะเล', option_c: 'ภูเขาไฟระเบิด', option_d: 'พายุเข้า', correct_answer: 'B', explanation: 'สึนามิเกิดจากแผ่นดินไหวใต้ทะเล ทำให้เกิดคลื่นขนาดใหญ่', difficulty: 2, is_active: true },
  { id: 21, subject_unit_id: 9, lesson_id: 11, question_text: 'เมื่อเกิดแผ่นดินไหว ควรทำอย่างไร?', question_type: 'multiple_choice', option_a: 'วิ่งหนีทันที', option_b: 'หลบใต้โต๊ะหรือมุมห้อง', option_c: 'ยืนมองไปรอบๆ', option_d: 'ขึ้นไปบนหลังคา', correct_answer: 'B', explanation: 'เมื่อเกิดแผ่นดินไหว ควรหลบใต้โต๊ะหรือมุมห้องที่แข็งแรง', difficulty: 2, is_active: true },
];

export const mockQuizzes: Quiz[] = [
  { id: 1, lesson_id: 1, subject_unit_id: 1, quiz_title: 'แบบทดสอบ: สิ่งมีชีวิตคืออะไร', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับสิ่งมีชีวิต' },
  { id: 2, lesson_id: 2, subject_unit_id: 1, quiz_title: 'แบบทดสอบ: สิ่งแวดล้อมรอบตัว', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับสิ่งแวดล้อม' },
  { id: 3, lesson_id: 3, subject_unit_id: 2, quiz_title: 'แบบทดสอบ: วัสดุรอบตัว', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับวัสดุ' },
  { id: 4, lesson_id: 5, subject_unit_id: 3, quiz_title: 'แบบทดสอบ: รู้จักสิ่งมีชีวิต', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับสิ่งมีชีวิต ป.2' },
  { id: 5, lesson_id: 6, subject_unit_id: 4, quiz_title: 'แบบทดสอบ: การเจริญเติบโต', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับการเจริญเติบโตของร่างกาย' },
  { id: 6, lesson_id: 7, subject_unit_id: 5, quiz_title: 'แบบทดสอบ: ของเหลว', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับคุณสมบัติของเหลว' },
  { id: 7, lesson_id: 8, subject_unit_id: 6, quiz_title: 'แบบทดสอบ: โลกและอวกาศ', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับโลก ดวงจันทร์ และดวงอาทิตย์' },
  { id: 8, lesson_id: 9, subject_unit_id: 7, quiz_title: 'แบบทดสอบ: ไฟฟ้า', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับไฟฟ้าสถิตและไฟฟ้าวงจร' },
  { id: 9, lesson_id: 10, subject_unit_id: 8, quiz_title: 'แบบทดสอบ: เนื้อเยื่อพืช', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับเนื้อเยื่อพืช' },
  { id: 10, lesson_id: 11, subject_unit_id: 9, quiz_title: 'แบบทดสอบ: ภัยธรรมชาติ', total_questions: 5, passing_score: 70, max_attempts: 3, is_randomized: true, shuffle_options: true, description: 'ทดสอบความเข้าใจเกี่ยวกับภัยธรรมชาติและการป้องกัน' },
];
