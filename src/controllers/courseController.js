const courseService = require('../services/courseService');

// ============================================================
// COURSES
// ============================================================

const createCourse = async (req, res, next) => {
    try {
        const course = await courseService.createCourse(req.user, req.body);
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الكورس بنجاح / Course created successfully',
            data: { course }
        });
    } catch (error) {
        next(error);
    }
};

const getTeacherCourses = async (req, res, next) => {
    try {
        const courses = await courseService.getTeacherCourses(req.user.id);
        res.status(200).json({
            success: true,
            data: { courses }
        });
    } catch (error) {
        next(error);
    }
};

const getCourseDetails = async (req, res, next) => {
    try {
        const course = await courseService.getCourseDetails(req.params.courseId, req.user.id);
        res.status(200).json({
            success: true,
            data: { course }
        });
    } catch (error) {
        next(error);
    }
};

const updateCourse = async (req, res, next) => {
    try {
        const course = await courseService.updateCourse(req.params.courseId, req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: 'تم تعديل الكورس بنجاح / Course updated successfully',
            data: { course }
        });
    } catch (error) {
        next(error);
    }
};

const togglePublishStatus = async (req, res, next) => {
    try {
        const course = await courseService.toggleCoursePublishStatus(
            req.params.courseId,
            req.user.id,
            req.body.is_published
        );

        res.status(200).json({
            success: true,
            message: req.body.is_published
                ? 'تم نشر الكورس بنجاح / Course published successfully'
                : 'تم تحويل الكورس إلى مسودة / Course moved to draft',
            data: { course }
        });
    } catch (error) {
        next(error);
    }
};

const uploadThumbnail = async (req, res, next) => {
    try {
        const result = await courseService.updateCourseThumbnail(req.params.courseId, req.user.id, req.file);
        res.status(200).json({
            success: true,
            message: 'تم رفع صورة الغلاف بنجاح / Thumbnail uploaded successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const deleteCourse = async (req, res, next) => {
    try {
        const result = await courseService.deleteCourse(req.params.courseId, req.user.id);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

// ============================================================
// CHAPTERS
// ============================================================

const createChapter = async (req, res, next) => {
    try {
        const chapter = await courseService.createChapter(req.params.courseId, req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: 'تم إضافة الـ Chapter بنجاح / Chapter added successfully',
            data: { chapter }
        });
    } catch (error) {
        next(error);
    }
};

const deleteChapter = async (req, res, next) => {
    try {
        const result = await courseService.deleteChapter(
            req.params.courseId,
            req.params.chapterId,
            req.user.id
        );
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

// ============================================================
// LESSONS
// ============================================================

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
    } catch (error) {
        next(error);
    }
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
    } catch (error) {
        next(error);
    }
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
    } catch (error) {
        next(error);
    }
};

// ============================================================
// ASSESSMENTS
// ============================================================

const createAssessment = async (req, res, next) => {
    try {
        const assessment = await courseService.createAssessment(
            req.params.courseId,
            req.params.chapterId,
            req.user.id,
            req.body
        );
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الـ Assessment بنجاح / Assessment created successfully',
            data: { assessment }
        });
    } catch (error) {
        next(error);
    }
};

const deleteAssessment = async (req, res, next) => {
    try {
        const result = await courseService.deleteAssessment(
            req.params.courseId,
            req.params.chapterId,
            req.params.assessmentId,
            req.user.id
        );
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

const updateAssessment = async (req, res, next) => {
    try {
        const assessment = await courseService.updateAssessment(
            req.params.courseId,
            req.params.chapterId,
            req.params.assessmentId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: 'تم تعديل الاختبار بنجاح',
            data: { assessment }
        });
    } catch (error) {
        next(error);
    }
};

const submitAssessment = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { answers } = req.body;
        const studentId = req.user.id;

        const result = await courseService.submitAssessment(studentId, assessmentId, answers);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

const updateQuestion = async (req, res, next) => {
    try {
        const question = await courseService.updateQuestion(
            req.params.courseId,
            req.params.assessmentId,
            req.params.questionId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: 'تم تعديل السؤال بنجاح',
            data: { question }
        });
    } catch (error) {
        next(error);
    }
};

const addQuestion = async (req, res, next) => {
    try {
        const assessment = await courseService.addQuestion(
            req.params.courseId,
            req.params.assessmentId,
            req.user.id,
            req.body
        );
        res.status(201).json({
            success: true,
            message: 'تم إضافة السؤال بنجاح',
            data: { assessment }
        });
    } catch (error) {
        next(error);
    }
};

