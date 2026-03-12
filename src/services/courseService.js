const courseRepository = require('../repositories/courseRepository');
const {
    validateCreateCourse,
    validateUpdateCourse,
    validateCreateChapter,
    validateCreateLesson,
    validateCreateAssessment
} = require('../validators/courseValidator');
const fs = require('fs');

// ============================================================
// COURSES
// ============================================================

/**
 * إنشاء كورس جديد
 * Create a new course
 *
 * @param {Object} teacherUser - المستخدم من req.user / User from req.user
 * @param {Object} courseData  - بيانات الكورس / Course data
 * @returns {Object} - الكورس المُنشأ / Created course
 */
const createCourse = async (teacherUser, courseData) => {

    // الخطوة 1: تحقق من البيانات
    // Step 1: Validate data
    const { valid, messages, value } = validateCreateCourse(courseData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    // الخطوة 2: أنشئ الكورس في DB
    // Step 2: Create the course in DB
    const course = await courseRepository.createCourse({
        ...value,
        teacher_id: teacherUser.id
    });

    return course;
};

/**
 * جلب كورسات الأستاذ
 * Get teacher's courses
 */
const getTeacherCourses = async (teacherId) => {
    return courseRepository.findCoursesByTeacher(teacherId);
};

/**
 * جلب تفاصيل كورس مع chapters ودروسه
 * Get course details with chapters and lessons
 */
const getCourseDetails = async (courseId, teacherId) => {

    // الخطوة 1: جلب الكورس
    // Step 1: Fetch the course
    const course = await courseRepository.findCourseById(courseId);
    if (!course) {
        const error = new Error('الكورس غير موجود / Course not found');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 2: تحقق أن الأستاذ هو صاحب الكورس
    // Step 2: Verify the teacher owns the course
    if (course.teacher_id !== teacherId) {
        const error = new Error('ليس لديك صلاحية لهذا الكورس / You do not have permission for this course');
        error.statusCode = 403;
        throw error;
    }

    // الخطوة 3: جلب الـ Chapters مع الدروس والتقييمات
    // Step 3: Fetch chapters with lessons and assessments
    const chapters = await courseRepository.findChaptersByCourse(courseId);

    const chaptersWithDetails = await Promise.all(
        chapters.map(async (chapter) => {
            const lessons     = await courseRepository.findLessonsByChapter(chapter.id);
            const assessments = await courseRepository.findAssessmentsByChapter(chapter.id);
            return { ...chapter, lessons, assessments };
        })
    );

    return { ...course, chapters: chaptersWithDetails };
};

/**
 * تعديل بيانات الكورس
 * Update course data
 */
const updateCourse = async (courseId, teacherId, updateData) => {

    // الخطوة 1: تحقق من البيانات
    const { valid, messages, value } = validateUpdateCourse(updateData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    // الخطوة 2: تحقق أن الكورس موجود ويملكه الأستاذ
    // Step 2: Verify course exists and teacher owns it
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 3: حدّث الكورس
    // Step 3: Update the course
    const updated = await courseRepository.updateCourse(courseId, value);
    if (!updated) {
        const error = new Error('فشل التحديث / Update failed');
        error.statusCode = 500;
        throw error;
    }

    return updated;
};

/**
 * تحديث صورة غلاف الكورس
 * Update course thumbnail
 */
const updateCourseThumbnail = async (courseId, teacherId, file) => {

    if (!file) {
        const error = new Error('لم يتم رفع أي صورة / No image uploaded');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 1: تحقق الملكية
    const course = await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: احذف الصورة القديمة إذا وُجدت
    // Step 2: Delete old thumbnail if it exists
    if (course.thumbnail_url) {
        const oldPath = course.thumbnail_url.replace('/uploads/', 'uploads/');
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    // الخطوة 3: احفظ المسار الجديد
    // Step 3: Save the new path
    const thumbnailUrl = `/uploads/thumbnails/${file.filename}`;
    await courseRepository.updateCourseThumbnail(courseId, thumbnailUrl);

    return { thumbnail_url: thumbnailUrl };
};

/**
 * حذف كورس
 * Delete a course
 */
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

// ============================================================
// CHAPTERS
// ============================================================

/**
 * إضافة Chapter للكورس
 * Add chapter to course
 */
const createChapter = async (courseId, teacherId, chapterData) => {

    const { valid, messages, value } = validateCreateChapter(chapterData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    await _verifyCourseOwnership(courseId, teacherId);

    return courseRepository.createChapter(courseId, value);
};

/**
 * حذف Chapter
 * Delete chapter
 */
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

// ============================================================
// LESSONS
// ============================================================

/**
 * إضافة Lesson للـ Chapter
 * Add lesson to chapter
 */
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

   return courseRepository.createLesson(chapterId, value, courseId);
};

/**
 * رفع محتوى الدرس (فيديو أو PDF)
 * Upload lesson content (video or PDF)
 */
const uploadLessonContent = async (courseId, chapterId, lessonId, teacherId, file) => {

    if (!file) {
        const error = new Error('لم يتم رفع أي ملف / No file uploaded');
        error.statusCode = 400;
        throw error;
    }

    await _verifyCourseOwnership(courseId, teacherId);

    // تحديد المجلد حسب نوع الملف
    // Determine folder based on file type
    const isVideo = file.mimetype.startsWith('video/');
    const folder  = isVideo ? 'videos' : 'pdfs';
    const contentUrl = `/uploads/${folder}/${file.filename}`;

    // جلب الدرس لحذف الملف القديم
    // Fetch lesson to delete old file
    const lesson = await courseRepository.findLessonById(lessonId);
    if (lesson && lesson.content_url) {
        const oldPath = lesson.content_url.replace('/uploads/', 'uploads/');
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    await courseRepository.updateLessonContent(lessonId, contentUrl);

    return { content_url: contentUrl };
};

/**
 * حذف Lesson
 * Delete lesson
 */
const deleteLesson = async (courseId, chapterId, lessonId, teacherId) => {

    await _verifyCourseOwnership(courseId, teacherId);

    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson || lesson.chapter_id !== chapterId) {
        const error = new Error('الدرس غير موجود / Lesson not found');
        error.statusCode = 404;
        throw error;
    }

    // احذف الملف من السيرفر أيضاً
    // Also delete the file from server
    if (lesson.content_url) {
        const filePath = lesson.content_url.replace('/uploads/', 'uploads/');
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    await courseRepository.deleteLesson(lessonId);
    return { message: 'تم حذف الدرس بنجاح / Lesson deleted successfully' };
};

// ============================================================
// ASSESSMENTS
// ============================================================

/**
 * إنشاء Assessment في نهاية Chapter
 * Create assessment at the end of a chapter
 */
const createAssessment = async (courseId, chapterId, teacherId, assessmentData) => {

    const { valid, messages, value } = validateCreateAssessment(assessmentData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    await _verifyCourseOwnership(courseId, teacherId);
    await _verifyChapterBelongsToCourse(chapterId, courseId);

    return courseRepository.createAssessment(chapterId, value, courseId); // ← أضف courseId
};

/**
 * حذف Assessment
 * Delete assessment
 */
const deleteAssessment = async (courseId, chapterId, assessmentId, teacherId) => {

    await _verifyCourseOwnership(courseId, teacherId);

    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment || assessment.chapter_id !== chapterId) {
        const error = new Error('الـ Assessment غير موجود / Assessment not found');
        error.statusCode = 404;
        throw error;
    }

    await courseRepository.deleteAssessment(assessmentId);
    return { message: 'تم حذف الـ Assessment بنجاح / Assessment deleted successfully' };
};

// ============================================================
// Helper Functions (خاصة بهذا الملف فقط / private to this file)
// ============================================================

/**
 * التحقق من ملكية الأستاذ للكورس
 * Verify teacher owns the course
 */
const _verifyCourseOwnership = async (courseId, teacherId) => {
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

    return course;
};

/**
 * التحقق أن الـ Chapter تابع للكورس
 * Verify chapter belongs to course
 */
const _verifyChapterBelongsToCourse = async (chapterId, courseId) => {
    const chapter = await courseRepository.findChapterById(chapterId);

    if (!chapter || chapter.course_id !== courseId) {
        const error = new Error('الـ Chapter لا ينتمي لهذا الكورس / Chapter does not belong to this course');
        error.statusCode = 404;
        throw error;
    }

    return chapter;
};

// ============================================================
// Exports
// ============================================================
module.exports = {
    createCourse,
    getTeacherCourses,
    getCourseDetails,
    updateCourse,
    updateCourseThumbnail,
    deleteCourse,
    createChapter,
    deleteChapter,
    createLesson,
    uploadLessonContent,
    deleteLesson,
    createAssessment,
    deleteAssessment
};
