const gamificationRepository = require('../repositories/gamificationRepository');

/**
 * جلب إحصائيات الطالب
 * Get student gamification stats
 */

const getStats = async (userId, role) => {
    if (role !== 'student') {
        const error = new Error('This feature is for students only');
        error.statusCode = 403;
        throw error;
    }

    const stats = await gamificationRepository.findByUserId(userId);
    if (!stats) {
        const error = new Error('Stats not found');
        error.statusCode = 404;
        throw error;
    }

    return { stats };
};

module.exports = { getStats };