const progressRepository = require('../repositories/progressRepository');
const badgeService = require('./badgeService');

/**
 * Handle lesson completion: update aggregates and trigger badge evaluation
 */
const handleLessonCompleted = async (studentId, courseId, lessonId, xpReward) => {
    
    const courseRepository = require('../repositories/courseRepository');
    const course = await courseRepository.findCourseById(courseId);
    
    if (!course || !course.skill_id) {
        return;
    }
    await progressRepository.updateLessonProgress(studentId, course.skill_id, xpReward);

    await badgeService.evaluateAndAwardBadges(studentId, 'lesson_completed');
};

/**
 * Handle course completion: update aggregates and trigger badge evaluation
 */
const handleCourseCompleted = async (studentId, courseId) => {
    const courseRepository = require('../repositories/courseRepository');
    const course = await courseRepository.findCourseById(courseId);
    if (!course || !course.skill_id) return;

    await progressRepository.updateCourseProgress(studentId, course.skill_id, course.difficulty_level);
    await badgeService.evaluateAndAwardBadges(studentId, 'course_completed');

    // Mark intermediate/advanced skill reach
    if (course.difficulty_level === 'intermediate') {
        await progressRepository.markIntermediateSkill(studentId);
    } else if (course.difficulty_level === 'advanced') {
        await progressRepository.markAdvancedSkill(studentId);
    }
};

/**
 * Handle quiz passed: update aggregates and trigger badge evaluation
 */
const handleQuizPassed = async (studentId, assessmentId, score, passed) => {
    if (!passed) return;

    // Get skill_id and assessment type
    const db = require('../config/database');
    const [rows] = await db.query(
        `SELECT c.skill_id, a.type
         FROM assessments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ?`,
        [assessmentId]
    );
    const skillId = rows[0]?.skill_id;
    const assessmentType = rows[0]?.type;
    if (!skillId) return;

    await progressRepository.updateQuizProgress(studentId, skillId, score, passed);

    // New badge-relevant counters
    if (score >= 90) {
        await progressRepository.incrementHighScoreQuizzes(studentId);
    }
    if (assessmentType === 'final_exam') {
        await progressRepository.incrementFinalExamsPassed(studentId);
    }

    await badgeService.evaluateAndAwardBadges(studentId, 'quiz_passed');
};

module.exports = {
    handleLessonCompleted,
    handleCourseCompleted,
    handleQuizPassed
};