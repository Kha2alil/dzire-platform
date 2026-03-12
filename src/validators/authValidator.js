const Joi = require('joi');

// schema التحقق من بيانات التسجيل
// Signup validation schema
const signupSchema = Joi.object({

    email: Joi.string()
        .email()                     // يجب أن يكون إيميل صحيح / must be a valid email
        .required(),                 // إجباري / required

    password: Joi.string()
        .min(8)                      // 8 أحرف على الأقل / at least 8 characters
        .required(),

    full_name: Joi.string()
        .min(2)                      // حرفان على الأقل / at least 2 characters
        .max(100)                    // 100 حرف كحد أقصى / max 100 characters
        .required(),

    role: Joi.string()
        .valid('student', 'teacher') // فقط هاتين القيمتين / only these two values
        .required()
});

/**
 * التحقق من بيانات التسجيل
 * Validate signup data
 *
 * @param {Object} data - البيانات المُرسلة من المستخدم / Data sent by the user
 * @returns {Object} - { valid: true, value } أو { valid: false, messages }
 */
const validateSignup = (data) => {

    // abortEarly: false → اجمع كل الأخطاء دفعة واحدة بدل إيقاف عند أول خطأ
    // abortEarly: false → collect ALL errors at once instead of stopping at the first one
    const { error, value } = signupSchema.validate(data, { abortEarly: false });

    if (error) {
        // نحول الأخطاء لمصفوفة نصوص واضحة
        // Convert errors to an array of clear messages
        const messages = error.details.map(detail => detail.message);
        return { valid: false, messages };
    }

    return { valid: true, value };
};

// schema التحقق من بيانات تسجيل الدخول
// Login validation schema
const loginSchema = Joi.object({

    email: Joi.string()
        .email()
        .required(),

    password: Joi.string()
        .required()
});

/**
 * التحقق من بيانات تسجيل الدخول
 * Validate login data
 */
const validateLogin = (data) => {
    const { error, value } = loginSchema.validate(data, { abortEarly: false });

    if (error) {
        const messages = error.details.map(detail => detail.message);
        return { valid: false, messages };
    }

    return { valid: true, value };
};



module.exports = {
    validateSignup,
    validateLogin 
};