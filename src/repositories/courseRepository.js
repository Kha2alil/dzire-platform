const db = require('../config/database');

// ============================================================
// COURSES
// ============================================================

const createCourse = async (courseData) => {
    const { teacher_id, title, description, subdomain_id, difficulty_level } = courseData;
    const query = `
        INSERT INTO courses (teacher_id, title, description, subdomain_id, difficulty_level)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [teacher_id, title, description, subdomain_id, difficulty_level]);
    return findCourseById(result.insertId);
};

const findCourseById = async (id) => {
    const query = `
        SELECT
            c.id, c.teacher_id, c.title, c.description, c.subdomain_id,
            c.difficulty_level, c.thumbnail_url, c.is_published, c.created_at,
            u.full_name AS teacher_name, s.name AS subdomain_name
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        JOIN subdomains s ON c.subdomain_id = s.id
        WHERE c.id = ?
        LIMIT 1
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0] || null;
};

const findCoursesByTeacher = async (teacherId) => {
    const query = `
        SELECT 
            c.id, c.title, c.description, c.difficulty_level, c.thumbnail_url, 
            c.is_published, c.created_at, s.name AS subdomain_name,
            (SELECT COUNT(*) FROM chapters WHERE course_id = c.id) AS chapters_count,
            (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) AS lessons_count
        FROM courses c
        JOIN subdomains s ON c.subdomain_id = s.id
        WHERE c.teacher_id = ?
        ORDER BY c.created_at DESC
    `;
    const [rows] = await db.query(query, [teacherId]);
    return rows;
};

const updateCourse = async (id, updateData) => {
    const fields = [];
    const values = [];
    if (updateData.title !== undefined) { fields.push('title = ?'); values.push(updateData.title); }
    if (updateData.description !== undefined) { fields.push('description = ?'); values.push(updateData.description); }
    if (updateData.difficulty_level !== undefined) { fields.push('difficulty_level = ?'); values.push(updateData.difficulty_level); }
    if (updateData.is_published !== undefined) { fields.push('is_published = ?'); values.push(updateData.is_published); }

    if (fields.length === 0) return null;
    values.push(id);
    const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(query, values);
    return findCourseById(id);
};

const updateCourseThumbnail = async (id, thumbnailUrl) => {
    const query = `UPDATE courses SET thumbnail_url = ? WHERE id = ?`;
    const [result] = await db.query(query, [thumbnailUrl, id]);
    return result.affectedRows > 0;
};

const deleteCourse = async (id) => {
    const [result] = await db.query(`DELETE FROM courses WHERE id = ?`, [id]);
    return result.affectedRows > 0;
};

// ============================================================
// CHAPTERS
// ============================================================

const createChapter = async (courseId, chapterData) => {
    const { title, order_index } = chapterData;
    const query = `INSERT INTO chapters (course_id, title, order_index) VALUES (?, ?, ?)`;
    await db.query(query, [courseId, title, order_index]);
    const [rows] = await db.query('SELECT * FROM chapters WHERE course_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1', [courseId, title]);
    return rows[0];
};

const findChaptersByCourse = async (courseId) => {
    const query = `
        SELECT ch.id, ch.title, ch.order_index,
               COUNT(DISTINCT l.id) AS lessons_count,
               COUNT(DISTINCT a.id) AS assessments_count
        FROM chapters ch
        LEFT JOIN lessons l ON l.chapter_id = ch.id
        LEFT JOIN assessments a ON a.chapter_id = ch.id
        WHERE ch.course_id = ?
        GROUP BY ch.id ORDER BY ch.order_index ASC
    `;
    const [rows] = await db.query(query, [courseId]);
    return rows;
};

const findChapterById = async (id) => {
    const [rows] = await db.query('SELECT * FROM chapters WHERE id = ?', [id]);
    return rows[0] || null;
};

const updateChapter = async (chapterId, updateData) => {
    const fields = [];
    const values = [];
    if (updateData.title !== undefined) { fields.push('title = ?'); values.push(updateData.title); }
    if (updateData.order_index !== undefined) { fields.push('order_index = ?'); values.push(updateData.order_index); }
    if (fields.length === 0) return null;
    values.push(chapterId);
    await db.query(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, values);
    return findChapterById(chapterId);
};

