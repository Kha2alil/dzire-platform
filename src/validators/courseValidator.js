const Joi = require('joi');

// ============================================================
// Schema التحقق من بيانات إنشاء الكورس
// Course creation validation schema
// ============================================================
const createCourseSchema = Joi.object({

    title: Joi.string()
        .min(3)                          // 3 أحرف على الأقل / at least 3 characters
        .max(255)                        // 255 حرف كحد أقصى / max 255 characters
        .required(),

    description: Joi.string()
        .max(2000)                       // وصف مختصر / short description
        .optional()
        .allow(''),

    subdomain_id: Joi.string()
        .uuid()                          // يجب أن يكون UUID صحيح / must be a valid UUID
        .required(),

    difficulty_level: Joi.string()
        .valid('beginner', 'intermediate', 'advanced')
        .required()
});

// ============================================================
// Schema التحقق من بيانات تعديل الكورس
// Course update validation schema
// ============================================================
const updateCourseSchema = Joi.object({

    title: Joi.string()
        .min(3)
        .max(255)
        .optional(),

    description: Joi.string()
        .max(2000)
        .optional()
        .allow(''),

    difficulty_level: Joi.string()
        .valid('beginner', 'intermediate', 'advanced')
        .optional()
}).min(1); // يجب تحديث حقل واحد على الأقل / at least one field must be updated

// ============================================================
// Schema التحقق من بيانات إنشاء Chapter
// Chapter creation validation schema
// ============================================================
const createChapterSchema = Joi.object({

    title: Joi.string()
        .min(3)
        .max(255)
        .required(),

    order_index: Joi.number()
        .integer()
        .min(0)
        .required()
});

// ============================================================
// Schema التحقق من بيانات إنشاء Lesson
// Lesson creation validation schema
// ============================================================
const createLessonSchema = Joi.object({

    title: Joi.string()
        .min(3)
        .max(255)
        .required(),

    content_type: Joi.string()
        .valid('video', 'pdf')           // فيديو أو PDF فقط / video or PDF only
        .required(),

    order_index: Joi.number()
        .integer()
        .min(0)
        .required(),

    duration: Joi.number()
        .integer()
        .min(1)
        .optional(),                     // المدة بالدقائق / duration in minutes

    is_free: Joi.boolean()
        .default(false),

    xp_reward: Joi.number()
        .integer()
        .min(0)
        .default(0)
});

// ============================================================
// Schema التحقق من بيانات إنشاء Assessment
// Assessment creation validation schema
// ============================================================
const createAssessmentSchema = Joi.object({

    title: Joi.string()
        .min(3)
        .max(255)
        .required(),

    type: Joi.string()
        .valid('quiz', 'final_exam')
        .required(),

    questions: Joi.array().items(
        Joi.object({
            question_text: Joi.string().required(),
            options: Joi.array().items(Joi.string()).min(2).max(4).required(),
            correct_answer: Joi.string().required(),
            socratic_hint: Joi.string().optional().allow(''),
            difficulty_level: Joi.string()
                .valid('easy', 'medium', 'hard')
                .optional(),
            points: Joi.number().integer().min(1).default(1),
            order_index: Joi.number().integer().min(0).required()
        })
    ).min(1).required()                  // يجب وجود سؤال واحد على الأقل / at least one question
});

// ============================================================
// دوال التحقق
// Validation functions
// ============================================================

const validateCreateCourse = (data) => {
    const { error, value } = createCourseSchema.validate(data, { abortEarly: false });
    if (error) {
        return { valid: false, messages: error.details.map(d => d.message) };
    }
    return { valid: true, value };
};

const validateUpdateCourse = (data) => {
    const { error, value } = updateCourseSchema.validate(data, { abortEarly: false });
    if (error) {
        return { valid: false, messages: error.details.map(d => d.message) };
    }
    return { valid: true, value };
};

const validateCreateChapter = (data) => {
    const { error, value } = createChapterSchema.validate(data, { abortEarly: false });
    if (error) {
        return { valid: false, messages: error.details.map(d => d.message) };
    }
    return { valid: true, value };
};

const validateCreateLesson = (data) => {
    const { error, value } = createLessonSchema.validate(data, { abortEarly: false });
    if (error) {
        return { valid: false, messages: error.details.map(d => d.message) };
    }
    return { valid: true, value };
};

const validateCreateAssessment = (data) => {
    const { error, value } = createAssessmentSchema.validate(data, { abortEarly: false });
    if (error) {
        return { valid: false, messages: error.details.map(d => d.message) };
    }
    return { valid: true, value };
};

module.exports = {
    validateCreateCourse,
    validateUpdateCourse,
    validateCreateChapter,
    validateCreateLesson,
    validateCreateAssessment
};
