const db = require('../config/database');

// ============================================================
// COURSES
// ============================================================

/**
 * إنشاء كورس جديد
 * Create a new course
 */
const createCourse = async (courseData) => {
    const { teacher_id, title, description, subdomain_id, difficulty_level } = courseData;

    const query = `
        INSERT INTO courses (teacher_id, title, description, subdomain_id, difficulty_level)
        VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [teacher_id, title, description, subdomain_id, difficulty_level]);

    // نجلب الكورس كاملاً بعد إنشائه
    // Fetch the full course after creation
    return findCourseById(result.insertId);
};

/**
 * البحث عن كورس بالـ ID
 * Find course by ID
 */
const findCourseById = async (id) => {
    const query = `
        SELECT
            c.id,
            c.teacher_id,
            c.title,
            c.description,
            c.subdomain_id,
            c.difficulty_level,
            c.thumbnail_url,
            c.is_approved,
            c.created_at,
            u.full_name AS teacher_name,
            s.name     AS subdomain_name
        FROM courses c
        JOIN users      u ON c.teacher_id   = u.id
        JOIN subdomains s ON c.subdomain_id = s.id
        WHERE c.id = ?
        LIMIT 1
    `;

    const [rows] = await db.query(query, [id]);
    return rows[0] || null;
};

/**
 * جلب كل كورسات أستاذ معين
 * Get all courses for a specific teacher
 */
const findCoursesByTeacher = async (teacherId) => {
    const query = `
        SELECT
            c.id,
            c.title,
            c.description,
            c.difficulty_level,
            c.thumbnail_url,
            c.is_approved,
            c.created_at,
            s.name AS subdomain_name,
            COUNT(DISTINCT ch.id)  AS chapters_count,
            COUNT(DISTINCT l.id)   AS lessons_count
        FROM courses c
        JOIN subdomains s    ON c.subdomain_id = s.id
        LEFT JOIN chapters ch ON ch.course_id = c.id
        LEFT JOIN lessons  l  ON l.chapter_id = ch.id
        WHERE c.teacher_id = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC
    `;

    const [rows] = await db.query(query, [teacherId]);
    return rows;
};

/**
 * تحديث بيانات الكورس
 * Update course data
 */
const updateCourse = async (id, updateData) => {
    const fields = [];
    const values = [];

    // نبني الـ query ديناميكياً حسب الحقول المُرسلة
    // Build query dynamically based on sent fields
    if (updateData.title !== undefined) {
        fields.push('title = ?');
        values.push(updateData.title);
    }
    if (updateData.description !== undefined) {
        fields.push('description = ?');
        values.push(updateData.description);
    }
    if (updateData.difficulty_level !== undefined) {
        fields.push('difficulty_level = ?');
        values.push(updateData.difficulty_level);
    }

    if (fields.length === 0) return null;

    values.push(id);

    const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) return null;

    return findCourseById(id);
};

/**
 * تحديث صورة الغلاف
 * Update course thumbnail
 */
const updateCourseThumbnail = async (id, thumbnailUrl) => {
    const query = `UPDATE courses SET thumbnail_url = ? WHERE id = ?`;
    const [result] = await db.query(query, [thumbnailUrl, id]);
    return result.affectedRows > 0;
};

/**
 * حذف كورس
 * Delete a course
 */
const deleteCourse = async (id) => {
    const query = `DELETE FROM courses WHERE id = ?`;
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
};

// ============================================================
// CHAPTERS
// ============================================================

/**
 * إنشاء Chapter جديد
 * Create a new chapter
 */
const createChapter = async (courseId, chapterData) => {
    const { title, order_index } = chapterData;

    const query = `
        INSERT INTO chapters (course_id, title, order_index)
        VALUES (?, ?, ?)
    `;

    const [result] = await db.query(query, [courseId, title, order_index]);

    // نجلب بالـ course_id و title بدل insertId
    const [rows] = await db.query(
        'SELECT * FROM chapters WHERE course_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1',
        [courseId, title]
    );
    return rows[0];
};

/**
 * جلب Chapters الكورس بالترتيب
 * Get course chapters in order
 */
const findChaptersByCourse = async (courseId) => {
    const query = `
        SELECT
            ch.id,
            ch.title,
            ch.order_index,
            COUNT(DISTINCT l.id) AS lessons_count,
            COUNT(DISTINCT a.id) AS assessments_count
        FROM chapters ch
        LEFT JOIN lessons     l ON l.chapter_id = ch.id
        LEFT JOIN assessments a ON a.chapter_id = ch.id
        WHERE ch.course_id = ?
        GROUP BY ch.id
        ORDER BY ch.order_index ASC
    `;

    const [rows] = await db.query(query, [courseId]);
    return rows;
};

/**
 * البحث عن Chapter بالـ ID
 * Find chapter by ID
 */
const findChapterById = async (id) => {
    const [rows] = await db.query(
        'SELECT * FROM chapters WHERE id = ? OR id = UUID_TO_BIN(?)',
        [id, id]
    );
    return rows[0] || null;
};
/**
 * حذف Chapter
 * Delete a chapter
 */
const deleteChapter = async (id) => {
    const [result] = await db.query('DELETE FROM chapters WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

// ============================================================
// LESSONS
// ============================================================

/**
 * إنشاء Lesson جديد
 * Create a new lesson
 */
const createLesson = async (chapterId, lessonData, courseId) => {
    const { title, content_type, order_index, duration, is_free, xp_reward } = lessonData;

    const query = `
        INSERT INTO lessons (course_id, chapter_id, title, content_type, order_index, duration, is_free, xp_reward)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
        courseId, chapterId, title, content_type, order_index,
        duration || null, is_free || false, xp_reward || 0
    ]);

    const [rows] = await db.query('SELECT * FROM lessons WHERE chapter_id = ? AND title = ? ORDER BY id DESC LIMIT 1', [chapterId, title]);
    return rows[0];
};

