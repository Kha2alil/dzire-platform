const courseRepository = require('../../repositories/courseRepository');
const { _verifyCourseOwnership } = require('./helpers');
const { validateCreateCourse, validateUpdateCourse } = require('../../validators/courseValidator');
const fs = require('fs');

const createCourse = async (teacherUser, courseData) => {
    const { valid, messages, value } = validateCreateCourse(courseData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }
    return await courseRepository.createCourse({ ...value, teacher_id: teacherUser.id });
};

const getTeacherCourses = async (teacherId) => {
    return await courseRepository.findCoursesByTeacher(teacherId);
};

const getCourseDetails = async (courseId, teacherId) => {
    const course = await courseRepository.findCourseById(courseId);
    if (!course) {
        const error = new Error('الكورس غير موجود / Course not found');
        error.statusCode = 404;
        throw error;
    }
    if (course.teacher_id !== teacherId) {
        const error = new Error('ليس لديك صلاحية لهذا الكورس / You do not have permission for this course');
        error.statusCode = 403;
        throw error;
    }
    const chapters = await courseRepository.findChaptersByCourse(courseId);
    const chaptersWithDetails = await Promise.all(
        chapters.map(async (chapter) => {
            const lessons = await courseRepository.findLessonsByChapter(chapter.id);
            const assessments = await courseRepository.findAssessmentsByChapter(chapter.id);
            const assessmentsWithQuestions = await Promise.all(
                assessments.map(async (assessment) => {
                    const questions = await courseRepository.findQuestionsByAssessmentId(assessment.id);
                    return { ...assessment, questions };
                })
            );
            return { ...chapter, lessons, assessments: assessmentsWithQuestions };
        })
    );
    return { ...course, chapters: chaptersWithDetails };
};

const updateCourse = async (courseId, teacherId, updateData) => {
    const { valid, messages, value } = validateUpdateCourse(updateData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }
    await _verifyCourseOwnership(courseId, teacherId);
    const updated = await courseRepository.updateCourse(courseId, value);
    if (!updated) {
        const error = new Error('فشل التحديث / Update failed');
        error.statusCode = 500;
        throw error;
    }
    return updated;
};

const updateCourseInfo = async (courseId, user, { title, description }) => {
    const userId = user.id;
    const userRole = user.role;

    // إذا كان المستخدم أدمن، لا نتحقق من الملكية
    if (userRole !== 'Teacher') {
        await _verifyCourseOwnership(courseId, userId);
    }

    if (!title && !description) {
        const error = new Error('يجب إرسال عنوان أو وصف');
        error.statusCode = 400;
        throw error;
    }

    const updated = await courseRepository.updateCourse(courseId, { title, description });
    if (!updated) {
        const error = new Error('فشل تحديث المعلومات');
        error.statusCode = 500;
        throw error;
    }
    return updated;
};

const toggleCoursePublishStatus = async (courseId, teacherId, isPublished) => {
    await _verifyCourseOwnership(courseId, teacherId);
    if (typeof isPublished !== 'boolean') {
        const error = new Error('قيمة غير صالحة، يجب أن تكون true أو false');
        error.statusCode = 400;
        throw error;
    }
    const updated = await courseRepository.updateCourse(courseId, { is_published: isPublished });
    if (!updated) {
        const error = new Error('فشل تحديث حالة الكورس');
        error.statusCode = 500;
        throw error;
    }
    return updated;
};

const updateCourseThumbnail = async (courseId, teacherId, file) => {
    if (!file) {
        const error = new Error('لم يتم رفع أي صورة / No image uploaded');
        error.statusCode = 400;
        throw error;
    }
    const course = await _verifyCourseOwnership(courseId, teacherId);
    if (course.thumbnail_url) {
        const oldPath = course.thumbnail_url.replace('/uploads/', 'uploads/');
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const thumbnailUrl = `/uploads/thumbnails/${file.filename}`;
    await courseRepository.updateCourseThumbnail(courseId, thumbnailUrl);
    return { thumbnail_url: thumbnailUrl };
};

const deleteCourse = async (courseId, teacherId) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const deleted = await courseRepository.deleteCourse(courseId);
    if (!deleted) {
        const error = new Error('فشل الحذف / Delete failed');
        error.statusCode = 500;
        throw error;
    }
    return { message: 'تم حذف الكورس بنجاح / Course deleted successfully' };
};

module.exports = {
    createCourse,
    getTeacherCourses,
    getCourseDetails,
    updateCourse,
    updateCourseInfo,
    toggleCoursePublishStatus,
    updateCourseThumbnail,
    deleteCourse
};