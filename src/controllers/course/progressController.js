const courseService = require('../../services/courseService');

const getProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;
        const result = await courseService.getStudentCourseProgress(studentId, courseId);
        res.status(200).json({ success: true, progress: result.percentage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateProgress = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;
        const { xp_reward } = req.body;
        const result = await courseService.trackProgress(studentId, courseId, xp_reward);
        res.status(200).json({
            success: true,
            message: "تم تحديث التقدم بنجاح",
            data: result
        });
    } catch (error) { next(error); }
};

const getChapters = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;
        const data = await courseService.getChaptersList(studentId, courseId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getLessons = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;
        const studentId = req.user.id;
        const lessons = await courseService.getLessonsList(studentId, courseId, chapterId);
        res.status(200).json({ success: true, data: lessons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const finishLesson = async (req, res) => {
    try {
        const { courseId, chapterId, lessonId, xp_reward } = req.body;
        const studentId = req.user.id;
        if (!courseId || !chapterId || !lessonId) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const result = await courseService.finishLessonAndAwardXP(studentId, courseId, chapterId, lessonId, xp_reward || 0);
        res.status(200).json({
            success: true,
            message: "Lesson completed successfully!",
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getProgress,
    updateProgress,
    getChapters,
    getLessons,
    finishLesson
};