const deleteQuestion = async (req, res, next) => {
    try {
        const result = await courseService.deleteQuestion(
            req.params.courseId,
            req.params.assessmentId,
            req.params.questionId,
            req.user.id
        );
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

const updateChapter = async (req, res, next) => {
    try {
        const chapter = await courseService.updateChapter(
            req.params.courseId,
            req.params.chapterId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: 'تم تعديل الـ Chapter بنجاح',
            data: { chapter }
        });
    } catch (error) {
        next(error);
    }
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
    } catch (error) {
        next(error);
    }
};

const searchCourses = async (req, res, next) => {
    try {
        const courses = await courseService.searchCourses(
            req.user.id,
            req.query
        );
        res.status(200).json({
            success: true,
            data: { courses }
        });
    } catch (error) {
        next(error);
    }
};

const getProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        const result = await courseService.getStudentCourseProgress(studentId, courseId);

        res.status(200).json({
            success: true,
            progress: result.percentage
        });
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
    } catch (error) {
        next(error);
    }
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

        res.status(200).json({
            success: true,
            data: lessons
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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

        res.status(200).json({
            success: true,
            data: content
        });
    } catch (error) {
        res.status(403).json({ success: false, message: error.message });
    }
};

const finishLesson = async (req, res) => {
    try {
        const { courseId, chapterId, lessonId, xp_reward } = req.body;
        const studentId = req.user.id;

        if (!courseId || !chapterId || !lessonId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: courseId, chapterId, or lessonId"
            });
        }

        const result = await courseService.finishLessonAndAwardXP(
            studentId,
            courseId,
            chapterId,
            lessonId,
            xp_reward || 0
        );

        res.status(200).json({
            success: true,
            message: "Lesson completed successfully!",
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAvailableCourses = async (req, res) => {
    try {
        const studentId = req.user.id;
        const courses = await courseService.getAvailableCourses(studentId);

        res.status(200).json({
            success: true,
            count: courses.length,
            data: { courses }
        });
    } catch (error) {
        console.error("Error in getAvailableCourses Controller:", error);
        res.status(500).json({
            success: false,
            message: "خطأ في جلب الكورسات المتاحة",
            error: error.message
        });
    }
};

const getMyCourses = async (req, res) => {
    try {
        const studentId = req.user.id;
        const enrolledCourses = await courseService.getStudentDashboard(studentId);

        res.status(200).json({
            success: true,
            count: enrolledCourses.length,
            data: {
                courses: enrolledCourses
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyStudentCount = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const stats = await courseService.getTeacherStats(teacherId);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching student count",
            error: error.message
        });
    }
};

const getTeacherDashboard = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const data = await courseService.getStudentsStatsForTeacher(teacherId);

        res.status(200).json({
            success: true,
            results: data.length,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching students statistics",
            error: error.message
        });
    }
};



const getChapterLessons = async (req, res, next) => {
    try {
        const { chapterId } = req.params;
        const lessons = await courseService.getLessonsByChapter(chapterId);
        res.status(200).json({
            success: true,
            data: lessons
        });
    } catch (error) {
        next(error);
    }
};

const getCourseSubdomain = async (req, res) => {
    try {
        const { courseId } = req.params;
        const subdomain = await courseService.getCourseSubdomain(courseId);
        if (!subdomain) return res.status(404).json({ success: false, message: 'Subdomain not found' });
        res.status(200).json({ success: true, data: subdomain });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
module.exports = {
    createCourse,
    getTeacherCourses,
    getCourseDetails,
    updateCourse,
    uploadThumbnail,
    togglePublishStatus,
    deleteCourse,
    createChapter,
    deleteChapter,
    createLesson,
    uploadLessonContent,
    deleteLesson,
    createAssessment,
    deleteAssessment,
    updateAssessment,
    submitAssessment,
    updateQuestion,
    addQuestion,
    deleteQuestion,
    updateChapter,
    updateLesson,
    searchCourses,
    getProgress,
    updateProgress,
    getChapters,
    getLessons,
    getLessonContents,
    getLessonDetails,
    finishLesson,
    getAvailableCourses,
    getMyCourses,
    getMyStudentCount,
    getTeacherDashboard,
    
    getChapterLessons,
    getCourseSubdomain
};