const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { uploadThumbnail, uploadLessonContent, handleUploadError } = require('../middlewares/uploadMiddleware');
const axios = require('axios');

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
// search
// GET /api/courses/search?title=python&level=beginner


// جلب كورسات المتاحة للجميع (المنشورة فقط)

router.get('/my-progress', roleMiddleware('teacher'), courseController.getTeacherDashboard);
router.get(
    '/student-count',
    roleMiddleware('teacher'),
    courseController.getMyStudentCount
);

router.get('/available', authMiddleware, roleMiddleware('student'), courseController.getAvailableCourses);
router.get('/enrolled', authMiddleware, roleMiddleware('student'), courseController.getMyCourses);

router.get(
    '/search',
    roleMiddleware('teacher'),
    courseController.searchCourses
);

router.post('/', roleMiddleware('teacher'), courseController.createCourse);
router.get('/', roleMiddleware('teacher'), courseController.getTeacherCourses);
router.get('/:courseId', roleMiddleware('teacher', 'student'), courseController.getCourseDetails);
router.patch('/:courseId', roleMiddleware('teacher'), courseController.updateCourse);
router.patch('/:courseId/publish', roleMiddleware('teacher'), courseController.togglePublishStatus);
router.delete('/:courseId', roleMiddleware('teacher'), courseController.deleteCourse);

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

router.post('/:courseId/chapters', roleMiddleware('teacher'), courseController.createChapter);
router.delete('/:courseId/chapters/:chapterId', roleMiddleware('teacher'), courseController.deleteChapter);

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
// ============================================================
// ASSESSMENT EDIT OPERATIONS
// ============================================================

// PATCH  /api/courses/:courseId/chapters/:chapterId/assessments/:assessmentId
router.patch(
    '/:courseId/chapters/:chapterId/assessments/:assessmentId',
    roleMiddleware('teacher'),
    courseController.updateAssessment
);

// POST   /api/courses/:courseId/assessments/:assessmentId/questions
router.post(
    '/:courseId/assessments/:assessmentId/questions',
    roleMiddleware('teacher'),
    courseController.addQuestion
);

// PATCH  /api/courses/:courseId/assessments/:assessmentId/questions/:questionId
router.patch(
    '/:courseId/assessments/:assessmentId/questions/:questionId',
    roleMiddleware('teacher'),
    courseController.updateQuestion
);

// DELETE /api/courses/:courseId/assessments/:assessmentId/questions/:questionId
router.delete(
    '/:courseId/assessments/:assessmentId/questions/:questionId',
    roleMiddleware('teacher'),
    courseController.deleteQuestion
);
// PATCH /api/courses/:courseId/chapters/:chapterId
router.patch(
    '/:courseId/chapters/:chapterId',
    roleMiddleware('teacher'),
    courseController.updateChapter
);

// PATCH /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId
router.patch(
    '/:courseId/chapters/:chapterId/lessons/:lessonId',
    roleMiddleware('teacher'),
    courseController.updateLesson
);

// Submit assessment answers
router.post(
    '/assessments/:assessmentId/submit',
    authMiddleware,
    roleMiddleware('student'),
    courseController.submitAssessment
);

// Submit code for Boss Exam
router.post(
    '/assessments/:assessmentId/submit-code',
    authMiddleware,
    roleMiddleware('student'),
    courseController.submitBossExam
);

// Run sample tests for boss exam (NEW)
router.post('/assessments/:assessmentId/run-sample', authMiddleware, roleMiddleware('student'), async (req, res, next) => {
    try {
        const { code, language, test_cases } = req.body;
        const results = [];

        if (language === 'html' || language === 'css') {
            for (const tc of test_cases) {
                const passed = code.includes(tc.expected);
                results.push({ input: tc.input, expected: tc.expected, actual: passed ? tc.expected : 'NOT FOUND', passed });
            }
        } else {
            const ocLanguage = 'javascript';
            for (const tc of test_cases) {
                try {
                    const ocRes = await axios.post('https://onecompiler.com/api/code/exec', {
                        language: ocLanguage,
                        code: code,
                        stdin: tc.input
                    });
                    const output = (ocRes.data.stdout || ocRes.data.output || '').trim();
                    results.push({ input: tc.input, expected: tc.expected, actual: output, passed: output === tc.expected });
                } catch (e) {
                    results.push({ input: tc.input, expected: tc.expected, actual: 'Error', passed: false });
                }
            }
        }

        res.json({ success: true, results });
    } catch (err) { next(err); }
});

// 1. جلب قائمة الفصول لكورس معين (مع حالة القفل)
router.get('/:courseId/chapters', roleMiddleware('student'), courseController.getChapters);

// 2. جلب قائمة الدروس داخل فصل معين
router.get('/:courseId/chapters/:chapterId/lessons', roleMiddleware('student'), courseController.getLessons);


/**
 * مسارات الدروس والمحتوى (Lessons)
 */

// 3. جلب تفاصيل درس معين (الفيديو، PDF، إلخ)
router.get('/:courseId/lessons/:lessonId', roleMiddleware('student'), courseController.getLessonDetails);

// 4. إكمال الدرس وتحديث الـ XP والتقدم
router.post('/complete-lesson', roleMiddleware('student'), courseController.finishLesson);

/**
 * مسارات التقدم العام (Progress)
 */

// 5. جلب نسبة تقدم الطالب الحالية في الكورس
router.get('/:courseId/progress', roleMiddleware('student'), courseController.getProgress);

router.get(
    '/chapters/:chapterId/lessons',
    authMiddleware,
    roleMiddleware('teacher'),
    courseController.getChapterLessons
);
router.get('/:courseId/subdomain', authMiddleware, roleMiddleware('student'), courseController.getCourseSubdomain);
module.exports = router;
