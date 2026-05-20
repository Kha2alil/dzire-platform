const db = require('../../config/database');

const getTeacherAssessments = async (teacherId) => {
    const query = `
        SELECT a.id, a.title, a.type, a.passing_score, a.xp_reward,
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
        SELECT a.id AS assessment_id, a.title AS assessment_title,
               c.id AS course_id, c.title AS course_title,
               COUNT(DISTINCT fa.student_id) AS total_students,
               COALESCE(SUM(CASE WHEN fa.passed = 0 THEN 1 ELSE 0 END), 0) AS failed_students
        FROM assessments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN (
            SELECT sa.assessment_id, sa.student_id, sa.passed
            FROM student_assessments sa
            JOIN (
                SELECT assessment_id, student_id, MIN(attempted_at) AS first_attempted
                FROM student_assessments GROUP BY assessment_id, student_id
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
        SELECT sa.student_id, u.full_name, COUNT(sa.id) AS attempts, MAX(sa.attempted_at) AS last_attempt
        FROM student_assessments sa
        JOIN users u ON sa.student_id = u.id
        JOIN assessments a ON sa.assessment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE sa.assessment_id = ? AND c.teacher_id = ?
        GROUP BY sa.student_id, u.full_name
        ORDER BY last_attempt DESC
    `;
    const [rows] = await db.query(query, [assessmentId, teacherId]);
    return rows;
};

module.exports = { getTeacherAssessments, getTeacherFailurePoints, getStudentsByAssessment };