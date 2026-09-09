# 🔧 Pseudo-code: ระบบสุ่มข้อสอบและตรวจคำตอบอัตโนมัติ

---

## 1. ฟังก์ชันสุ่มข้อสอบ (Random Quiz Generator)

```
FUNCTION generateRandomQuiz(lesson_id, num_questions):

    // ดึงข้อสอบทั้งหมดจาก question_bank สำหรับบทเรียนนี้
    all_questions = database.query(
        "SELECT * FROM question_bank 
         WHERE lesson_id = :lesson_id 
         AND is_active = 1"
    )

    // ตรวจสอบว่ามีข้อมูลเพียงพอ
    IF all_questions.length < num_questions THEN
        num_questions = all_questions.length  // ใช้จำนวนที่มี
        log_warning("ข้อสอบไม่เพียงพอ ใช้ " + num_questions + " ข้อ")

    // สุ่มเลือก num_questions ข้อจาก all_questions
    // ใช้ Fisher-Yates Shuffle Algorithm
    shuffled_questions = fisherYatesShuffle(all_questions)
    selected_questions = shuffled_questions.slice(0, num_questions)

    // สร้าง quiz object
    quiz = {
        lesson_id: lesson_id,
        questions: [],
        created_at: NOW()
    }

    FOR EACH question IN selected_questions:
        
        // สุ่มลำดับตัวเลือก (ถ้า is_randomized = true)
        IF quiz.shuffle_options THEN
            options = shuffleOptions(question.option_a, 
                                     question.option_b, 
                                     question.option_c, 
                                     question.option_d)
            
            // บันทึกว่าคำตอบที่ถูกย้ายไปตำแหน่งไหน
            new_correct = options.mapped_answer
        ELSE
            options = [question.option_a, question.option_b, 
                       question.option_c, question.option_d]
            new_correct = question.correct_answer

        END IF

        // เพิ่มคำถามลง quiz (ไม่ส่ง correct_answer ให้ client!)
        quiz.questions.push({
            id: question.id,
            question_text: question.question_text,
            question_type: question.question_type,
            options: options,
            // ⚠️ ไม่ส่ง correct_answer ไปฝั่ง client!
        })

    END FOR

    RETURN quiz
END FUNCTION


FUNCTION fisherYatesShuffle(array):
    // Fisher-Yates algorithm - O(n)
    shuffled = copy(array)
    
    FOR i = shuffled.length - 1 DOWNTO 1:
        j = random_integer(0, i)
        swap(shuffled[i], shuffled[j])
    END FOR
    
    RETURN shuffled
END FUNCTION


FUNCTION shuffleOptions(a, b, c, d):
    options = [
        { label: "A", text: a },
        { label: "B", text: b },
        { label: "C", text: c },
        { label: "D", text: d }
    ]
    shuffled = fisherYatesShuffle(options)
    
    // สร้าง mapping ใหม่
    new_labels = ["A", "B", "C", "D"]
    result = {}
    FOR i = 0 TO 3:
        result[shuffled[i].label] = new_labels[i]
    END FOR
    
    RETURN { options: shuffled, mapped_answer: result[original_correct] }
END FUNCTION
```

---

## 2. ฟังก์ชันตรวจคำตอบอัตโนมัติ (Auto-Grading)

