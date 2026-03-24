const Joi = require('joi');

// Signup validation schema
const signupSchema = Joi.object({

    email: Joi.string()
        .email()                     //  must be a valid email
        .required(),                 // required

    password: Joi.string()
        .min(8)                      // at least 8 characters
        .required(),

    full_name: Joi.string()
        .min(2)                       // at least 2 characters
        .max(100)                    //  max 100 characters
        .required(),

    role: Joi.string()
        .valid('student', 'teacher') // only these two values
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

// schema التحقق من بيانات تغيير كلمة المرور
// Change password validation schema
const changePasswordSchema = Joi.object({

    current_password: Joi.string()
        .required(),            // إجباري / required

    new_password: Joi.string()
        .min(8)                 // 8 أحرف على الأقل / at least 8 characters
        .required()

});

/**
 * التحقق من بيانات تغيير كلمة المرور
 * Validate change password data
 */
const validateChangePassword = (data) => {
    const { error, value } = changePasswordSchema.validate(data, { abortEarly: false });

    if (error) {
        const messages = error.details.map(detail => detail.message);
        return { valid: false, messages };
    }

    return { valid: true, value };
};

module.exports = {
    validateSignup,
    validateLogin,
    validateChangePassword
};