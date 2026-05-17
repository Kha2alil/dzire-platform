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
                total_quizzes_passed, perfect_quiz_count,
                skills_unlocked_count, high_score_quizzes,
                final_exams_passed, has_intermediate_skill, has_advanced_skill
         FROM gamification_stats WHERE student_id = ?`,
        [studentId]
    );
    return rows[0] || null;
};

/**
 * Increment skills unlocked counter
 */
const incrementSkillsUnlockedCount = async (studentId) => {
    await db.query(
        `UPDATE gamification_stats
         SET skills_unlocked_count = skills_unlocked_count + 1
         WHERE student_id = ?`,
        [studentId]
    );
};

/**
 * Increment high-score quiz counter (score >= 90%)
 */
const incrementHighScoreQuizzes = async (studentId) => {
    await db.query(
        `UPDATE gamification_stats
         SET high_score_quizzes = high_score_quizzes + 1
         WHERE student_id = ?`,
        [studentId]
    );
};

/**
 * Increment final exams passed counter
 */
const incrementFinalExamsPassed = async (studentId) => {
    await db.query(
        `UPDATE gamification_stats
         SET final_exams_passed = final_exams_passed + 1
         WHERE student_id = ?`,
        [studentId]
    );
};

/**
 * Mark that the student has reached intermediate level in at least one skill
 */
const markIntermediateSkill = async (studentId) => {
    await db.query(
        `UPDATE gamification_stats
         SET has_intermediate_skill = TRUE
         WHERE student_id = ? AND has_intermediate_skill = FALSE`,
        [studentId]
    );
};

/**
 * Mark that the student has reached advanced level in at least one skill
 */
const markAdvancedSkill = async (studentId) => {
    await db.query(
        `UPDATE gamification_stats
         SET has_advanced_skill = TRUE
         WHERE student_id = ? AND has_advanced_skill = FALSE`,
        [studentId]
    );
};

const incrementPerfectQuizCount = async (studentId) => {
    await db.query(
        `UPDATE gamification_stats
         SET perfect_quiz_count = perfect_quiz_count + 1
         WHERE student_id = ?`,
        [studentId]
    );
};


module.exports = {
    updateLessonProgress,
    updateCourseProgress,
    updateQuizProgress,
    getUserSkillProgress,
    getUserGlobalStats,
    incrementSkillsUnlockedCount,
    incrementHighScoreQuizzes,
    incrementFinalExamsPassed,
    markIntermediateSkill,
    markAdvancedSkill,
    incrementPerfectQuizCount
};