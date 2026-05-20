const courseRepository = require('../../repositories/courseRepository');
const { _verifyCourseOwnership } = require('./helpers');

const updateQuestion = async (courseId, assessmentId, questionId, teacherId, updateData) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const question = await courseRepository.findQuestionById(questionId);
    if (!question || question.assessment_id !== assessmentId) {
        const error = new Error('السؤال غير موجود');
        error.statusCode = 404;
        throw error;
    }
    if (Object.keys(updateData).length === 0) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }
    return await courseRepository.updateQuestion(questionId, updateData);
};

const addQuestion = async (courseId, assessmentId, teacherId, questionData) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment) {
        const error = new Error('الاختبار غير موجود');
        error.statusCode = 404;
        throw error;
    }
    if (!questionData.question_text || !questionData.options || !questionData.correct_answer) {
        const error = new Error('question_text و options و correct_answer إجبارية');
        error.statusCode = 400;
        throw error;
    }
    if (!Array.isArray(questionData.options) || questionData.options.length < 2) {
        const error = new Error('يجب وجود خيارين على الأقل');
        error.statusCode = 400;
        throw error;
    }
    return await courseRepository.addQuestion(assessmentId, questionData);
};

const deleteQuestion = async (courseId, assessmentId, questionId, teacherId) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const question = await courseRepository.findQuestionById(questionId);
    if (!question || question.assessment_id !== assessmentId) {
        const error = new Error('السؤال غير موجود');
        error.statusCode = 404;
        throw error;
    }
    await courseRepository.deleteQuestion(questionId);
    return { message: 'تم حذف السؤال بنجاح' };
};

module.exports = {
    updateQuestion,
    addQuestion,
    deleteQuestion
};