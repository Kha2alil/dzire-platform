const db = require('../../config/database');

const getCourseStudentsCount = async (courseId) => {
    const [rows] = await db.query(`SELECT COUNT(DISTINCT student_id) AS count FROM enrollments WHERE course_id = ?`, [courseId]);
    return rows[0].count;
};

const getCourseLessonsCount = async (courseId) => {
    const [rows] = await db.query(`SELECT COUNT(*) AS count FROM lessons WHERE course_id = ?`, [courseId]);
    return rows[0].count;
};

module.exports = { getCourseStudentsCount, getCourseLessonsCount };