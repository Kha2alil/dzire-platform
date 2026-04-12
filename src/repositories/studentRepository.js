const db = require('../config/database');

/**
 * البحث عن طلاب الأستاذ
 * Search teacher's students
 */
const searchStudents = async (teacherId, filters) => {
    let query = `
        SELECT DISTINCT
            u.id,
            u.full_name,
            u.email,
            g.total_xp,
            g.current_level,
            g.rank
        FROM users u
        JOIN enrollments e ON e.student_id = u.id
        JOIN courses c     ON c.id = e.course_id
        LEFT JOIN gamification_stats g ON g.student_id = u.id
        WHERE c.teacher_id = ?
        AND u.role = 'student'
    `;

    const values = [teacherId];

    // إضافة فلتر الاسم إذا أُرسل
    if (filters.name) {
        query += ` AND u.full_name LIKE ?`;
        values.push(`%${filters.name}%`);
    }

    // إضافة فلتر المستوى إذا أُرسل
    if (filters.level) {
        query += ` AND g.current_level = ?`;
        values.push(filters.level);
    }

    query += ` ORDER BY u.full_name ASC`;

    const [rows] = await db.query(query, values);
    return rows;
};
const enrollStudent = async (studentId, courseId) => {
    const query = `
        INSERT INTO enrollments (student_id, course_id, progress_percentage, status, enrolled_at)
        VALUES (?, ?, 0, 'active', NOW())
    `;
    const [result] = await db.query(query, [studentId, courseId]);
    return result.insertId;
};

/**
 * التحقق مما إذا كان الطالب مسجلاً بالفعل
 */
const findEnrollment = async (studentId, courseId) => {
    const query = `SELECT * FROM enrollments WHERE student_id = ? AND course_id = ? LIMIT 1`;
    const [rows] = await db.query(query, [studentId, courseId]);
    return rows[0];
};

module.exports = { searchStudents , enrollStudent, findEnrollment };