const courseRepository = require('../../repositories/courseRepository');
const { _verifyCourseOwnership, _verifyChapterBelongsToCourse } = require('./helpers');
const { validateCreateChapter } = require('../../validators/courseValidator');

const createChapter = async (courseId, teacherId, chapterData) => {
    const { valid, messages, value } = validateCreateChapter(chapterData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }
    await _verifyCourseOwnership(courseId, teacherId);
    return await courseRepository.createChapter(courseId, value);
};

const deleteChapter = async (courseId, chapterId, teacherId) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId) {
        const error = new Error('الـ Chapter غير موجود / Chapter not found');
        error.statusCode = 404;
        throw error;
    }
    await courseRepository.deleteChapter(chapterId);
    return { message: 'تم حذف الـ Chapter بنجاح / Chapter deleted successfully' };
};

const updateChapter = async (courseId, chapterId, teacherId, updateData) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId) {
        const error = new Error('الـ Chapter غير موجود');
        error.statusCode = 404;
        throw error;
    }
    if (!updateData.title && updateData.order_index === undefined) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }
    return await courseRepository.updateChapter(chapterId, updateData);
};

module.exports = {
    createChapter,
    deleteChapter,
    updateChapter
};