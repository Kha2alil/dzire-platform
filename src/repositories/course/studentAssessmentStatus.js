const db = require('../../config/database');

const hasStudentPassedAssessment = async (studentId, assessmentId) => {
    try {
        const [rows] = await db.query(
            `SELECT passed FROM student_assessments WHERE student_id = ? AND assessment_id = ? ORDER BY attempted_at DESC LIMIT 1`,
            [studentId, assessmentId]
        );
        return rows.length > 0 && rows[0].passed === 1;
    } catch (error) {
        console.error("Error in hasStudentPassedAssessment:", error);
        return false;
    }
};

const getStudentAssessmentStatus = async (studentId, assessmentId) => {
    const [rows] = await db.query(
        `SELECT passed, score FROM student_assessments WHERE student_id = ? AND assessment_id = ? ORDER BY attempted_at DESC LIMIT 1`,
        [studentId, assessmentId]
    );
    if (rows.length === 0) return { has_attempted: false, last_passed: false, last_score: null };
    return { has_attempted: true, last_passed: rows[0].passed === 1, last_score: rows[0].score };
};

module.exports = { hasStudentPassedAssessment, getStudentAssessmentStatus };