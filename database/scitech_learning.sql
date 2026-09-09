-- ============================================================
-- SciTech Learning - MySQL Database Schema
-- ฐานข้อมูลสำหรับแพลตฟอร์มการเรียนรู้วิทยาศาสตร์ออนไลน์
-- ============================================================

CREATE DATABASE IF NOT EXISTS scitech_learning
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE scitech_learning;

-- ============================================================
-- 1) subjects_and_units — เก็บชั้นเรียนและหน่วยการเรียนรู้
-- ============================================================
CREATE TABLE subjects_and_units (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade_level   TINYINT UNSIGNED NOT NULL COMMENT 'ชั้นเรียน 1-6',
  unit_name     VARCHAR(200)    NOT NULL COMMENT 'ชื่อหน่วยการเรียนรู้',
  unit_code     VARCHAR(20)     NULL     COMMENT 'รหัสหน่วย เช่น U.1',
  description   TEXT            NULL     COMMENT 'รายละเอียดหน่วย',
  icon_url      VARCHAR(500)    NULL     COMMENT 'ไอคอนหรือรูปประกอบ',
  sort_order    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_grade (grade_level),
  INDEX idx_active_sort (is_active, sort_order)
) ENGINE=InnoDB;

-- ============================================================
-- 2) lessons — เก็บเนื้อหาบทเรียนและสื่อมัลติมีเดีย
-- ============================================================
CREATE TABLE lessons (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_unit_id BIGINT UNSIGNED NOT NULL COMMENT FK -> subjects_and_units,
  title           VARCHAR(300)    NOT NULL COMMENT 'ชื่อบทเรียน',
  content         LONGTEXT        NOT NULL COMMENT 'เนื้อหาบทเรียน (HTML/Markdown)',
  summary         VARCHAR(500)    NULL     COMMENT 'สรุปเนื้อหาสั้นๆ',
  cover_image     VARCHAR(500)    NULL     COMMENT 'รูปปกบทเรียน',
  media_url       VARCHAR(500)    NULL     COMMENT 'วิดีโอ/สื่อประกอบ',
  media_type      ENUM('image','video','document','none') NOT NULL DEFAULT 'none',
  difficulty      TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1-ง่าย 2-ปานกลาง 3-ยาก',
  estimated_minutes SMALLINT UNSIGNED NULL  COMMENT 'เวลาเรียนโดยประมาณ (นาที)',
  view_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  sort_order      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_published    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (subject_unit_id) REFERENCES subjects_and_units(id) ON DELETE CASCADE,
  INDEX idx_unit (subject_unit_id),
  INDEX idx_published (is_published)
) ENGINE=InnoDB;

-- ============================================================
-- 3) question_bank — เก็บคลังข้อสอบ ตัวเลือก เฉลย และคำอธิบาย
-- ============================================================
CREATE TABLE question_bank (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_unit_id BIGINT UNSIGNED NOT NULL COMMENT FK -> subjects_and_units,
  lesson_id       BIGINT UNSIGNED NULL     COMMENT FK -> lessons (optional),
  question_text   TEXT            NOT NULL COMMENT 'คำถาม',
  question_type   ENUM('multiple_choice','true_false','short_answer') NOT NULL DEFAULT 'multiple_choice',
  option_a        VARCHAR(500)    NULL,
  option_b        VARCHAR(500)    NULL,
  option_c        VARCHAR(500)    NULL,
  option_d        VARCHAR(500)    NULL,
  correct_answer  VARCHAR(10)     NOT NULL COMMENT 'คำตอบที่ถูกต้อง: A/B/C/D',
  explanation     TEXT            NULL     COMMENT 'คำอธิบายเฉลย',
  difficulty      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  tags            VARCHAR(300)    NULL     COMMENT 'แท็กสำหรับค้นหา',
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (subject_unit_id) REFERENCES subjects_and_units(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id)       REFERENCES lessons(id) ON DELETE SET NULL,
  INDEX idx_unit (subject_unit_id),
  INDEX idx_lesson (lesson_id),
  INDEX idx_active (is_active),
  FULLTEXT INDEX ft_question (question_text)
) ENGINE=InnoDB;

-- ============================================================
-- 4) quizzes — เก็บชุดข้อสอบที่เชื่อมกับบทเรียน
-- ============================================================
CREATE TABLE quizzes (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id       BIGINT UNSIGNED NOT NULL COMMENT FK -> lessons,
  subject_unit_id BIGINT UNSIGNED NOT NULL COMMENT FK -> subjects_and_units,
  quiz_title      VARCHAR(300)    NOT NULL COMMENT 'ชื่อชุดข้อสอบ',
  description     TEXT            NULL     COMMENT 'คำอธิบายชุดข้อสอบ',
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'จำนวนข้อสอบทั้งหมด',
  time_limit_minutes SMALLINT UNSIGNED NULL  COMMENT 'จำกัดเวลา (นาที) NULL=ไม่จำกัด',
  passing_score   TINYINT UNSIGNED NOT NULL DEFAULT 70 COMMENT 'เกณฑ์ผ่าน (%)',
  max_attempts    TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'จำนวนครั้งที่ทำได้',
  is_randomized   TINYINT(1)      NOT NULL DEFAULT 1 COMMENT 'สุ่มลำดับข้อสอบ',
  shuffle_options TINYINT(1)      NOT NULL DEFAULT 1 COMMENT 'สุ่มลำดับตัวเลือก',
  is_published    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (lesson_id)       REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_unit_id) REFERENCES subjects_and_units(id) ON DELETE CASCADE,
  INDEX idx_lesson (lesson_id),
  INDEX idx_unit (subject_unit_id)
) ENGINE=InnoDB;

