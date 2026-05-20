const courseRepository = require('../../repositories/courseRepository');
const { _verifyCourseOwnership, _verifyChapterBelongsToCourse } = require('./helpers');
const { validateCreateAssessment } = require('../../validators/courseValidator');

const createAssessment = async (courseId, chapterId, teacherId, assessmentData) => {
    const { valid, messages, value } = validateCreateAssessment(assessmentData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }
    await _verifyCourseOwnership(courseId, teacherId);
    await _verifyChapterBelongsToCourse(chapterId, courseId);
    const { lesson_id } = assessmentData;
    return await courseRepository.createAssessment(chapterId, value, courseId, lesson_id);
};

const deleteAssessment = async (courseId, chapterId, assessmentId, teacherId) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment || assessment.chapter_id !== chapterId) {
        const error = new Error('الـ Assessment غير موجود / Assessment not found');
        error.statusCode = 404;
        throw error;
    }
    await courseRepository.deleteAssessment(assessmentId);
    return { message: 'تم حذف الـ Assessment بنجاح / Assessment deleted successfully' };
};

const updateAssessment = async (courseId, chapterId, assessmentId, teacherId, updateData) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment || assessment.chapter_id !== chapterId) {
        const error = new Error('الاختبار غير موجود');
        error.statusCode = 404;
        throw error;
    }
    if (!updateData.title && !updateData.type && updateData.passing_score === undefined && updateData.lesson_id === undefined && !updateData.questions) {
        const error = new Error('يجب إرسال حقل واحد على الأقل للتحديث');
        error.statusCode = 400;
        throw error;
    }
    if (updateData.type && !['quiz', 'final_exam'].includes(updateData.type)) {
        const error = new Error('نوع الاختبار يجب أن يكون quiz أو final_exam');
        error.statusCode = 400;
        throw error;
    }
    return await courseRepository.updateAssessment(assessmentId, updateData);
};

const submitAssessment = async (studentId, assessmentId, answers) => {
    // Placeholder – actual logic depends on your implementation.
    // This function should calculate score, update student_assessments, award XP, etc.
    // For now, we assume it exists and we just re-route.
    // If you have an existing implementation, move it here.
    throw new Error('submitAssessment not yet migrated – please move your existing logic here');
};

const submitBossExam = async (studentId, assessmentId, code, language) => {
    // Placeholder – similar to submitAssessment but for boss exam.
    throw new Error('submitBossExam not yet migrated – please move your existing logic here');
};

module.exports = {
    createAssessment,
    deleteAssessment,
    updateAssessment,
    submitAssessment,
    submitBossExam
};