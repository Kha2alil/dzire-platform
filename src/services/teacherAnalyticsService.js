const courseRepository = require('../repositories/courseRepository');

const getFailurePoints = async (teacherId, limit = 5) => {
    const rows = await courseRepository.getTeacherFailurePoints(teacherId, limit);
    return rows.map(row => {
        const total = Number(row.total_students) || 0;
        const failed = Number(row.failed_students) || 0;
        return {
            assessment_id: row.assessment_id,
            assessment_title: row.assessment_title,
            course_id: row.course_id,
            course_title: row.course_title,
            total_students: total,
            failed_students: failed,
            failure_rate: total > 0 ? Math.round((failed / total) * 100) : 0
        };
    });
};

const getStudentsForAssessment = async (assessmentId, teacherId) => {
  const rows = await courseRepository.getStudentsByAssessment(assessmentId, teacherId);
  return rows.map(r => ({
    student_id: r.student_id,
    full_name: r.full_name,
    attempts: r.attempts,
    last_attempt: r.last_attempt
  }));
};

const getAssessments = async (teacherId) => {
    const rows = await courseRepository.getTeacherAssessments(teacherId);
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        type: row.type,
        passing_score: row.passing_score,
        xp_reward: row.xp_reward,
        course_id: row.course_id,
        course_title: row.course_title,
        questions_count: row.questions_count,
        avg_score: Math.round(row.avg_score),
        students_attempted: row.students_attempted
    }));
};

const countFailurePoints = async (teacherId) => {
    const rows = await courseRepository.getTeacherFailurePoints(teacherId, 9999); // fetch all
    return rows.filter(row => Number(row.failed_students) > 0).length;
};

module.exports = {
    getFailurePoints,
    getStudentsForAssessment,
    getAssessments,
    countFailurePoints
};
