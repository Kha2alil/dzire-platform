const badgeService = require('../services/badgeService');

/**
 * GET /api/badges
 * Get all badges in the system
 */
const getAllBadges = async (req, res, next) => {
    try {
        const badges = await badgeService.getAllBadges();
        res.status(200).json({ success: true, badges });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/badges/me
 * Get badges earned by the current user
 */
const getUserBadges = async (req, res, next) => {
    try {
        const badges = await badgeService.getUserBadges(req.user.id);
        res.status(200).json({ success: true, badges });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllBadges,
    getUserBadges
};