/**
 * تحديث رابط محتوى الدرس (فيديو أو PDF)
 * Update lesson content URL (video or PDF)
 */
const updateLessonContent = async (id, contentUrl) => {
    const query = `UPDATE lessons SET content_url = ? WHERE id = ?`;
    const [result] = await db.query(query, [contentUrl, id]);
    return result.affectedRows > 0;
};

/**
 * جلب Lessons الـ Chapter بالترتيب
 * Get chapter lessons in order
 */
const findLessonsByChapter = async (chapterId) => {
    const query = `
        SELECT id, title, content_type, content_url, order_index, duration, is_free, xp_reward
        FROM lessons
        WHERE chapter_id = ?
        ORDER BY order_index ASC
    `;
    const [rows] = await db.query(query, [chapterId]);
    return rows;
};

/**
 * البحث عن Lesson بالـ ID
 * Find lesson by ID
 */
const findLessonById = async (id) => {
    const [rows] = await db.query('SELECT * FROM lessons WHERE id = ?', [id]);
    return rows[0] || null;
};

/**
 * حذف Lesson
 * Delete a lesson
 */
const deleteLesson = async (id) => {
    const [result] = await db.query('DELETE FROM lessons WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

// ============================================================
// ASSESSMENTS
// ============================================================

/**
 * إنشاء Assessment مع أسئلته
 * Create assessment with its questions
 */
const createAssessment = async (chapterId, assessmentData, courseId) => {
    const { title, type, questions } = assessmentData;

    const [assResult] = await db.query(
        `INSERT INTO assessments (course_id, chapter_id, title, type) VALUES (?, ?, ?, ?)`,
        [courseId, chapterId, title, type]
    );

    // نجلب الـ UUID الحقيقي بدل insertId
    const [assRows] = await db.query(
        'SELECT id FROM assessments WHERE chapter_id = ? AND title = ? ORDER BY id DESC LIMIT 1',
        [chapterId, title]
    );
    const assessmentId = assRows[0].id;

    for (const q of questions) {
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
                q.points || 1,
                q.order_index
            ]
        );
    }

    return findAssessmentById(assessmentId);
};

