const db = require('../../config/database');

const searchCourses = async (teacherId, filters) => {
    let query = `SELECT c.*, s.name AS subdomain_name FROM courses c JOIN subdomains s ON c.subdomain_id = s.id WHERE c.teacher_id = ?`;
    const values = [teacherId];
    if (filters.title) { query += ` AND c.title LIKE ?`; values.push(`%${filters.title}%`); }
    if (filters.level) { query += ` AND c.difficulty_level = ?`; values.push(filters.level); }
    query += ` ORDER BY c.created_at DESC`;
    const [rows] = await db.query(query, values);
    return rows;
};

const getAllChapters = async (courseId) => {
    const query = `SELECT * FROM chapters WHERE course_id = ? ORDER BY order_index ASC`;
    const [rows] = await db.query(query, [courseId]);
    return rows;
};

const getAssessmentResult = async (studentId, chapterId) => {
    const query = `SELECT sa.score, a.passing_score FROM student_assessments sa JOIN assessments a ON sa.assessment_id = a.id WHERE sa.student_id = ? AND a.chapter_id = ? ORDER BY sa.id DESC LIMIT 1`;
    const [rows] = await db.query(query, [studentId, chapterId]);
    if (rows.length === 0) return null;
    const result = rows[0];
    return { score: result.score, passing_score: result.passing_score, status: result.score >= result.passing_score ? 'passed' : 'failed' };
};

const getLessonsByChapter = async (chapterId) => {
    const [rows] = await db.query("SELECT id, title, order_index, is_free, xp_reward FROM lessons WHERE chapter_id = ? ORDER BY order_index", [chapterId]);
    return rows;
};

const getLessonById = async (lessonId) => {
    const [rows] = await db.query(`SELECT id, title, video_url, pdf_url, summary_text, content_type, content_url, order_index, xp_reward FROM lessons WHERE id = ?`, [lessonId]);
    return rows[0];
};

const getTotalCourseLessons = async (courseId) => {
    const [rows] = await db.query("SELECT COUNT(*) as total FROM lessons WHERE course_id = ?", [courseId]);
    return rows[0].total || 0;
};

const getEnrollmentData = async (studentId, courseId) => {
    const [rows] = await db.query("SELECT progress_percentage FROM enrollments WHERE student_id = ? AND course_id = ?", [studentId, courseId]);
    return rows[0];
};

const getRawContentsByLesson = async (courseId, chapterId, lessonId) => {
    const query = `SELECT c.*, l.order_index, l.xp_reward FROM contents c JOIN lessons l ON c.lesson_id = l.id WHERE c.lesson_id = ? AND l.chapter_id = ? AND l.course_id = ?`;
    const [rows] = await db.query(query, [lessonId, chapterId, courseId]);
    return rows;
};

const updateStudentXP = async (executor, studentId, xpAmount) => {
    const query = `UPDATE gamification_stats SET total_xp = total_xp + ?, accumulated_xp = accumulated_xp + ?, updated_at = NOW() WHERE student_id = ?`;
    await executor.query(query, [xpAmount, xpAmount, studentId]);
};

const updateEnrollmentProgress = async (executor, studentId, courseId, lessonOrderIndex) => {
    const [rows] = await executor.query("SELECT COUNT(*) as total FROM lessons WHERE course_id = ?", [courseId]);
    const totalLessons = rows[0].total || 1;
    const progressStep = 100 / totalLessons;
    const updateQuery = `UPDATE enrollments SET progress_percentage = LEAST((? * ?), 100), last_completed_order = ? WHERE student_id = ? AND course_id = ? AND last_completed_order < ?`;
    const [result] = await executor.query(updateQuery, [lessonOrderIndex, progressStep, lessonOrderIndex, studentId, courseId, lessonOrderIndex]);
    return result.affectedRows > 0;
};

const checkLessonBelongsToChapter = async (lessonId, chapterId) => {
    const query = `SELECT id FROM lessons WHERE id = ? AND chapter_id = ?`;
    const [rows] = await db.query(query, [lessonId, chapterId]);
    return rows.length > 0;
};

const findAvailableCourses = async (studentId) => {
    const query = `SELECT c.id, c.title, c.description, c.thumbnail_url, c.difficulty_level, u.full_name AS teacher_name, s.name AS subdomain_name FROM courses c LEFT JOIN users u ON c.teacher_id = u.id JOIN subdomains s ON c.subdomain_id = s.id JOIN placement_results pr ON c.subdomain_id = pr.subdomain_id WHERE c.is_published = 1 AND pr.student_id = ? AND FIELD(LOWER(TRIM(c.difficulty_level)), 'beginner', 'intermediate', 'advanced') <= FIELD(LOWER(TRIM(pr.level)), 'beginner', 'intermediate', 'advanced') ORDER BY c.created_at DESC`;
    const [rows] = await db.query(query, [studentId]);
    return rows;
};

const findEnrolledCoursesByStudent = async (studentId) => {
    const query = `SELECT c.id, c.title, c.thumbnail_url, e.progress_percentage, e.last_completed_order, e.status, e.enrolled_at, u.full_name as teacher_name FROM courses c JOIN enrollments e ON c.id = e.course_id JOIN users u ON c.teacher_id = u.id WHERE e.student_id = ?`;
    const [rows] = await db.query(query, [studentId]);
    return rows;
};

const getTeacherStudentCount = async (teacherId) => {
    const query = `SELECT COUNT(DISTINCT e.student_id) AS total_students FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE c.teacher_id = ?`;
    const [rows] = await db.query(query, [teacherId]);
    return rows[0].total_students;
};

const getStudentProgressInCourses = async (teacherId) => {
    const query = `SELECT u.full_name AS Student, c.title AS Course, e.progress_percentage AS Progress, gs.total_xp AS XP, gs.current_level AS Level, gs.updated_at AS Last_Active, e.status AS Status FROM enrollments e JOIN courses c ON e.course_id = c.id JOIN users u ON e.student_id = u.id LEFT JOIN gamification_stats gs ON e.student_id = gs.student_id WHERE c.teacher_id = ? ORDER BY gs.updated_at DESC`;
    const [rows] = await db.query(query, [teacherId]);
    return rows;
};

const findAssessmentByIds = async (assessmentId) => {
    const query = `SELECT a.id, a.course_id, a.chapter_id, a.lesson_id, a.title, a.type, a.passing_score, c.title AS chapter_title, l.title AS lesson_title FROM assessments a LEFT JOIN chapters c ON a.chapter_id = c.id LEFT JOIN lessons l ON a.lesson_id = l.id WHERE a.id = ?`;
    const [rows] = await db.query(query, [assessmentId]);
    return rows[0];
};

const findQuestionsByAssessmentIds = async (assessmentId) => {
    const query = `SELECT id, question_text, options, correct_answer, socratic_hint, difficulty_level, points, order_index FROM questions WHERE assessment_id = ? ORDER BY order_index ASC`;
    const [rows] = await db.query(query, [assessmentId]);
    return rows.map(q => ({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options }));
};

module.exports = {
    searchCourses, getAllChapters, getAssessmentResult, getLessonsByChapter, getLessonById, getTotalCourseLessons,
    getEnrollmentData, getRawContentsByLesson, updateStudentXP, updateEnrollmentProgress, checkLessonBelongsToChapter,
    findAvailableCourses, findEnrolledCoursesByStudent, getTeacherStudentCount, getStudentProgressInCourses,
    findAssessmentByIds, findQuestionsByAssessmentIds
};