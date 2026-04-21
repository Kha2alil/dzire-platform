const Joi = require('joi');

const createCourseSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(255)
        .required(),

    description: Joi.string()
        .max(2000)
        .optional()
        .allow(''),

    // ✅ Accept both UUID strings and integer IDs from the DB
    subdomain_id: Joi.alternatives()
        .try(Joi.string().uuid(), Joi.number().integer().positive())
        .required(),

    difficulty_level: Joi.string()
        .lowercase()  
        .valid('beginner', 'intermediate', 'advanced')
        .required(),
});

const updateCourseSchema = Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    description: Joi.string().max(2000).optional().allow(''),
    difficulty_level: Joi.string()
        .valid('beginner', 'intermediate', 'advanced')
        .optional(),
    is_published: Joi.boolean().optional()
}).min(1);

const createChapterSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    order_index: Joi.number().integer().min(0).required()
});

const createLessonSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    content_type: Joi.string().valid('video', 'pdf').required(),
    order_index: Joi.number().integer().min(0).required(),
    duration: Joi.number().integer().min(1).optional(),
    is_free: Joi.boolean().default(false),
    xp_reward: Joi.number().integer().min(0).default(0)
});

const createAssessmentSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    type: Joi.string().valid('quiz', 'final_exam').required(),
    passing_score: Joi.number().integer().min(1).max(100).required(),
    lesson_id: Joi.string().uuid().optional(), // ✅ إضافة هذا السطر
    questions: Joi.array().items(
        Joi.object({
            question_text: Joi.string().required(),
            options: Joi.array().items(Joi.string()).min(2).max(4).required(),
            correct_answer: Joi.string().required(),
            socratic_hint: Joi.string().optional().allow(''),
            difficulty_level: Joi.string().valid('easy', 'medium', 'hard').optional(),
            points: Joi.number().integer().min(1).default(1),
            order_index: Joi.number().integer().min(0).required()
        })
    ).min(1).required()
});

const validateCreateCourse = (data) => {
    const { error, value } = createCourseSchema.validate(data, { abortEarly: false });
    if (error) return { valid: false, messages: error.details.map(d => d.message) };
    return { valid: true, value };
};

const validateUpdateCourse = (data) => {
    const { error, value } = updateCourseSchema.validate(data, { abortEarly: false });
    if (error) return { valid: false, messages: error.details.map(d => d.message) };
    return { valid: true, value };
};

const validateCreateChapter = (data) => {
    const { error, value } = createChapterSchema.validate(data, { abortEarly: false });
    if (error) return { valid: false, messages: error.details.map(d => d.message) };
    return { valid: true, value };
};

const validateCreateLesson = (data) => {
    const { error, value } = createLessonSchema.validate(data, { abortEarly: false });
    if (error) return { valid: false, messages: error.details.map(d => d.message) };
    return { valid: true, value };
};

const validateCreateAssessment = (data) => {
    const { error, value } = createAssessmentSchema.validate(data, { abortEarly: false });
    if (error) return { valid: false, messages: error.details.map(d => d.message) };
    return { valid: true, value };
};

module.exports = {
    validateCreateCourse,
    validateUpdateCourse,
    validateCreateChapter,
    validateCreateLesson,
    validateCreateAssessment
};