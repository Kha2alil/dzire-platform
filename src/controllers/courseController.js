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
 * تغيير حالة الكورس (نشر / مسودة)
 * Toggle course publish status
 * PATCH /api/courses/:courseId/publish
 */
const togglePublishStatus = async (req, res, next) => {
    try {
        // نمرر حالة النشر الجديدة (true أو false) للـ Service
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
// ============================================================
// ASSESSMENT EDIT OPERATIONS
// ============================================================

/**
 * تعديل عنوان ونوع الاختبار
 * PATCH /api/courses/:courseId/chapters/:chapterId/assessments/:assessmentId
 */
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

/**
 * تعديل سؤال موجود
 * PATCH /api/courses/:courseId/assessments/:assessmentId/questions/:questionId
 */
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

/**
 * إضافة سؤال جديد
 * POST /api/courses/:courseId/assessments/:assessmentId/questions
 */
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

/**
 * حذف سؤال
 * DELETE /api/courses/:courseId/assessments/:assessmentId/questions/:questionId
 */
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
/**
 * تعديل بيانات الـ Chapter
 * PATCH /api/courses/:courseId/chapters/:chapterId
 */
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

/**
 * تعديل بيانات الـ Lesson
 * PATCH /api/courses/:courseId/chapters/:chapterId/lessons/:lessonId
 */
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
/**
 * البحث عن كورسات الأستاذ
 * GET /api/courses/search?title=python&level=beginner
 */
const searchCourses = async (req, res, next) => {
    try {
        const courses = await courseService.searchCourses(
            req.user.id,
            req.query  // title و level يأتيان من الـ URL
        );
        res.status(200).json({
            success: true,
            data: { courses }
        });
    } catch (error) {
        next(error);
    }
};



// جلب نسبة التقدم الحالية لعرضها في الواجهة (Dashboard/Course Page)
const getProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        const result = await courseService.getStudentCourseProgress(studentId, courseId);

        // ✅ الربط الصحيح: استخراج القيمة وإرسالها بالمسمى الذي يفهمه الـ Frontend
        res.status(200).json({
            success: true,
            progress: result.percentage // 👈 قمنا بتحويل percentage إلى progress هنا
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const updateProgress = async (req, res, next) => {
    try {
        const { courseId } = req.params; // نأخذ الكورس من الرابط /:courseId
        const studentId = req.user.id;   // نأخذ المعرف من التوكن (Auth Middleware)

        // ملاحظة: xp_reward يجب أن يرسل من الـ Frontend أو يجلب من قاعدة البيانات
        const { xp_reward } = req.body;

        // استدعاء الخدمة التي تقوم بالتحديث (XP + Percentage)
        const result = await courseService.trackProgress(studentId, courseId, xp_reward);

        res.status(200).json({
            success: true,
            message: "تم تحديث التقدم بنجاح",
            data: result
        });
    } catch (error) {
        // تمرير الخطأ للميدل وير العام (ErrorHandler)
        next(error);
    }
};
const getChapters = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // تعديل: نستخدم courseService بدلاً من chapterService
        const data = await courseService.getChaptersList(studentId, courseId);
        
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. جلب الدروس
const getLessons = async (req, res) => {
    try {
        const { courseId, chapterId } = req.params;
        const studentId = req.user.id; // استخراج المعرف من التوكن (JWT)

        // استدعاء الخدمة لمعالجة منطق الأقفال
        const lessons = await courseService.getLessonsList(studentId, courseId, chapterId);

        res.status(200).json({
            success: true,
            data: lessons
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. جلب المحتويات
const getLessonContents = async (req, res) => {
    try {
        const { courseId, chapterId, lessonId } = req.params;
        const studentId = req.user.id;

        // تعديل: نستخدم courseService بدلاً من contentService
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

        // الخدمة هنا تتحقق من أن الدرس ليس مغلقاً قبل إرسال البيانات
        const content = await courseService.getLessonContent(studentId, courseId, lessonId);

        res.status(200).json({
            success: true,
            data: content
        });
    } catch (error) {
        // نرسل 403 إذا كان منطق التكيف (Adaptive Logic) يمنع الوصول
        res.status(403).json({ success: false, message: error.message });
    }
};
// 4. جلب نسبة التقدم الحالية

// 5. إكمال الدرس (Action)
const finishLesson = async (req, res) => {
    try {
        // 1. استخراج البيانات من الطلب القادم من Postman
        const { courseId, chapterId, lessonId, xp_reward } = req.body;
        
        // 2. استخراج معرف الطالب من التوكن (عبر الميدل وير auth)
        const studentId = req.user.id;

        // 3. التحقق من وجود الحقول الأساسية لضمان عدم توقف السيرفر
        if (!courseId || !chapterId || !lessonId) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: courseId, chapterId, or lessonId" 
            });
        }

        // 4. استدعاء الخدمة (الالتزام بالاسم المتفق عليه)
        // تأكد أن الترتيب هنا يطابق الترتيب في ملف الـ Service
        const result = await courseService.finishLessonAndAwardXP(
            studentId, 
            courseId, 
            chapterId, 
            lessonId,
            xp_reward || 0
        );

        // 5. رد النجاح
        res.status(200).json({
            success: true,
            message: "Lesson completed successfully!",
            data: result
        });

    } catch (error) {
        // إذا رمت الخدمة خطأ (مثل: الدرس لا ينتمي للفصل)، سيتم التقاطه هنا
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};
// إضافة هذه الدوال في ملف courseController.js

// جلب الكورسات المتاحة للتسجيل
const getAvailableCourses = async (req, res) => {
    try {
        const courses = await courseService.getAllAvailableCourses();
        res.status(200).json({
            success: true,
            count: courses.length,
            data: { courses }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "خطأ في جلب الكورسات المتاحة",
            error: error.message
        });
    }
};
// جلب كورسات الطالب (My Courses)
const getMyCourses = async (req, res) => {
    try {
        const studentId = req.user.id; 
        const enrolledCourses = await courseService.getStudentDashboard(studentId);
        
        res.status(200).json({
            success: true,
            count: enrolledCourses.length,
            data: { courses: enrolledCourses }
        });
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
    updateQuestion,
    addQuestion,
    deleteQuestion,
    updateChapter,
    updateLesson,
    searchCourses ,
    getProgress,
    updateProgress,
    getChapters,
    getLessons,
    getLessonContents,
    getLessonDetails,
    finishLesson,
    getAvailableCourses,
    getMyCourses
};
