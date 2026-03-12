const courseService = require('../services/courseService');

// ============================================================
// COURSES
// ============================================================

/**
 * إنشاء كورس جديد
 * Create a new course
 * POST /api/courses
 */
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

/**
 * جلب كل كورسات الأستاذ
 * Get all teacher's courses
 * GET /api/courses
 */
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

/**
 * جلب تفاصيل كورس (مع Chapters والدروس)
 * Get course details (with Chapters and Lessons)
 * GET /api/courses/:courseId
 */
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

/**
 * تعديل الكورس
 * Update course
 * PATCH /api/courses/:courseId
 */
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

/**
 * رفع صورة غلاف الكورس
 * Upload course thumbnail
 * POST /api/courses/:courseId/thumbnail
 */
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

/**
 * حذف الكورس
 * Delete course
 * DELETE /api/courses/:courseId
 */
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

/**
 * إضافة Chapter للكورس
 * Add chapter to course
 * POST /api/courses/:courseId/chapters
 */
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

/**
 * حذف Chapter
 * Delete chapter
 * DELETE /api/courses/:courseId/chapters/:chapterId
 */
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

/**
 * إضافة Lesson للـ Chapter
 * Add lesson to chapter
 * POST /api/courses/:courseId/chapters/:chapterId/lessons
 */
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

/**
 * رفع محتوى الدرس (فيديو أو PDF)
 * Upload lesson content (video or PDF)
 * POST /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId/content
 */
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

/**
 * حذف Lesson
 * Delete lesson
 * DELETE /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId
 */
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

/**
 * إنشاء Assessment في نهاية Chapter
 * Create assessment at end of chapter
 * POST /api/courses/:courseId/chapters/:chapterId/assessments
 */
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

/**
 * حذف Assessment
 * Delete assessment
 * DELETE /api/courses/:courseId/chapters/:chapterId/assessments/:assessmentId
 */
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

module.exports = {
    createCourse,
    getTeacherCourses,
    getCourseDetails,
    updateCourse,
    uploadThumbnail,
    deleteCourse,
    createChapter,
    deleteChapter,
    createLesson,
    uploadLessonContent,
    deleteLesson,
    createAssessment,
    deleteAssessment
};
