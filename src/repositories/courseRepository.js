const db = require('../config/database');
const { get } = require('../routes/courseRoutes');

// ============================================================
// COURSES
// ============================================================

const createCourse = async (courseData) => {
    const { teacher_id, title, description, subdomain_id, difficulty_level, thumbnail_url, skill_id } = courseData;
    const query = `
        INSERT INTO courses (teacher_id, title, description, subdomain_id, difficulty_level, thumbnail_url, skill_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
        teacher_id,
        title,
        description || null,
        subdomain_id,
        difficulty_level,
        thumbnail_url || null,
        skill_id || null      // ✅ added
    ]);

    // Fetch the created course
    const [rows] = await db.query(
        'SELECT * FROM courses WHERE teacher_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1',
        [teacher_id, title]
    );
    return rows[0];
};

const findCourseById = async (id) => {
    const query = `
        SELECT
            c.id, c.teacher_id, c.title, c.description, c.subdomain_id,
            c.difficulty_level, c.thumbnail_url, c.is_published, c.created_at,
            c.skill_id,                                    -- ✅ ADD THIS
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
    if (updateData.skill_id !== undefined) { fields.push('skill_id = ?'); values.push(updateData.skill_id); } // ✅ added

    if (fields.length === 0) return null;
    values.push(id);

    const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(query, values);
    return findCourseById(id);
};

