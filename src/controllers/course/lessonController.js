const courseService = require('../../services/courseService');

const createLesson = async (req, res, next) => {
    try {
        const lesson = await courseService.createLesson(
            req.params.courseId,
            req.params.chapterId,
            req.user.id,
            req.body
        );
        res.status(201).json({
            success: true,
            message: 'تم إضافة الدرس بنجاح / Lesson added successfully',
            data: { lesson }
        });
    } catch (error) { next(error); }
};

const uploadLessonContent = async (req, res, next) => {
    try {
        const result = await courseService.uploadLessonContent(
            req.params.courseId,
            req.params.chapterId,
            req.params.lessonId,
            req.user.id,
            req.file
        );
        res.status(200).json({
            success: true,
            message: 'تم رفع المحتوى بنجاح / Content uploaded successfully',
            data: result
        });
    } catch (error) { next(error); }
};

const deleteLesson = async (req, res, next) => {
    try {
        const result = await courseService.deleteLesson(
            req.params.courseId,
            req.params.chapterId,
            req.params.lessonId,
            req.user.id
        );
        res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
};

const updateLesson = async (req, res, next) => {
    try {
        const lesson = await courseService.updateLesson(
            req.params.courseId,
            req.params.chapterId,
            req.params.lessonId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: 'تم تعديل الدرس بنجاح',
            data: { lesson }
        });
    } catch (error) { next(error); }
};

const getLessonContents = async (req, res) => {
    try {
        const { courseId, chapterId, lessonId } = req.params;
        const studentId = req.user.id;
        const detailedContents = await courseService.getFormattedContents(studentId, courseId, chapterId, lessonId);
        res.status(200).json({ success: true, data: detailedContents });
    } catch (error) {
        const statusCode = error.message.includes("Locked") ? 403 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

const getLessonDetails = async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const studentId = req.user.id;
        const content = await courseService.getLessonContent(studentId, courseId, lessonId);
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        res.status(403).json({ success: false, message: error.message });
    }
};

const getChapterLessons = async (req, res, next) => {
    try {
        const { chapterId } = req.params;
        const lessons = await courseService.getLessonsByChapter(chapterId);
        res.status(200).json({ success: true, data: lessons });
    } catch (error) { next(error); }
};


module.exports = {
    createLesson,
    uploadLessonContent,
    deleteLesson,
    updateLesson,
    getLessonContents,
    getLessonDetails,
    getChapterLessons
    
};