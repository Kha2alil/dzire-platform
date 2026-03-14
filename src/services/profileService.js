const profileRepository = require('../repositories/profileRepository');
const userRepository    = require('../repositories/userRepository');
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

    // الخطوة 2: لو فيه full_name → حدّثه في جدول users
    // Step 2: If full_name exists → update it in users table
    if (value.full_name) {
        await userRepository.updateFullName(userId, value.full_name);
    }

    // الخطوة 3: لو فيه bio أو avatar_url → حدّثهم في جدول profiles
    // Step 3: If bio or avatar_url exist → update them in profiles table
    // bio + avatar_url + specialization + experience_years go to profiles table
    const profileData = {};
    if (value.bio              !== undefined) profileData.bio              = value.bio;
    if (value.avatar_url       !== undefined) profileData.avatar_url       = value.avatar_url;
    if (value.specialization   !== undefined) profileData.specialization   = value.specialization;
    if (value.experience_years !== undefined) profileData.experience_years = value.experience_years;
    if (Object.keys(profileData).length > 0) {
        await profileRepository.updateProfile(userId, profileData);
    }

    // الخطوة 4: جلب الملف الشخصي المحدّث وإرجاعه
    // Step 4: Fetch and return updated profile
    const profile = await profileRepository.findByUserId(userId);

    return { profile };
};

/**
 * رفع وحفظ الصورة الشخصية
 * Upload and save avatar image
 *
 * @param {string} userId - ID المستخدم / User ID
 * @param {Object} file   - الملف المُرفوع من Multer / File uploaded by Multer
 * @returns {Object}      - الملف الشخصي المحدّث / Updated profile
 */
const uploadAvatar = async (userId, file) => {

    // الخطوة 1: تحقق أن الملف موجود
    // Step 1: Check file exists
    if (!file) {
        const error = new Error('لم يتم إرسال أي صورة / No image was sent');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 2: بناء المسار الذي سيُحفظ في DB
    // Step 2: Build the path to save in DB
    // مثال / example: uploads/avatars/278c6451_1741939456123.jpg
    const avatarUrl = `uploads/avatars/${file.filename}`;

    // الخطوة 3: حفظ المسار في DB
    // Step 3: Save path in DB
    await profileRepository.updateAvatarUrl(userId, avatarUrl);

    // الخطوة 4: جلب الملف الشخصي المحدّث وإرجاعه
    // Step 4: Fetch and return updated profile
    const profile = await profileRepository.findByUserId(userId);

    return { profile };
};

module.exports = {
    getProfile,
    updateProfile,
    uploadAvatar
};