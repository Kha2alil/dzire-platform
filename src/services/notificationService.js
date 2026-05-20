const notificationRepo = require('../repositories/notificationRepository');
const db = require('../config/database');
const userRepository = require('../repositories/userRepository');

/**
 * Send a generic notification
 * @param {string} userId - UUID of the recipient
 * @param {string} type - One of: enrollment, achievement, system, assignment, announcement
 * @param {string} title - Short headline
 * @param {string} message - Detailed message
 * @param {string|null} link - Optional URL to navigate when clicked
 * @returns {Promise<void>}
 */
const sendNotification = async (userId, type, title, message, link = null) => {
    await notificationRepo.create({
        user_id: userId,
        type: type,
        title: title,
        message: message,
        link: link
    });
};

// ==================== Specific notification helpers ====================

/**
 * Notify a student when they enroll in a course
 * @param {string} studentId - UUID of the student
 * @param {string} courseTitle - Title of the course enrolled in
 * @returns {Promise<void>}
 */
const notifyEnrollment = async (studentId, courseTitle) => {
    await sendNotification(
        studentId,
        'enrollment',
        '📚 Course Enrolled',
        `You have successfully enrolled in "${courseTitle}".`,
        `/student-courses.html`
    );
};

/**
 * Notify a student when they earn a badge
 * @param {string} studentId - UUID of the student
 * @param {string} badgeName - Name of the badge earned
 * @returns {Promise<void>}
 */
const notifyBadgeEarned = async (studentId, badgeName) => {
    await sendNotification(
        studentId,
        'achievement',
        '🏆 New Badge Earned!',
        `Congratulations! You earned the "${badgeName}" badge.`,
        '/student-badges.html'
    );
};

/**
 * Notify a student when they complete a quest
 * @param {string} studentId - UUID of the student
 * @param {string} questTitle - Title of the completed quest
 * @param {number} xpGained - Amount of XP earned
 * @returns {Promise<void>}
 */
const notifyQuestCompleted = async (studentId, questTitle, xpGained) => {
    await sendNotification(
        studentId,
        'achievement',
        '⚔️ Quest Completed',
        `You completed "${questTitle}" and earned +${xpGained} XP!`,
        '/student-quests.html'
    );
};

/**
 * Send a system announcement to a specific user (e.g., admin to student)
 * @param {string} userId - UUID of the recipient
 * @param {string} title - Announcement title
 * @param {string} message - Announcement content
 * @param {string|null} link - Optional link
 * @returns {Promise<void>}
 */
const sendSystemNotification = async (userId, title, message, link = null) => {
    await sendNotification(userId, 'system', title, message, link);
};

/**
 * Broadcast a system announcement to all users (or a specific role)
 * @param {Array<string>} userIds - Array of user UUIDs to notify
 * @param {string} title - Announcement title
 * @param {string} message - Announcement content
 * @param {string|null} link - Optional link
 * @returns {Promise<void>}
 */
const broadcastSystemNotification = async (userIds, title, message, link = null) => {
    for (const userId of userIds) {
        await sendNotification(userId, 'system', title, message, link);
    }
    // Note: For large user bases, you would batch insert instead of looping.
};

/**
 * Notify the teacher of a course about a student event
 * @param {string} courseId
 * @param {string} type - 'enrollment' | 'achievement' | 'system'
 * @param {string} title
 * @param {string} message
 */
const notifyTeacher = async (courseId, type, title, message) => {
    try {
        const [courseRows] = await db.query(
            `SELECT teacher_id FROM courses WHERE id = ? LIMIT 1`,
            [courseId]
        );
        if (courseRows.length === 0) return;
        const teacherId = courseRows[0].teacher_id;
        await notificationRepo.create({
            user_id: teacherId,
            type,
            title,
            message,
            link: '/teacher-students.html'
        });
    } catch (err) {
        console.error('Failed to notify teacher:', err.message);
    }
};

const notifyAdmins = async (type, title, message, link = null) => {
    const adminIds = await userRepository.findAdminIds();
    for (const adminId of adminIds) {
        await sendNotification(adminId, type, title, message, link);
    }
};

module.exports = {
    sendNotification,
    notifyEnrollment,
    notifyBadgeEarned,
    notifyQuestCompleted,
    sendSystemNotification,
    broadcastSystemNotification,
    notifyTeacher,
    notifyAdmins
};