const updateCourseThumbnail = async (id, thumbnailUrl) => {
    const query = `UPDATE courses SET thumbnail_url = ? WHERE id = ?`;
    const [result] = await db.query(query, [thumbnailUrl, id]);
    console.log('Update result:', result); // add this
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

    let finalOrder = order_index;
    if (finalOrder === undefined || finalOrder === null) {
        // Get the highest order_index for this course
        const [rows] = await db.query(
            'SELECT MAX(order_index) as maxOrder FROM chapters WHERE course_id = ?',
            [courseId]
        );
        finalOrder = (rows[0].maxOrder || 0) + 1;
    }

    const query = `INSERT INTO chapters (course_id, title, order_index) VALUES (?, ?, ?)`;
    await db.query(query, [courseId, title, finalOrder]);

    const [newRows] = await db.query(
        'SELECT * FROM chapters WHERE course_id = ? AND title = ? ORDER BY order_index DESC LIMIT 1',
        [courseId, title]
    );
    return newRows[0];
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

    let finalOrder = order_index;
    if (finalOrder === undefined || finalOrder === null) {
        // Get the highest order_index for lessons in this chapter
        const [rows] = await db.query(
            'SELECT MAX(order_index) as maxOrder FROM lessons WHERE chapter_id = ?',
            [chapterId]
        );
        finalOrder = (rows[0].maxOrder || 0) + 1;
    }

    const query = `
        INSERT INTO lessons (course_id, chapter_id, title, order_index, duration, is_free, xp_reward, summary_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [
        courseId, chapterId, title, finalOrder,
        duration || null, is_free || false, xp_reward || 0, summary_text || null
    ]);

    const [newRows] = await db.query(
        'SELECT * FROM lessons WHERE chapter_id = ? AND title = ? ORDER BY order_index DESC LIMIT 1',
        [chapterId, title]
    );
    return newRows[0];
};

/**
 * دالة تحديث المحتوى (فيديو، PDF، نص) - نسخة التصحيح
 */
const updateLessonContent = async (id, contentData) => {
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

    if (fields.length === 0) return false;

    const query = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ? OR id = UUID_TO_BIN(?)`;
    values.push(id);
    values.push(id);

    const [result] = await db.query(query, values);
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

// repositories/courseRepository.js
const createAssessment = async (chapterId, assessmentData, courseId, lessonId = null) => {
    const { title, type, passing_score, questions } = assessmentData;
    const finalScore = passing_score || 50;

    // ✅ بناء الاستعلام ديناميكياً بناءً على وجود lessonId
    let query;
    let params;
    if (lessonId) {
        query = `
            INSERT INTO assessments (course_id, chapter_id, lesson_id, title, type, passing_score)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        params = [courseId, chapterId, lessonId, title, type, finalScore];
    } else {
        query = `
            INSERT INTO assessments (course_id, chapter_id, title, type, passing_score)
            VALUES (?, ?, ?, ?, ?)
        `;
        params = [courseId, chapterId, title, type, finalScore];
    }
    await db.query(query, params);

    // جلب الـ ID الخاص بالتقييم المُنشأ
    let idQuery;
    let idParams;
    if (lessonId) {
        idQuery = `
            SELECT id FROM assessments
            WHERE course_id = ? AND chapter_id = ? AND lesson_id = ? AND title = ?
            ORDER BY id DESC LIMIT 1
        `;
        idParams = [courseId, chapterId, lessonId, title];
    } else {
        idQuery = `
            SELECT id FROM assessments
            WHERE course_id = ? AND chapter_id = ? AND title = ?
            ORDER BY id DESC LIMIT 1
        `;
        idParams = [courseId, chapterId, title];
    }
    const [assRows] = await db.query(idQuery, idParams);
    const assessmentId = assRows[0].id;

    // إضافة الأسئلة إن وُجدت (نفس الكود القديم)
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
    // 1. تحديث بيانات الاختبار الأساسية (العنوان، النوع، درجة النجاح، lesson_id)
    await db.query(
        `UPDATE assessments 
         SET title = ?, type = ?, passing_score = ?, lesson_id = ?
         WHERE id = ?`,
        [
            data.title,
            data.type,
            data.passing_score,
            data.lesson_id || null,   // ✅ إضافة lesson_id (يمكن أن يكون null)
            assessmentId
        ]
    );

    // 2. إدارة الأسئلة (إذا وُجدت)
    if (data.questions && Array.isArray(data.questions)) {
        // حذف كل الأسئلة القديمة لهذا الاختبار
        await db.query("DELETE FROM questions WHERE assessment_id = ?", [assessmentId]);

        // إعادة إضافة القائمة الجديدة بالكامل
        for (const q of data.questions) {
            await db.query(
                `INSERT INTO questions 
                 (assessment_id, question_text, options, correct_answer, socratic_hint, difficulty_level, points, order_index)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    assessmentId,
                    q.question_text,
                    JSON.stringify(q.options),
                    q.correct_answer,
                    q.socratic_hint || null,
                    q.difficulty_level || 'medium',
                    q.points || 5,
                    q.order_index || 0
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
// 1. جلب كل فصول كورس معين مرتبة حسب order_index
const getAllChapters = async (courseId) => {
    const query = `SELECT * FROM chapters WHERE course_id = ? ORDER BY order_index ASC`;
    const [rows] = await db.query(query, [courseId]);
    return rows;
};
// src/repositories/courseRepository.js
const getAssessmentResult = async (studentId, chapterId) => {
    // قمت بإزالة sa.created_at واستبدالها بـ sa.id للترتيب أو تركها بدون ترتيب
    const query = `
        SELECT sa.score, a.passing_score 
        FROM student_assessments sa
        JOIN assessments a ON sa.assessment_id = a.id
        WHERE sa.student_id = ? AND a.chapter_id = ?
        ORDER BY sa.id DESC LIMIT 1`;

    const [rows] = await db.query(query, [studentId, chapterId]);

    if (rows.length === 0) return null;

    const result = rows[0];

    // نقارن السكور بالدرجة المطلوبة لنحدد الحالة برمجياً
    return {
        score: result.score,
        passing_score: result.passing_score,
        status: result.score >= result.passing_score ? 'passed' : 'failed'
    };
};
// 2. جلب إجمالي دروس الكورس (لأن النسبة المئوية تعتمد على إجمالي الحصص)
const getLessonsByChapter = async (chapterId) => {
    const [rows] = await db.query(
        "SELECT id, title, order_index, is_free, xp_reward FROM lessons WHERE chapter_id = ? ORDER BY order_index",
        [chapterId]
    );
    return rows;
};
const getLessonById = async (lessonId) => {
    const [rows] = await db.query(
        `SELECT id, title, video_url, pdf_url, summary_text, 
                content_type, content_url, order_index, xp_reward 
         FROM lessons WHERE id = ?`,
        [lessonId]
    );
    return rows[0];
};
// 3. جلب عدد الحصص الموجودة في الفصول التي تسبق الفصل الحالي
const getTotalCourseLessons = async (courseId) => {
    const [rows] = await db.query(
        "SELECT COUNT(*) as total FROM lessons WHERE course_id = ?",
        [courseId]
    );
    return rows[0].total || 0;
};

const getEnrollmentData = async (studentId, courseId) => {
    const [rows] = await db.query(
        "SELECT progress_percentage FROM enrollments WHERE student_id = ? AND course_id = ?",
        [studentId, courseId]
    );
    return rows[0];
};

const getRawContentsByLesson = async (courseId, chapterId, lessonId) => {
    const query = `
        SELECT c.*, l.order_index, l.xp_reward 
        FROM contents c
        JOIN lessons l ON c.lesson_id = l.id
        WHERE c.lesson_id = ? AND l.chapter_id = ? AND l.course_id = ?
    `;
    const [rows] = await db.query(query, [lessonId, chapterId, courseId]);
    return rows;
};

const updateStudentXP = async (executor, studentId, xpAmount) => {
    const query = `
        UPDATE gamification_stats 
        SET total_xp = total_xp + ?, 
            accumulated_xp = accumulated_xp + ?, 
            updated_at = NOW() 
        WHERE student_id = ?`;

    await executor.query(query, [xpAmount, xpAmount, studentId]);
};
// ب. تحديث نسبة التقدم في جدول enrollments
const updateEnrollmentProgress = async (executor, studentId, courseId, lessonOrderIndex) => {
    // 1. حساب عدد الدروس الكلي للحفاظ على دقة النسبة المئوية
    const [rows] = await executor.query(
        "SELECT COUNT(*) as total FROM lessons WHERE course_id = ?",
        [courseId]
    );
    const totalLessons = rows[0].total || 1;
    const progressStep = 100 / totalLessons;

    // 2. التحديث الجوهري:
    // نحدث النسبة المئوية و "آخر درس مكتمل" بشرط أن يكون الدرس الحالي أبعد مما وصل إليه الطالب سابقاً
    const updateQuery = `
        UPDATE enrollments 
        SET 
            progress_percentage = LEAST((? * ?), 100),
            last_completed_order = ?
        WHERE student_id = ? 
          AND course_id = ? 
          AND last_completed_order < ?`;
    // الشرط الأخير هو السر: لا تلمس قاعدة البيانات إذا كان الدرس قديماً

    const [result] = await executor.query(updateQuery, [
        lessonOrderIndex, progressStep, // لحساب النسبة بناءً على الترتيب الحالي
        lessonOrderIndex,               // لتحديث آخر درس مكتمل
        studentId,
        courseId,
        lessonOrderIndex                // المقارنة مع الترتيب الحالي
    ]);

    return result.affectedRows > 0;
};

const checkLessonBelongsToChapter = async (lessonId, chapterId) => {
    const query = `SELECT id FROM lessons WHERE id = ? AND chapter_id = ?`;
    const [rows] = await db.query(query, [lessonId, chapterId]);
    return rows.length > 0;
};


// إضافة هذه الدوال في ملف courseRepository.js

// 1. جلب الكورسات المتاحة (المنشورة فقط)
const findAvailableCourses = async (studentId) => {
    const query = `
        SELECT 
            c.id, 
            c.title, 
            c.description, 
            c.thumbnail_url, 
            c.difficulty_level,
            u.full_name AS teacher_name,
            s.name AS subdomain_name
        FROM courses c
        -- تغيير إلى LEFT JOIN لضمان ظهور الكورس حتى لو حدث خلل في حساب المدرس
        LEFT JOIN users u ON c.teacher_id = u.id
        -- ربط المجال الفرعي
        JOIN subdomains s ON c.subdomain_id = s.id
        -- الربط الجوهري مع التقييم
        JOIN placement_results pr ON c.subdomain_id = pr.subdomain_id
        WHERE c.is_published = 1
          AND pr.student_id = ?
          -- استخدام LOWER و TRIM لتجنب مشاكل حالة الأحرف والمسافات الزائدة
          -- شرط المستوى: مستوى الكورس <= مستوى الطالب (في نفس الـ subdomain)
          AND FIELD(LOWER(TRIM(c.difficulty_level)), 'beginner', 'intermediate', 'advanced')
              <= FIELD(LOWER(TRIM(pr.level)), 'beginner', 'intermediate', 'advanced')
        ORDER BY c.created_at DESC
    `;

    const [rows] = await db.query(query, [studentId]);
    return rows;
};
// 2. جلب الكورسات التي سجل فيها طالب معين
const findEnrolledCoursesByStudent = async (studentId) => {
    const query = `
        SELECT 
            c.id, c.title, c.thumbnail_url, 
            c.difficulty_level,
            e.progress_percentage, 
            e.last_completed_order, -- إضافة الحقل هنا
            e.status, e.enrolled_at,
            u.full_name as teacher_name
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        JOIN users u ON c.teacher_id = u.id
        WHERE e.student_id = ?
    `;
    const [rows] = await db.query(query, [studentId]);
    return rows;
};

const getTeacherStudentCount = async (teacherId) => {
    const query = `
        SELECT COUNT(DISTINCT e.student_id) AS total_students
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE c.teacher_id = ?
    `;
    const [rows] = await db.query(query, [teacherId]);
    return rows[0].total_students;
};


const getStudentProgressInCourses = async (teacherId) => {
    const query = `
        SELECT 
            u.full_name AS Student,
            c.title AS Course,
            e.progress_percentage AS Progress, 
            gs.total_xp AS XP,
            gs.current_level AS Level,
            gs.updated_at AS Last_Active,
            e.status AS Status
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON e.student_id = u.id
        -- جلب بيانات الجيمنج الخاصة بكل طالب
        LEFT JOIN gamification_stats gs ON e.student_id = gs.student_id
        -- الفلترة بمعرف الأستاذ وليس الطالب
        WHERE c.teacher_id = ?
        ORDER BY gs.updated_at DESC
    `;
    const [rows] = await db.query(query, [teacherId]);
    return rows;
};


const findAssessmentByIds = async (assessmentId) => {
    const query = `
        SELECT 
            a.id, a.course_id, a.chapter_id, a.lesson_id,
            a.title, a.type, a.passing_score,
            c.title AS chapter_title,
            l.title AS lesson_title
        FROM assessments a
        LEFT JOIN chapters c ON a.chapter_id = c.id
        LEFT JOIN lessons l ON a.lesson_id = l.id
        WHERE a.id = ?
    `;
    const [rows] = await db.query(query, [assessmentId]);
    return rows[0];
};

/**
 * جلب جميع أسئلة تقييم معين (مرتبة حسب order_index)
 */
const findQuestionsByAssessmentIds = async (assessmentId) => {
    const query = `
        SELECT 
            id, question_text, options, correct_answer, 
            socratic_hint, difficulty_level, points, order_index
        FROM questions
        WHERE assessment_id = ?
        ORDER BY order_index ASC
    `;
    const [rows] = await db.query(query, [assessmentId]);
    // تحويل حقل options من JSON (نص) إلى مصفوفة
    return rows.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));
};
const getCourseSubdomain = async (courseId) => {
    const [rows] = await db.query(
        `SELECT s.id, s.name 
         FROM subdomains s
         JOIN courses c ON c.subdomain_id = s.id
         WHERE c.id = ?`,
        [courseId]
    );
    return rows[0] || null;
};

const getTeacherAssessments = async (teacherId) => {
    const query = `
        SELECT 
            a.id, a.title, a.type, a.passing_score, a.xp_reward,
            c.id AS course_id, c.title AS course_title,
            COUNT(q.id) AS questions_count,
            COALESCE(AVG(sa.score), 0) AS avg_score,
            COUNT(DISTINCT sa.student_id) AS students_attempted
        FROM assessments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN questions q ON q.assessment_id = a.id
        LEFT JOIN student_assessments sa ON sa.assessment_id = a.id
        WHERE c.teacher_id = ?
        GROUP BY a.id, a.title, a.type, a.passing_score, a.xp_reward, c.id, c.title
        ORDER BY c.title, a.title
    `;
    const [rows] = await db.query(query, [teacherId]);
    return rows;
};

const getTeacherFailurePoints = async (teacherId, limit = 5) => {
    const query = `
        SELECT 
            a.id AS assessment_id,
            a.title AS assessment_title,
            c.id AS course_id,
            c.title AS course_title,
            COUNT(DISTINCT fa.student_id) AS total_students,
            COALESCE(SUM(CASE WHEN fa.passed = 0 THEN 1 ELSE 0 END), 0) AS failed_students
        FROM assessments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN (
            SELECT sa.assessment_id, sa.student_id, sa.passed
            FROM student_assessments sa
            JOIN (
                SELECT assessment_id, student_id, MIN(attempted_at) AS first_attempted
                FROM student_assessments
                GROUP BY assessment_id, student_id
            ) first_attempt ON sa.assessment_id = first_attempt.assessment_id 
                            AND sa.student_id = first_attempt.student_id 
                            AND sa.attempted_at = first_attempt.first_attempted
        ) fa ON fa.assessment_id = a.id
        WHERE c.teacher_id = ?
        GROUP BY a.id, a.title, c.id, c.title
        HAVING total_students > 0
        ORDER BY failed_students DESC, total_students DESC
        LIMIT ?
    `;
    const [rows] = await db.query(query, [teacherId, limit]);
    return rows;
};

const getStudentsByAssessment = async (assessmentId, teacherId) => {
    const query = `
        SELECT 
            sa.student_id,
            u.full_name,
            COUNT(sa.id) AS attempts,
            MAX(sa.attempted_at) AS last_attempt
        FROM student_assessments sa
        JOIN users u ON sa.student_id = u.id
        JOIN assessments a ON sa.assessment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE sa.assessment_id = ?
            AND c.teacher_id = ?
        GROUP BY sa.student_id, u.full_name
        ORDER BY last_attempt DESC
    `;
    const [rows] = await db.query(query, [assessmentId, teacherId]);
    return rows;
};

// لا تنسَ إضافتهم في module.exports في نهاية الملف
module.exports = {
    createCourse, findCourseById, findCoursesByTeacher, updateCourse, updateCourseThumbnail, deleteCourse,
    createChapter, findChaptersByCourse, findChapterById, updateChapter, deleteChapter,
    createLesson, updateLesson, updateLessonContent, findLessonsByChapter, findLessonById, deleteLesson,
    createAssessment, findAssessmentById, findAssessmentsByChapter, updateAssessment, deleteAssessment,
    updateQuestion, addQuestion, deleteQuestion, findQuestionById, searchCourses, findQuestionsByAssessmentId,
    getAllChapters, getAssessmentResult, getLessonsByChapter, getLessonById, getTotalCourseLessons,
    getEnrollmentData, getRawContentsByLesson, updateStudentXP, updateEnrollmentProgress, checkLessonBelongsToChapter, findAvailableCourses, findEnrolledCoursesByStudent,
    getTeacherStudentCount, getStudentProgressInCourses, findAssessmentByIds, findQuestionsByAssessmentIds, getCourseSubdomain, getTeacherAssessments, getTeacherFailurePoints, getStudentsByAssessment
    
};