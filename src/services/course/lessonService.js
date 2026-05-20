const courseRepository = require('../../repositories/courseRepository');
const { _verifyCourseOwnership, _verifyChapterBelongsToCourse } = require('./helpers');
const { validateCreateLesson } = require('../../validators/courseValidator');
const fs = require('fs');

const createLesson = async (courseId, chapterId, teacherId, lessonData) => {
    const { valid, messages, value } = validateCreateLesson(lessonData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }
    await _verifyCourseOwnership(courseId, teacherId);
    await _verifyChapterBelongsToCourse(chapterId, courseId);
    return await courseRepository.createLesson(chapterId, value, courseId);
};

const uploadLessonContent = async (courseId, chapterId, lessonId, teacherId, file) => {
    const course = await courseRepository.findCourseById(courseId);
    if (!course || course.teacher_id !== teacherId) {
        throw new Error('غير مسموح لك بتعديل هذا الكورس / Unauthorized');
    }
    if (!file) throw new Error('لم يتم رفع أي ملف / No file uploaded');
    const folder = file.mimetype.startsWith('video/') ? 'videos' : 'pdfs';
    const fileUrl = `/uploads/${folder}/${file.filename}`;
    const updateData = {};
    if (file.mimetype.startsWith('video/')) updateData.video_url = fileUrl;
    else if (file.mimetype === 'application/pdf') updateData.pdf_url = fileUrl;
    const success = await courseRepository.updateLessonContent(lessonId, updateData);
    if (!success) throw new Error('فشل تحديث بيانات الدرس / Failed to update lesson');
    return { url: fileUrl, type: file.mimetype };
};

const deleteLesson = async (courseId, chapterId, lessonId, teacherId) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson || lesson.chapter_id !== chapterId) {
        const error = new Error('الدرس غير موجود / Lesson not found');
        error.statusCode = 404;
        throw error;
    }
    if (lesson.content_url) {
        const filePath = lesson.content_url.replace('/uploads/', 'uploads/');
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await courseRepository.deleteLesson(lessonId);
    return { message: 'تم حذف الدرس بنجاح / Lesson deleted successfully' };
};

const updateLesson = async (courseId, chapterId, lessonId, teacherId, updateData) => {
    await _verifyCourseOwnership(courseId, teacherId);
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson || lesson.chapter_id !== chapterId) {
        const error = new Error('الدرس غير موجود');
        error.statusCode = 404;
        throw error;
    }
    if (Object.keys(updateData).length === 0) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }
    if (updateData.content_type && !['video', 'pdf'].includes(updateData.content_type)) {
        const error = new Error('نوع المحتوى يجب أن يكون video أو pdf');
        error.statusCode = 400;
        throw error;
    }
    return await courseRepository.updateLesson(lessonId, updateData);
};

const getLessonsByChapter = async (chapterId) => {
    return await courseRepository.findLessonsByChapter(chapterId);
};

const getLessonContent = async (studentId, courseId, lessonId) => {
    // This is a student-facing function – it checks locks and returns content
    const lesson = await courseRepository.getLessonById(lessonId);
    const enrollment = await courseRepository.getEnrollmentData(studentId, courseId);
    const totalLessons = await courseRepository.getTotalCourseLessons(courseId);
    if (!lesson) throw new Error("الدرس غير موجود");
    const currentProgress = enrollment?.progress_percentage || 0;
    const lessonWeight = 100 / (totalLessons || 1);
    const requiredProgress = (lesson.order_index - 1) * lessonWeight;
    if (lesson.order_index > 1 && currentProgress < (requiredProgress - 0.5)) {
        throw new Error("هذا الدرس مغلق حالياً، أكمل الدروس السابقة أولاً");
    }
    return {
        title: lesson.title,
        video: lesson.video_url || lesson.content_url,
        pdf: lesson.pdf_url,
        description: lesson.summary_text,
        xp: lesson.xp_reward
    };
};

const getFormattedContents = async (studentId, courseId, chapterId, lessonId) => {
    const rawData = await courseRepository.getRawContentsByLesson(courseId, chapterId, lessonId);
    if (rawData.length === 0) throw new Error("No contents found for this lesson");
    const [enrollment] = await db.query("SELECT progress_percentage FROM enrollments WHERE student_id = ? AND course_id = ?", [studentId, courseId]);
    const currentProgress = enrollment[0]?.progress_percentage || 0;
    const [totalInCourse] = await db.query("SELECT COUNT(*) as count FROM lessons WHERE course_id = ?", [courseId]);
    const lessonWeight = 100 / (totalInCourse[0].count || 1);
    const lessonOrder = rawData[0].order_index;
    const requiredProgress = (lessonOrder - 1) * lessonWeight;
    if (lessonOrder > 1 && currentProgress < (requiredProgress - 0.5)) {
        throw new Error("Locked: Complete previous lessons to unlock this content");
    }
    return {
        video: rawData.find(item => item.content_type === 'video') || null,
        pdf: rawData.find(item => item.content_type === 'pdf') || null,
        quiz: rawData.find(item => item.content_type === 'quiz') || null,
        xp_reward: rawData[0].xp_reward
    };
};

module.exports = {
    createLesson,
    uploadLessonContent,
    deleteLesson,
    updateLesson,
    getLessonsByChapter,
    getLessonContent,
    getFormattedContents
};