/**
 * البحث عن Assessment بالـ ID مع أسئلته
 * Find assessment by ID with its questions
 */
const findAssessmentById = async (id) => {

    const [assRows] = await db.query('SELECT * FROM assessments WHERE id = ?', [id]);
    if (!assRows[0]) return null;

    const [questions] = await db.query(
        `SELECT id, question_text, options, correct_answer, socratic_hint, difficulty_level, points, order_index
         FROM questions WHERE assessment_id = ? ORDER BY order_index ASC`,
        [id]
    );

    // نحول options من JSON string لـ Array
    // Convert options from JSON string to Array
    const parsedQuestions = questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    return { ...assRows[0], questions: parsedQuestions };
};

/**
 * جلب Assessments الـ Chapter
 * Get chapter assessments
 */
const findAssessmentsByChapter = async (chapterId) => {
    const [rows] = await db.query(
        `SELECT id, title, type FROM assessments WHERE chapter_id = ?`,
        [chapterId]
    );
    return rows;
};

/**
 * حذف Assessment
 * Delete assessment (الأسئلة تُحذف تلقائياً / questions deleted automatically via CASCADE)
 */
const deleteAssessment = async (id) => {
    const [result] = await db.query('DELETE FROM assessments WHERE id = ?', [id]);
    return result.affectedRows > 0;
};
// ============================================================
// ASSESSMENT EDIT OPERATIONS
// ============================================================

/**
 * تعديل عنوان ونوع الاختبار
 * Update assessment title and type
 */
const updateAssessment = async (assessmentId, updateData) => {
    const fields = [];
    const values = [];

    if (updateData.title !== undefined) {
        fields.push('title = ?');
        values.push(updateData.title);
    }
    if (updateData.type !== undefined) {
        fields.push('type = ?');
        values.push(updateData.type);
    }

    if (fields.length === 0) return null;

    values.push(assessmentId);

    const query = `UPDATE assessments SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    return findAssessmentById(assessmentId);
};

/**
 * تعديل سؤال موجود
 * Update existing question
 */
const updateQuestion = async (questionId, updateData) => {
    const fields = [];
    const values = [];

    if (updateData.question_text !== undefined) {
        fields.push('question_text = ?');
        values.push(updateData.question_text);
    }
    if (updateData.options !== undefined) {
        fields.push('options = ?');
        values.push(JSON.stringify(updateData.options));
    }
    if (updateData.correct_answer !== undefined) {
        fields.push('correct_answer = ?');
        values.push(updateData.correct_answer);
    }
    if (updateData.socratic_hint !== undefined) {
        fields.push('socratic_hint = ?');
        values.push(updateData.socratic_hint);
    }
    if (updateData.difficulty_level !== undefined) {
        fields.push('difficulty_level = ?');
        values.push(updateData.difficulty_level);
    }
    if (updateData.points !== undefined) {
        fields.push('points = ?');
        values.push(updateData.points);
    }

    if (fields.length === 0) return null;

    values.push(questionId);

    const query = `UPDATE questions SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    const [rows] = await db.query('SELECT * FROM questions WHERE id = ?', [questionId]);
    const q = rows[0];
    return { ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options };
};

/**
 * إضافة سؤال جديد لاختبار موجود
 * Add new question to existing assessment
 */