-- ============================================================
-- BONUS: quiz_attempts — บันทึกผลการทำแบบทดสอบของนักเรียน
-- ============================================================
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username        VARCHAR(50)     NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  full_name       VARCHAR(150)    NOT NULL,
  role            ENUM('student','admin','teacher') NOT NULL DEFAULT 'student',
  grade_level     TINYINT UNSIGNED NULL COMMENT 'ชั้นเรียน (student)',
  school_name     VARCHAR(200)    NULL,
  profile_image   VARCHAR(500)    NULL,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX uk_username (username)
) ENGINE=InnoDB;

CREATE TABLE quiz_attempts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  quiz_id         BIGINT UNSIGNED NOT NULL,
  score           DECIMAL(5,2)    NOT NULL COMMENT 'คะแนนเปอร์เซ็นต์',
  total_correct   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_wrong     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  answers_json    JSON            NULL     COMMENT 'คำตอบที่เลือกทั้งหมด',
  time_spent_sec  INT UNSIGNED    NULL     COMMENT 'เวลาที่ใช้ (วินาที)',
  passed          TINYINT(1)      NOT NULL DEFAULT 0,
  started_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP       NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  INDEX idx_user_quiz (user_id, quiz_id)
) ENGINE=InnoDB;

-- ============================================================
-- Sample Data (ข้อมูลตัวอย่าง)
-- ============================================================
INSERT INTO subjects_and_units (grade_level, unit_name, unit_code, description, sort_order) VALUES
(1, 'สิ่งมีชีวิตกับสิ่งแวดล้อม',       'U.1', 'รู้จักสิ่งมีชีวิตและสิ่งแวดล้อมรอบตัว', 1),
(1, 'วัสดุรอบตัว',                     'U.2', 'ศึกษาวัสดุที่พบในชีวิตประจำวัน', 2),
(2, 'สิ่งมีชีวิต',                     'U.1', 'ชนิดของสิ่งมีชีวิตและการดูแล', 1),
(3, 'ร่างกายกับการเจริญเติบโต',         'U.1', 'การเจริญเติบโตของร่างกาย', 1),
(3, 'ของเหลว',                         'U.2', 'คุณสมบัติของของเหลว', 2),
(4, 'โลกและอวกาศ',                     'U.1', 'โลก ดวงจันทร์ และดวงอาทิตย์', 1),
(4, 'ไฟฟ้า',                           'U.2', 'ไฟฟ้าสถิตและไฟฟ้าวงจร', 2),
(5, 'เนื้อเยื่อพืช',                    'U.1', 'โครงสร้างและหน้าที่ของเนื้อเยื่อพืช', 1),
(6, 'ปรากฏการณ์ทางธรรมชาติ',            'U.1', 'ภัยธรรมชาติและการป้องกัน', 1);

-- Sample lessons
INSERT INTO lessons (subject_unit_id, title, content, summary, difficulty, estimated_minutes, is_published) VALUES
(1, 'สิ่งมีชีวิตคืออะไร',     'สิ่งมีชีวิตคือสิ่งที่มีชีวิต เช่น คน สัตว์ พืช...', 'รู้จักคำจำกัดความของสิ่งมีชีวิต', 1, 15, 1),
(1, 'สิ่งแวดล้อมรอบตัว',       'สิ่งแวดล้อมคือสิ่งต่างๆ ที่อยู่รอบตัวเรา...', 'รู้จักสิ่งแวดล้อมธรรมชาติและสิ่งแวดล้อมที่มนุษย์สร้าง', 1, 15, 1),
(2, 'รู้จักวัสดุรอบตัว',       'วัสดุคือสิ่งที่นำมาใช้ทำสิ่งของต่างๆ...', 'รู้จักวัสดุที่ใช้ในชีวิตประจำวัน', 1, 20, 1);

-- Sample questions
INSERT INTO question_bank (subject_unit_id, lesson_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty) VALUES
(1, 1, 'ข้อใดไม่ใช่สิ่งมีชีวิต?', 'แมว', 'ต้นไม้', 'ก้อนหิน', 'ปลา', 'C', 'ก้อนหินไม่ใช่สิ่งมีชีวิต เพราะไม่สามารถเจริญเติบโตและสืบพันธุ์ได้', 1),
(1, 1, 'ข้อใดจัดเป็นสิ่งมีชีวิตได้ถูกต้อง?', 'น้ำ', 'ดิน', 'ผีเสื้อ', 'หิน', 'C', 'ผีเสื้อเป็นสัตว์ที่มีชีวิต สามารถเจริญเติบโต สืบพันธุ์ และตอบสนองต่อสิ่งเร้าได้', 1),
(1, 2, 'สิ่งแวดล้อมที่มนุษย์สร้างขึ้น เรียกว่าอะไร?', 'สิ่งแวดล้อมธรรมชาติ', 'สิ่งแวดล้อมเทียม', 'ระบบนิเวศ', 'บรรยากาศ', 'B', 'สิ่งแวดล้อมเทียมคือสิ่งแวดล้อมที่มนุษย์สร้างขึ้น เช่น อาคาร ถนน', 1),
(2, 3, 'วัสดุใดเป็นโลหะ?', 'ไม้', 'แก้ว', 'เหล็ก', 'พลาสติก', 'C', 'เหล็กเป็นโลหะชนิดหนึ่งที่มีความแข็งแรง นำความร้อนได้ดี', 1);

-- Sample quiz
INSERT INTO quizzes (lesson_id, subject_unit_id, quiz_title, total_questions, passing_score, is_randomized) VALUES
(1, 1, 'แบบทดสอบ: สิ่งมีชีวิตคืออะไร', 4, 70, 1);
