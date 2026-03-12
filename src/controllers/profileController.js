const profileService = require('../services/profileService');

/**
 * GET /api/profile/me
 * جلب الملف الشخصي للمستخدم الحالي
 * Get current user's profile
 */
const getProfile = async (req, res, next) => {

    try {

        // req.user.id يأتي من authMiddleware
        // req.user.id comes from authMiddleware
        const result = await profileService.getProfile(req.user.id);

        res.status(200).json({
            success: true,
            profile: result.profile
        });

    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/profile/me
 * تحديث الملف الشخصي للمستخدم الحالي
 * Update current user's profile
 */
const updateProfile = async (req, res, next) => {

    try {

        const result = await profileService.updateProfile(req.user.id, req.body);

        res.status(200).json({
            success: true,
            message: 'تم تحديث الملف الشخصي بنجاح / Profile updated successfully',
            profile: result.profile
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile
};