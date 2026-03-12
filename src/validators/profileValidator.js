const Joi = require('joi');

// schema التحقق من بيانات تحديث الملف الشخصي
// Profile update validation schema
const updateProfileSchema = Joi.object({

    bio: Joi.string()
        .max(500)                // 500 حرف كحد أقصى / max 500 characters
        .optional(),             // اختياري / optional

    avatar_url: Joi.string()
        .uri()                   // يجب أن يكون رابط صحيح / must be a valid URL
        .optional()

}).min(1);                       // يجب أن يكون فيه حقل واحد على الأقل / at least one field required

/**
 * التحقق من بيانات تحديث الملف الشخصي
 * Validate profile update data
 */
const validateUpdateProfile = (data) => {

    // لو الـ body فارغ تماماً
    // If body is completely empty
    if (!data || Object.keys(data).length === 0) {
        return {
            valid: false,
            messages: ['يجب إرسال حقل واحد على الأقل / At least one field is required']
        };
    }

    const { error, value } = updateProfileSchema.validate(data, { abortEarly: false });

    if (error) {
        const messages = error.details.map(detail => detail.message);
        return { valid: false, messages };
    }

    return { valid: true, value };
};
module.exports = {
    validateUpdateProfile
};
