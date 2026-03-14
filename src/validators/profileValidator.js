const Joi = require('joi');

// schema التحقق من بيانات تحديث الملف الشخصي
// Profile update validation schema
const updateProfileSchema = Joi.object({

    full_name: Joi.string()
        .min(2)                  // حرفان على الأقل / at least 2 characters
        .max(100)               // 100 حرف كحد أقصى / max 100 characters
        .optional(),

    bio: Joi.string()
        .max(500)                    // 500 حرف كحد أقصى / max 500 characters
        .optional(),                 // اختياري / optional

    avatar_url: Joi.string()
        .uri()                    // يجب أن يكون رابط صحيح / must be a valid URL
        .optional(),
    
    specialization: Joi.string()
    .max(100)                       // 100 حرف كحد أقصى / max 100 characters
    .optional(),

    experience_years: Joi.number()
        .integer()                  // رقم صحيح / integer only
        .min(0)                     // لا يقل عن 0 / minimum 0
        .max(50)                    // لا يزيد عن 50 / maximum 50
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