```
FUNCTION gradeQuiz(user_id, quiz_id, user_answers):

    // user_answers = [{ question_id: 1, answer: "B" }, { question_id: 2, answer: "A" }, ...]

    // ดึงข้อมูล quiz จากฐานข้อมูล
    quiz = database.query(
        "SELECT q.*, l.quiz_title 
         FROM quizzes q 
         WHERE q.id = :quiz_id"
    )

    IF quiz IS NULL THEN
        RETURN { error: "ไม่พบชุดข้อสอบนี้" }

    // ดึงเฉลยทั้งหมดจาก question_bank
    correct_answers = database.query(
        "SELECT id, correct_answer, explanation, question_text 
         FROM question_bank 
         WHERE lesson_id = :quiz.lesson_id 
         AND is_active = 1"
    )

    // สร้าง map เพื่อค้นหาเร็ว
    answer_map = {}
    FOR EACH qa IN correct_answers:
        answer_map[qa.id] = {
            correct: qa.correct_answer,
            explanation: qa.explanation,
            question: qa.question_text
        }
    END FOR

    // ตรวจคำตอบทีละข้อ
    total_correct = 0
    total_wrong = 0
    results = []

    FOR EACH user_answer IN user_answers:
        question_id = user_answer.question_id
        user_choice = user_answer.answer
        correct = answer_map[question_id].correct

        is_correct = (user_choice == correct)
        
        IF is_correct THEN
            total_correct = total_correct + 1
        ELSE
            total_wrong = total_wrong + 1
        END IF

        // เก็บผลลัพธ์แต่ละข้อ
        results.push({
            question_id: question_id,
            question: answer_map[question_id].question,
            user_answer: user_choice,
            correct_answer: correct,
            is_correct: is_correct,
            explanation: answer_map[question_id].explanation
        })

    END FOR

    // คำนวณคะแนนเปอร์เซ็นต์
    total_questions = user_answers.length
    score_percentage = (total_correct / total_questions) * 100
    passed = (score_percentage >= quiz.passing_score)

    // บันทึกผลลง quiz_attempts
    attempt = {
        user_id: user_id,
        quiz_id: quiz_id,
        score: score_percentage,
        total_correct: total_correct,
        total_wrong: total_wrong,
        answers_json: JSON.stringify(user_answers),
        passed: passed,
        completed_at: NOW()
    }

    database.insert("quiz_attempts", attempt)

    // ส่งผลลัพธ์กลับ
    RETURN {
        quiz_title: quiz.quiz_title,
        score: score_percentage,
        total_correct: total_correct,
        total_questions: total_questions,
        passed: passed,
        passing_score: quiz.passing_score,
        results: results,       // รายละเอียดแต่ละข้อพร้อมเฉลย
        time_spent: user_time
    }
END FUNCTION
```

---

## 3. ฟังก์ชันดูประวัติการทำแบบทดสอบ (Quiz History)

```
FUNCTION getQuizHistory(user_id):
    attempts = database.query(
        "SELECT qa.*, q.quiz_title, q.passing_score,
                l.title as lesson_title
         FROM quiz_attempts qa
         JOIN quizzes q ON qa.quiz_id = q.id
         JOIN lessons l ON q.lesson_id = l.id
         WHERE qa.user_id = :user_id
         ORDER BY qa.completed_at DESC
         LIMIT 50"
    )
    
    // คำนวณสถิติรวม
    stats = {
        total_quizzes: attempts.length,
        total_passed: COUNT(attempts WHERE passed = true),
        average_score: AVG(attempts.score),
        best_score: MAX(attempts.score)
    }
    
    RETURN { attempts: attempts, stats: stats }
END FUNCTION
```

---

## 4. ฟังก์ชันสรุปผล (Summary Statistics)

```
FUNCTION getStudentDashboard(user_id):
    
    // นับจำนวนบทเรียนที่เรียนแล้ว
    lessons_read = database.query(
        "SELECT COUNT(DISTINCT lesson_id) as count
         FROM quiz_attempts qa
         JOIN quizzes q ON qa.quiz_id = q.id
         WHERE qa.user_id = :user_id"
    )
    
    // นับจำนวนแบบทดสอบที่ทำแล้ว
    quizzes_taken = database.query(
        "SELECT COUNT(*) as count
         FROM quiz_attempts
         WHERE user_id = :user_id"
    )
    
    // คำนวณคะแนนเฉลี่ย
    avg_score = database.query(
        "SELECT COALESCE(AVG(score), 0) as avg_score
         FROM quiz_attempts
         WHERE user_id = :user_id"
    )
    
    RETURN {
        lessons_read: lessons_read.count,
        quizzes_taken: quizzes_taken.count,
        avg_score: ROUND(avg_score.avg_score, 1)
    }
END FUNCTION
```
