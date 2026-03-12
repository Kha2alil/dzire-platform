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
    deleteAssessment
};
