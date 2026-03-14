const gamificationRepository = require('../repositories/gamificationRepository');

/**
 * جلب إحصائيات الطالب
 * Get student gamification stats
 */

const getStats = async (userId, role) => {

    // هذه الخاصية للطلاب فقط
    // This feature is for students only
    if (role !== 'student') {
        const error = new Error('هذه الخاصية للطلاب فقط / This feature is for students only');
        error.statusCode = 403;
        throw error;
    }

    // جلب الإحصائيات من DB
    // Fetch stats from DB
    const stats = await gamificationRepository.findByUserId(userId);

    if (!stats) {
        const error = new Error('لم يتم العثور على الإحصائيات / Stats not found');
        error.statusCode = 404;
        throw error;
    }

    return { stats };
};

module.exports = { getStats };