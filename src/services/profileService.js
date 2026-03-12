const profileRepository = require('../repositories/profileRepository');
const { validateUpdateProfile } = require('../validators/profileValidator');

/**
 * جلب الملف الشخصي للمستخدم الحالي
 * Get current user's profile
 */
const getProfile = async (userId) => {

    // الخطوة 1: جلب الملف الشخصي من DB
    // Step 1: Fetch profile from DB
    const profile = await profileRepository.findByUserId(userId);

    if (!profile) {
        const error = new Error('الملف الشخصي غير موجود / Profile not found');
        error.statusCode = 404;
        throw error;
    }

    return { profile };
};

/**
 * تحديث الملف الشخصي للمستخدم الحالي
 * Update current user's profile
 */
const updateProfile = async (userId, data) => {

    // الخطوة 1: تحقق من البيانات
    // Step 1: Validate the data
    const { valid, messages, value } = validateUpdateProfile(data);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    // الخطوة 2: حدّث الملف الشخصي في DB
    // Step 2: Update profile in DB
    const updated = await profileRepository.updateProfile(userId, value);

    if (!updated) {
        const error = new Error('فشل تحديث الملف الشخصي / Failed to update profile');
        error.statusCode = 500;
        throw error;
    }

    // الخطوة 3: جلب الملف الشخصي المحدّث وإرجاعه
    // Step 3: Fetch and return updated profile
    const profile = await profileRepository.findByUserId(userId);

    return { profile };
};

module.exports = {
    getProfile,
    updateProfile
};