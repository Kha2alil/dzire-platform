const express = require('express');
const router  = express.Router();

const courseController = require('../controllers/courseController');
const authMiddleware   = require('../middlewares/authMiddleware');
const roleMiddleware   = require('../middlewares/roleMiddleware');
const { uploadThumbnail, uploadLessonContent, handleUploadError } = require('../middlewares/uploadMiddleware');

// ============================================================
// كل الـ Routes تتطلب تسجيل دخول
// All routes require authentication
// ============================================================
router.use(authMiddleware);

// ============================================================
// COURSES — إدارة الكورسات
// ============================================================

// POST   /api/courses              → إنشاء كورس جديد / Create new course
// GET    /api/courses              → جلب كورسات الأستاذ / Get teacher's courses
// GET    /api/courses/:courseId    → تفاصيل كورس / Course details
// PATCH  /api/courses/:courseId    → تعديل الكورس / Update course
// DELETE /api/courses/:courseId    → حذف الكورس / Delete course
// POST   /api/courses/:courseId/thumbnail → رفع صورة الغلاف / Upload thumbnail

router.post(   '/',          roleMiddleware('teacher'), courseController.createCourse);
router.get(    '/',          roleMiddleware('teacher'), courseController.getTeacherCourses);
router.get(    '/:courseId', roleMiddleware('teacher'), courseController.getCourseDetails);
router.patch(  '/:courseId', roleMiddleware('teacher'), courseController.updateCourse);
router.delete( '/:courseId', roleMiddleware('teacher'), courseController.deleteCourse);

router.post(
    '/:courseId/thumbnail',
    roleMiddleware('teacher'),
    uploadThumbnail,
    handleUploadError,
    courseController.uploadThumbnail
);

// ============================================================
// CHAPTERS — إدارة الـ Chapters
// ============================================================

// POST   /api/courses/:courseId/chapters/:chapterId → إضافة Chapter / Add chapter
// DELETE /api/courses/:courseId/chapters/:chapterId → حذف Chapter / Delete chapter

router.post(   '/:courseId/chapters',             roleMiddleware('teacher'), courseController.createChapter);
router.delete( '/:courseId/chapters/:chapterId',  roleMiddleware('teacher'), courseController.deleteChapter);

// ============================================================
// LESSONS — إدارة الدروس
// ============================================================

// POST   /api/courses/:courseId/chapters/:chapterId/lessons                         → إضافة درس
// DELETE /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId               → حذف درس
// POST   /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId/content       → رفع فيديو/PDF

router.post(
    '/:courseId/chapters/:chapterId/lessons',
    roleMiddleware('teacher'),
    courseController.createLesson
);

router.delete(
    '/:courseId/chapters/:chapterId/lessons/:lessonId',
    roleMiddleware('teacher'),
    courseController.deleteLesson
);

router.post(
    '/:courseId/chapters/:chapterId/lessons/:lessonId/content',
    roleMiddleware('teacher'),
    uploadLessonContent,
    handleUploadError,
    courseController.uploadLessonContent
);

// ============================================================
// ASSESSMENTS — إدارة الاختبارات
// ============================================================

// POST   /api/courses/:courseId/chapters/:chapterId/assessments                     → إنشاء Assessment
// DELETE /api/courses/:courseId/chapters/:chapterId/assessments/:assessmentId       → حذف Assessment

router.post(
    '/:courseId/chapters/:chapterId/assessments',
    roleMiddleware('teacher'),
    courseController.createAssessment
);

router.delete(
    '/:courseId/chapters/:chapterId/assessments/:assessmentId',
    roleMiddleware('teacher'),
    courseController.deleteAssessment
);

module.exports = router;