const deleteChapter = async (id) => {
    const [result] = await db.query('DELETE FROM chapters WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

// ============================================================
// LESSONS
// ============================================================

const createLesson = async (chapterId, lessonData, courseId) => {
    const { title, order_index, duration, is_free, xp_reward, summary_text } = lessonData;
    const query = `
        INSERT INTO lessons (course_id, chapter_id, title, order_index, duration, is_free, xp_reward, summary_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [courseId, chapterId, title, order_index, duration || null, is_free || false, xp_reward || 0, summary_text || null]);
    const [rows] = await db.query('SELECT * FROM lessons WHERE chapter_id = ? AND title = ? ORDER BY id DESC LIMIT 1', [chapterId, title]);
    return rows[0];
};

/**
 * دالة تحديث المحتوى (فيديو، PDF، نص) - نسخة التصحيح
 */
const updateLessonContent = async (id, contentData) => {
    console.log("🚀 === DEBUG START ===");
    console.log("📍 Lesson ID received:", id);
    console.log("📦 Content Data received:", contentData);

    const fields = [];
    const values = [];
    
    if (contentData.video_url !== undefined) { 
        fields.push('video_url = ?'); 
        values.push(contentData.video_url); 
    }
    if (contentData.pdf_url !== undefined) { 
        fields.push('pdf_url = ?'); 
        values.push(contentData.pdf_url); 
    }
    if (contentData.summary_text !== undefined) { 
        fields.push('summary_text = ?'); 
        values.push(contentData.summary_text); 
    }
    
    if (fields.length === 0) {
        console.log("❌ No fields to update!");
        return false;
    }
    
    // لنجرب البحث بالـ ID كنص أولاً (كما يفعل UUID عادة)
    const query = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ? OR id = UUID_TO_BIN(?)`;
    values.push(id);
    values.push(id);
    
    console.log("📜 SQL Query:", query);
    console.log("🔢 SQL Values:", values);

    const [result] = await db.query(query, values);
    
    console.log("📊 DB Update Result:", result);
    console.log("🚀 === DEBUG END ===");
    
    return result.affectedRows > 0;
};

const updateLesson = async (lessonId, updateData) => {
    const fields = [];
    const values = [];
    const allowed = ['title', 'order_index', 'duration', 'is_free', 'xp_reward', 'summary_text', 'video_url', 'pdf_url', 'content_type'];
    allowed.forEach(key => {
        if (updateData[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(updateData[key]);
        }
    });
    if (fields.length === 0) return null;
    values.push(lessonId);
    await db.query(`UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`, values);
    return findLessonById(lessonId);
};

const findLessonsByChapter = async (chapterId) => {
    const query = `SELECT * FROM lessons WHERE chapter_id = ? ORDER BY order_index ASC`;
    const [rows] = await db.query(query, [chapterId]);
    return rows;
};

const findLessonById = async (id) => {
    const [rows] = await db.query('SELECT * FROM lessons WHERE id = ?', [id]);
    return rows[0] || null;
};

const deleteLesson = async (id) => {
    const [result] = await db.query('DELETE FROM lessons WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

/// ============================================================
// ASSESSMENTS
// ============================================================

const createAssessment = async (chapterId, assessmentData, courseId) => {
    // 💡 التعديل هنا: استخراج passing_score من البيانات
    const { title, type, passing_score, questions } = assessmentData;
    
    // 1. إنشاء الاختبار الأساسي (أضفنا passing_score إلى الاستعلام)
    const finalScore = passing_score || 50; // إذا لم يرسل المعلم قيمة، نضع 50 كافتراضي
    await db.query(
        `INSERT INTO assessments (course_id, chapter_id, title, type, passing_score) VALUES (?, ?, ?, ?, ?)`, 
        [courseId, chapterId, title, type, finalScore]
    );
    
    const [assRows] = await db.query('SELECT id FROM assessments WHERE chapter_id = ? AND title = ? ORDER BY id DESC LIMIT 1', [chapterId, title]);
    const assessmentId = assRows[0].id;

    // 2. إذا تم إرسال أسئلة أثناء الإنشاء، نضيفها باستخدام الدالة المخصصة لذلك
    if (questions && Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
            await addQuestion(assessmentId, q);
        }
    }
    return findAssessmentById(assessmentId);
};

const findAssessmentById = async (id) => {
    const [assRows] = await db.query('SELECT * FROM assessments WHERE id = ?', [id]);
    if (!assRows[0]) return null;
    
    // جلب الأسئلة وتحويل الـ JSON إلى مصفوفة ليفهمها الـ Frontend
    const [questions] = await db.query(`SELECT * FROM questions WHERE assessment_id = ? ORDER BY order_index ASC`, [id]);
    const parsedQuestions = questions.map(q => ({
        ...q, 
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));
    
    return { ...assRows[0], questions: parsedQuestions };
};

// في ملف courseRepository.js - سطر 265 تقريباً
const findAssessmentsByChapter = async (chapterId) => {
    const query = `
        SELECT 
            a.*, 
            COUNT(q.id) as questions_count
        FROM assessments a
        LEFT JOIN questions q ON a.id = q.assessment_id
        WHERE a.chapter_id = ?
        GROUP BY a.id;
    `;
    const [rows] = await db.query(query, [chapterId]);
    return rows;
};

// مثال لما يجب أن يكون عليه الكود في الباك-إند (courseService.js أو ما يشابهه)
async function updateAssessment(assessmentId, data) {
    // 1. تحديث بيانات الاختبار الأساسية (العنوان، النوع، درجة النجاح)
    await db.query(
        "UPDATE assessments SET title = ?, type = ?, passing_score = ? WHERE id = ?",
        [data.title, data.type, data.passing_score, assessmentId]
    );

    // 2. إدارة الأسئلة (السر هنا!)
    if (data.questions && Array.isArray(data.questions)) {
        // أسهل وأضمن طريقة: احذف كل الأسئلة القديمة لهذا الاختبار
        await db.query("DELETE FROM questions WHERE assessment_id = ?", [assessmentId]);

        // ثم أعد إضافة القائمة الجديدة بالكامل (القديم المعدل + الجديد)
        for (const q of data.questions) {
            await db.query(
                "INSERT INTO questions (assessment_id, question_text, options, correct_answer) VALUES (?, ?, ?, ?)",
                [
                    assessmentId, 
                    q.question_text, 
                    JSON.stringify(q.options), // تأكد من تحويل المصفوفة لنص JSON
                    q.correct_answer
                ]
            );
        }
    }
    return { success: true };
}

const deleteAssessment = async (id) => {
    const [result] = await db.query('DELETE FROM assessments WHERE id = ?', [id]);
    return result.affectedRows > 0;
};


// ============================================================
// QUESTIONS
// ============================================================

const addQuestion = async (assessmentId, q) => {
    const query = `
        INSERT INTO questions (assessment_id, question_text, options, correct_answer, socratic_hint, difficulty_level, points, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        assessmentId, 
        q.question_text, 
        JSON.stringify(q.options), // تحويل الخيارات لـ JSON
        q.correct_answer, 
        q.socratic_hint || null, 
        q.difficulty_level || 'medium', 
        q.points || 1, 
        q.order_index || 0
    ];
    
    await db.query(query, values);
    return findAssessmentById(assessmentId); // نعيد الاختبار كاملاً لتحديث الواجهة
};

const updateQuestion = async (questionId, updateData) => {
    const fields = []; const values = [];
    const keys = ['question_text', 'options', 'correct_answer', 'socratic_hint', 'difficulty_level', 'points', 'order_index'];
    
    keys.forEach(k => {
        if (updateData[k] !== undefined) {
            fields.push(`${k} = ?`);
            // تأكد من تحويل الخيارات لـ JSON إذا تم تحديثها
            values.push(k === 'options' ? JSON.stringify(updateData[k]) : updateData[k]);
        }
    });
    
    if (fields.length === 0) return null;
    values.push(questionId);
    await db.query(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, values);
    
    return findQuestionById(questionId);
};

const deleteQuestion = async (id) => {
    const [result] = await db.query('DELETE FROM questions WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

const findQuestionById = async (id) => {
    const [rows] = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
    if (!rows[0]) return null;
    
    const q = rows[0];
    return { ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options };
};

const findQuestionsByAssessmentId = async (assessmentId) => {
    const [rows] = await db.query(
        "SELECT * FROM questions WHERE assessment_id = ? ORDER BY id ASC", 
        [assessmentId]
    );
    return rows;
};

const searchCourses = async (teacherId, filters) => {
    let query = `SELECT c.*, s.name AS subdomain_name FROM courses c JOIN subdomains s ON c.subdomain_id = s.id WHERE c.teacher_id = ?`;
    const values = [teacherId];
    if (filters.title) { query += ` AND c.title LIKE ?`; values.push(`%${filters.title}%`); }
    if (filters.level) { query += ` AND c.difficulty_level = ?`; values.push(filters.level); }
    query += ` ORDER BY c.created_at DESC`;
    const [rows] = await db.query(query, values);
    return rows;
};

module.exports = {
    createCourse, findCourseById, findCoursesByTeacher, updateCourse, updateCourseThumbnail, deleteCourse,
    createChapter, findChaptersByCourse, findChapterById, updateChapter, deleteChapter,
    createLesson, updateLesson, updateLessonContent, findLessonsByChapter, findLessonById, deleteLesson,
    createAssessment, findAssessmentById, findAssessmentsByChapter, updateAssessment, deleteAssessment,
    updateQuestion, addQuestion, deleteQuestion, findQuestionById, searchCourses, findQuestionsByAssessmentId
};