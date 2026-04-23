const db = require('../config/database');

/**
 * Update or insert user skill progress when a lesson is completed
 */
const updateLessonProgress = async (studentId, skillId, xpReward) => {
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [skillResult] = await connection.query(
            `INSERT INTO user_skill_progress (student_id, skill_id, total_xp, lessons_completed)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
                 total_xp = total_xp + VALUES(total_xp),
                 lessons_completed = lessons_completed + 1`,
            [studentId, skillId, xpReward]
        );

        const [globalResult] = await connection.query(
            `UPDATE gamification_stats
             SET total_lessons_completed = total_lessons_completed + 1
             WHERE student_id = ?`,
            [studentId]
        );
        
        if (globalResult.affectedRows === 0) {
            console.warn('⚠️ [DB] No row updated in gamification_stats for student:', studentId);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Update progress when a course is completed
 */
const updateCourseProgress = async (studentId, skillId, courseLevel) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const tierColumn = courseLevel === 'beginner' ? 'beginner_courses' :
                          courseLevel === 'intermediate' ? 'intermediate_courses' : 'advanced_courses';

        await connection.query(
            `INSERT INTO user_skill_progress (student_id, skill_id, courses_completed, highest_course_level, ${tierColumn})
             VALUES (?, ?, 1, ?, 1)
             ON DUPLICATE KEY UPDATE
                 courses_completed = courses_completed + 1,
                 highest_course_level = IF(
                     FIELD(VALUES(highest_course_level), 'beginner','intermediate','advanced') >
                     FIELD(highest_course_level, 'beginner','intermediate','advanced'),
                     VALUES(highest_course_level),
                     highest_course_level
                 ),
                 ${tierColumn} = ${tierColumn} + 1`,
            [studentId, skillId, courseLevel]
        );

        await connection.query(
            `UPDATE gamification_stats
             SET total_courses_completed = total_courses_completed + 1
             WHERE student_id = ?`,
            [studentId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Update progress when a quiz is passed
 */
const updateQuizProgress = async (studentId, skillId, score, passed) => {
    if (!passed) return; // Only track passed quizzes

    const isPerfect = score >= 100;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Upsert user_skill_progress
        await connection.query(
            `INSERT INTO user_skill_progress (student_id, skill_id, quizzes_passed, avg_quiz_score)
             VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE
                 quizzes_passed = quizzes_passed + 1,
                 avg_quiz_score = (avg_quiz_score * quizzes_passed + VALUES(avg_quiz_score)) / (quizzes_passed + 1)`,
            [studentId, skillId, score]
        );

        // Update global stats
        await connection.query(
            `UPDATE gamification_stats
             SET total_quizzes_passed = total_quizzes_passed + 1,
                 perfect_quiz_count = perfect_quiz_count + ?
             WHERE student_id = ?`,
            [isPerfect ? 1 : 0, studentId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Get user's aggregated progress for a specific skill
 */
const getUserSkillProgress = async (studentId, skillId) => {
    const [rows] = await db.query(
        `SELECT * FROM user_skill_progress WHERE student_id = ? AND skill_id = ?`,
        [studentId, skillId]
    );
    return rows[0] || null;
};

/**
 * Get user's global stats
 */
const getUserGlobalStats = async (studentId) => {
    const [rows] = await db.query(
        `SELECT total_xp, total_lessons_completed, total_courses_completed,
                total_quizzes_passed, perfect_quiz_count
         FROM gamification_stats WHERE student_id = ?`,
        [studentId]
    );
    return rows[0] || null;
};

module.exports = {
    updateLessonProgress,
    updateCourseProgress,
    updateQuizProgress,
    getUserSkillProgress,
    getUserGlobalStats
};