const addQuestion = async (assessmentId, questionData) => {
    const { question_text, options, correct_answer, socratic_hint, difficulty_level, points, order_index } = questionData;

    await db.query(
        `INSERT INTO questions 
         (assessment_id, question_text, options, correct_answer, socratic_hint, difficulty_level, points, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            assessmentId,
            question_text,
            JSON.stringify(options),
            correct_answer,
            socratic_hint || null,
            difficulty_level || 'medium',
            points || 1,
            order_index
        ]
    );

    return findAssessmentById(assessmentId);
};

/**
 * حذف سؤال
 * Delete question
 */
const deleteQuestion = async (questionId) => {
    const [result] = await db.query('DELETE FROM questions WHERE id = ?', [questionId]);
    return result.affectedRows > 0;
};

/**
 * البحث عن سؤال بالـ ID
 * Find question by ID
 */
const findQuestionById = async (id) => {
    const [rows] = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
    return rows[0] || null;
};
/**
 * تعديل بيانات الـ Chapter
 * Update chapter data
 */
const updateChapter = async (chapterId, updateData) => {
    const fields = [];
    const values = [];

    if (updateData.title !== undefined) {
        fields.push('title = ?');
        values.push(updateData.title);
    }
    if (updateData.order_index !== undefined) {
        fields.push('order_index = ?');
        values.push(updateData.order_index);
    }

    if (fields.length === 0) return null;

    values.push(chapterId);

    const query = `UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    const [rows] = await db.query('SELECT * FROM chapters WHERE id = ?', [chapterId]);
    return rows[0] || null;
};

/**
 * تعديل بيانات الـ Lesson
 * Update lesson data
 */
const updateLesson = async (lessonId, updateData) => {
    const fields = [];
    const values = [];

    if (updateData.title !== undefined) {
        fields.push('title = ?');
        values.push(updateData.title);
    }
    if (updateData.content_type !== undefined) {
        fields.push('content_type = ?');
        values.push(updateData.content_type);
    }
    if (updateData.order_index !== undefined) {
        fields.push('order_index = ?');
        values.push(updateData.order_index);
    }
    if (updateData.duration !== undefined) {
        fields.push('duration = ?');
        values.push(updateData.duration);
    }
    if (updateData.is_free !== undefined) {
        fields.push('is_free = ?');
        values.push(updateData.is_free);
    }
    if (updateData.xp_reward !== undefined) {
        fields.push('xp_reward = ?');
        values.push(updateData.xp_reward);
    }

    if (fields.length === 0) return null;

    values.push(lessonId);

    const query = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    const [rows] = await db.query('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    return rows[0] || null;
};
/**
 * البحث عن كورسات الأستاذ
 * Search teacher's courses
 */
const searchCourses = async (teacherId, filters) => {
    let query = `
        SELECT
            c.id,
            c.title,
            c.description,
            c.difficulty_level,
            c.thumbnail_url,
            c.is_approved,
            c.created_at,
            s.name AS subdomain_name
        FROM courses c
        JOIN subdomains s ON c.subdomain_id = s.id
        WHERE c.teacher_id = ?
    `;

    const values = [teacherId];

    // إضافة فلتر الاسم إذا أُرسل
    if (filters.title) {
        query += ` AND c.title LIKE ?`;
        values.push(`%${filters.title}%`);
    }

    // إضافة فلتر المستوى إذا أُرسل
    if (filters.level) {
        query += ` AND c.difficulty_level = ?`;
        values.push(filters.level);
    }

    query += ` ORDER BY c.created_at DESC`;

    const [rows] = await db.query(query, values);
    return rows;
};
// ============================================================
// Exports
// ============================================================
module.exports = {
    // Courses
    createCourse,
    findCourseById,
    findCoursesByTeacher,
    updateCourse,
    updateCourseThumbnail,
    deleteCourse,

    // Chapters
    createChapter,
    findChaptersByCourse,
    findChapterById,
    deleteChapter,

    // Lessons
    createLesson,
    updateLessonContent,
    findLessonsByChapter,
    findLessonById,
    deleteLesson,

    // Assessments
    createAssessment,
    findAssessmentById,
    findAssessmentsByChapter,
    deleteAssessment,
    updateAssessment,
    updateQuestion,
    addQuestion,
    deleteQuestion,
    findQuestionById,
    updateChapter,
    updateLesson,


    searchCourses
};
