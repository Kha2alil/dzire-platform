const gamificationService = require('../services/gamificationService');

/**
 * GET /api/gamification/me
 * جلب إحصائيات الطالب الحالي
 * Get current student's gamification stats
 */

const getStats = async (req, res, next) => {

    try {

        // req.user.id and req.user.role come from authMiddleware
        const result = await gamificationService.getStats(req.user.id, req.user.role);

        res.status(200).json({
            success: true,
            stats:   result.stats
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { getStats };