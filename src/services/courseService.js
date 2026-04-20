const courseRepository = require('../repositories/courseRepository');
const db = require('../config/database.js'); // أو المسار الذي يحتوي على ملف الاتصال بـ MySQL

const {
    validateCreateCourse,
    validateUpdateCourse,
    validateCreateChapter,
    validateCreateLesson,
    validateCreateAssessment
} = require('../validators/courseValidator');
const fs = require('fs');
const { get } = require('http');

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
    const { valid, messages, value } = validateCreateCourse(courseData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    // ✅ teacher_id + all validated fields including default_xp_reward
    const course = await courseRepository.createCourse({
        ...value,
        teacher_id: teacherUser.id,
        thumbnail_url: value.thumbnail_url || null  
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
    const course = await courseRepository.findCourseById(courseId);
    if (!course) {
        const error = new Error('الكورس غير موجود / Course not found');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 2: تحقق أن الأستاذ هو صاحب الكورس
    if (course.teacher_id !== teacherId) {
        const error = new Error('ليس لديك صلاحية لهذا الكورس / You do not have permission for this course');
        error.statusCode = 403;
        throw error;
    }

    // الخطوة 3: جلب الـ Chapters مع الدروس والتقييمات والأسئلة
    const chapters = await courseRepository.findChaptersByCourse(courseId);

    const chaptersWithDetails = await Promise.all(
        chapters.map(async (chapter) => {
            const lessons = await courseRepository.findLessonsByChapter(chapter.id);
            const assessments = await courseRepository.findAssessmentsByChapter(chapter.id);

            // 💡 التعديل هنا: جلب الأسئلة لكل اختبار
            const assessmentsWithQuestions = await Promise.all(
                assessments.map(async (assessment) => {
                    const questions = await courseRepository.findQuestionsByAssessmentId(assessment.id);
                    return { ...assessment, questions };
                })
            );

            return {
                ...chapter,
                lessons,
                assessments: assessmentsWithQuestions // نمرر الاختبارات بأسئلتها
            };
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
 * تغيير حالة النشر للكورس (منشور / مسودة)
 * Toggle course publish status
 */
const toggleCoursePublishStatus = async (courseId, teacherId, isPublished) => {

    // الخطوة 1: تحقق من الملكية (هل الأستاذ هو صاحب الكورس؟)
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: تحقق أن القيمة المُرسلة صحيحة (True أو False)
    if (typeof isPublished !== 'boolean') {
        const error = new Error('قيمة غير صالحة، يجب أن تكون true أو false');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 3: تحديث الحقل is_published في قاعدة البيانات
    const updated = await courseRepository.updateCourse(courseId, { is_published: isPublished });

    if (!updated) {
        const error = new Error('فشل تحديث حالة الكورس');
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
/**
 * رفع محتوى الدرس (فيديو أو PDF)
 */
const uploadLessonContent = async (courseId, chapterId, lessonId, teacherId, file) => {
    // 1. التحقق من ملكية الأستاذ للكورس (للحماية)
    const course = await courseRepository.findCourseById(courseId);
    if (!course || course.teacher_id !== teacherId) {
        throw new Error('غير مسموح لك بتعديل هذا الكورس / Unauthorized');
    }

    if (!file) {
        throw new Error('لم يتم رفع أي ملف / No file uploaded');
    }

    // 2. تحديد المسار بناءً على نوع الملف
    const folder = file.mimetype.startsWith('video/') ? 'videos' : 'pdfs';
    const fileUrl = `/uploads/${folder}/${file.filename}`;

    const updateData = {};
    if (file.mimetype.startsWith('video/')) {
        updateData.video_url = fileUrl;
    } else if (file.mimetype === 'application/pdf') {
        updateData.pdf_url = fileUrl;
    }

    // 3. تحديث قاعدة البيانات عبر الـ Repository
    const success = await courseRepository.updateLessonContent(lessonId, updateData);

    if (!success) {
        throw new Error('فشل تحديث بيانات الدرس / Failed to update lesson');
    }

    return {
        url: fileUrl,
        type: file.mimetype
    };
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
// ASSESSMENT EDIT OPERATIONS
// ============================================================

/**
 * تعديل عنوان ونوع الاختبار
 * Update assessment title and type
 */
const updateAssessment = async (courseId, chapterId, assessmentId, teacherId, updateData) => {

    // الخطوة 1: تحقق من الملكية
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: تحقق أن الاختبار موجود وتابع للـ chapter
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment || assessment.chapter_id !== chapterId) {
        const error = new Error('الاختبار غير موجود');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: تحقق من البيانات
    if (!updateData.title && !updateData.type) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }

    if (updateData.type && !['quiz', 'final_exam'].includes(updateData.type)) {
        const error = new Error('نوع الاختبار يجب أن يكون quiz أو final_exam');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 4: حدّث الاختبار
    return courseRepository.updateAssessment(assessmentId, updateData);
};

/**
 * تعديل سؤال موجود
 * Update existing question
 */
const updateQuestion = async (courseId, assessmentId, questionId, teacherId, updateData) => {

    // الخطوة 1: تحقق من الملكية
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: تحقق أن السؤال موجود وتابع للاختبار
    const question = await courseRepository.findQuestionById(questionId);
    if (!question || question.assessment_id !== assessmentId) {
        const error = new Error('السؤال غير موجود');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: تحقق أن البيانات غير فارغة
    if (Object.keys(updateData).length === 0) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 4: حدّث السؤال
    return courseRepository.updateQuestion(questionId, updateData);
};

/**
 * إضافة سؤال جديد لاختبار موجود
 * Add new question to existing assessment
 */
const addQuestion = async (courseId, assessmentId, teacherId, questionData) => {

    // الخطوة 1: تحقق من الملكية
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: تحقق أن الاختبار موجود
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment) {
        const error = new Error('الاختبار غير موجود');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: تحقق من البيانات
    if (!questionData.question_text || !questionData.options || !questionData.correct_answer) {
        const error = new Error('question_text و options و correct_answer إجبارية');
        error.statusCode = 400;
        throw error;
    }

    if (!Array.isArray(questionData.options) || questionData.options.length < 2) {
        const error = new Error('يجب وجود خيارين على الأقل');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 4: أضف السؤال
    return courseRepository.addQuestion(assessmentId, questionData);
};

/**
 * حذف سؤال
 * Delete question
 */
const deleteQuestion = async (courseId, assessmentId, questionId, teacherId) => {

    // الخطوة 1: تحقق من الملكية
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: تحقق أن السؤال موجود وتابع للاختبار
    const question = await courseRepository.findQuestionById(questionId);
    if (!question || question.assessment_id !== assessmentId) {
        const error = new Error('السؤال غير موجود');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: احذف السؤال
    await courseRepository.deleteQuestion(questionId);
    return { message: 'تم حذف السؤال بنجاح' };
};
/**
 * تعديل بيانات الـ Chapter
 * Update chapter data
 */
const updateChapter = async (courseId, chapterId, teacherId, updateData) => {

    // الخطوة 1: تحقق من الملكية
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: تحقق أن الـ chapter موجود وتابع للكورس
    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId) {
        const error = new Error('الـ Chapter غير موجود');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: تحقق أن البيانات غير فارغة
    if (!updateData.title && updateData.order_index === undefined) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 4: حدّث الـ chapter
    return courseRepository.updateChapter(chapterId, updateData);
};

/**
 * تعديل بيانات الـ Lesson
 * Update lesson data
 */
const updateLesson = async (courseId, chapterId, lessonId, teacherId, updateData) => {

    // الخطوة 1: تحقق من الملكية
    await _verifyCourseOwnership(courseId, teacherId);

    // الخطوة 2: تحقق أن الـ lesson موجود وتابع للـ chapter
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson || lesson.chapter_id !== chapterId) {
        const error = new Error('الدرس غير موجود');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: تحقق أن البيانات غير فارغة
    if (Object.keys(updateData).length === 0) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 4: تحقق من content_type إذا أُرسل
    if (updateData.content_type && !['video', 'pdf'].includes(updateData.content_type)) {
        const error = new Error('نوع المحتوى يجب أن يكون video أو pdf');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 5: حدّث الدرس
    return courseRepository.updateLesson(lessonId, updateData);
};

/**
 * البحث عن كورسات الأستاذ
 * Search teacher's courses
 */
const searchCourses = async (teacherId, filters) => {

    // تحقق أن فلتر واحد على الأقل موجود
    if (!filters.title && !filters.level) {
        const error = new Error('يجب إرسال title أو level للبحث');
        error.statusCode = 400;
        throw error;
    }

    // تحقق من صحة المستوى إذا أُرسل
    if (filters.level && !['beginner', 'intermediate', 'advanced'].includes(filters.level)) {
        const error = new Error('المستوى يجب أن يكون beginner أو intermediate أو advanced');
        error.statusCode = 400;
        throw error;
    }

    return courseRepository.searchCourses(teacherId, filters);
};
const getStudentCourseProgress = async (studentId, courseId) => {
    try {
        const enrollment = await courseRepository.getEnrollmentData(studentId, courseId);

        if (!enrollment) {

            return {
                percentage: 0,
                last_accessed: null,
                isEnrolled: false
            };
        }

        return {

            percentage: parseFloat(enrollment.progress_percentage) || 0,
            last_accessed: enrollment.last_accessed || null,
            isEnrolled: true
        };

    } catch (error) {
        console.error("Error in courseService.getStudentCourseProgress:", error.message);
        throw error;
    }
};

const trackProgress = async (userId, courseId) => {
    if (!userId || !courseId) {
        throw new Error("UserID and CourseID are required to track progress");
    }
    const newPercentage = await courseRepository.updateEnrollmentProgress(userId, courseId);

    return {
        success: true,
        updatedProgress: `${newPercentage.toFixed(2)}%`,
        isCompleted: newPercentage >= 100
    };
};

const getChaptersList = async (studentId, courseId) => {
    const chapters = await courseRepository.getAllChapters(courseId);

    return await Promise.all(chapters.map(async (chapter, index) => {
        // 1. الفصل الأول مفتوح دائماً كبداية
        if (chapter.order_index === 1) return { ...chapter, is_locked: false };

        // 2. الوصول للفصل السابق
        const previousChapter = chapters[index - 1];

        // 3. التحقق من نتيجة الطالب في اختبار الفصل السابق
        const assessmentResult = await courseRepository.getAssessmentResult(studentId, previousChapter.id);

        // 4. منطق القفل:
        // يغلق الفصل إذا لم يوجد سجل اختبار، أو إذا كانت الحالة ليست 'passed'
        const isLocked = !assessmentResult || assessmentResult.status !== 'passed';

        return {
            ...chapter,
            is_locked: isLocked
        };
    }));
};
const getLessonsList = async (studentId, courseId, chapterId) => {
    // 1. جلب البيانات من الـ Repository
    const lessons = await courseRepository.getLessonsByChapter(chapterId);
    const enrollment = await courseRepository.getEnrollmentData(studentId, courseId);
    const totalInCourse = await courseRepository.getTotalCourseLessons(courseId);

    // 2. حسابات التقدم
    const currentProgress = enrollment?.progress_percentage || 0;
    const lessonWeight = 100 / (totalInCourse || 1);

    // 3. تحديد حالة كل درس (مفتوح/مغلق)
    return lessons.map(lesson => {
        // الدرس الأول مفتوح دائماً، البقية تعتمد على التقدم الحالي
        const requiredProgress = (lesson.order_index - 1) * lessonWeight;

        return {
            ...lesson,
            is_locked: lesson.order_index > 1 && currentProgress < (requiredProgress - 0.5)
        };
    });
};

const getLessonContent = async (studentId, courseId, lessonId) => {
    // 1. جلب بيانات الدرس والتقدم وإجمالي الدروس
    const lesson = await courseRepository.getLessonById(lessonId);
    const enrollment = await courseRepository.getEnrollmentData(studentId, courseId);
    const totalLessons = await courseRepository.getTotalCourseLessons(courseId);

    if (!lesson) throw new Error("الدرس غير موجود");

    // 2. حساب "الوزن" والنسبة المطلوبة لفتح هذا الدرس
    const currentProgress = enrollment?.progress_percentage || 0;
    const lessonWeight = 100 / (totalLessons || 1);
    const requiredProgress = (lesson.order_index - 1) * lessonWeight;

    // 3. فحص الأمان: منع الوصول إذا كان الدرس مغلقاً (إلا الدرس الأول)
    if (lesson.order_index > 1 && currentProgress < (requiredProgress - 0.5)) {
        throw new Error("هذا الدرس مغلق حالياً، أكمل الدروس السابقة أولاً");
    }

    // 4. تنسيق النتيجة النهائية للـ Frontend
    return {
        title: lesson.title,
        video: lesson.video_url || lesson.content_url, // دعم العمودين حسب جدولك
        pdf: lesson.pdf_url,
        description: lesson.summary_text,
        xp: lesson.xp_reward
    };
};




const getFormattedContents = async (studentId, courseId, chapterId, lessonId) => {
    // 1. جلب المحتويات الخام
    const rawData = await courseRepository.getRawContentsByLesson(courseId, chapterId, lessonId);
    if (rawData.length === 0) throw new Error("No contents found for this lesson");

    // 2. التحقق من حالة القفل (Security Check)
    const [enrollment] = await db.query(
        "SELECT progress_percentage FROM enrollments WHERE student_id = ? AND course_id = ?",
        [studentId, courseId]
    );
    const currentProgress = enrollment[0]?.progress_percentage || 0;

    const [totalInCourse] = await db.query("SELECT COUNT(*) as count FROM lessons WHERE course_id = ?", [courseId]);
    const lessonWeight = 100 / (totalInCourse[0].count || 1);

    const lessonOrder = rawData[0].order_index;
    const requiredProgress = (lessonOrder - 1) * lessonWeight;

    if (lessonOrder > 1 && currentProgress < (requiredProgress - 0.5)) {
        throw new Error("Locked: Complete previous lessons to unlock this content");
    }

    // 3. توزيع المحتويات حسب النوع (كما طلبت في البداية)
    return {
        video: rawData.find(item => item.content_type === 'video') || null,
        pdf: rawData.find(item => item.content_type === 'pdf') || null,
        quiz: rawData.find(item => item.content_type === 'quiz') || null,
        xp_reward: rawData[0].xp_reward // المكافأة التي سينالها عند الضغط على "إكمال"
    };
};


const finishLessonAndAwardXP = async (studentId, courseId, chapterId, lessonId, xp_reward) => {
    // 1. جلب بيانات الدرس أولاً لمعرفة ترتيبه (order_index)
    const lesson = await courseRepository.getLessonById(lessonId);

    if (!lesson) {
        console.error(`Lesson not found: ${lessonId}`);
        throw new Error("the lesson does not exist");
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 2. محاولة تحديث التقدم (ستنجح فقط إذا كان الدرس جديداً على الطالب)
        const isUpdated = await courseRepository.updateEnrollmentProgress(
            connection,
            studentId,
            courseId,
            lesson.order_index
        );

        if (isUpdated) {
            // 3. نزيد الـ XP فقط إذا زاد التقدم (أي أن الدرس لم يسبق إكماله)
            await courseRepository.updateStudentXP(connection, studentId, xp_reward);
            await connection.commit();
            return { message: "Great! Progress updated and XP awarded" };
        } else {
            // إذا لم يتأثر أي سطر، فهذا يعني أن الطالب أعاد درساً قديماً
            await connection.rollback();
            return { message: "You have already completed this lesson, no new XP to award" };
        }
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// في ملف courseService.js
const getAvailableCourses = async (studentId) => {
    return await courseRepository.findAvailableCourses(studentId);
};
// داخل courseService.js
const getStudentDashboard = async (studentId) => {
    // جلب الكورسات المسجل فيها الطالب مع تقدمه
    const enrolledCourses = await courseRepository.findEnrolledCoursesByStudent(studentId);
    
    // يمكنك هنا إضافة أي منطق إضافي إذا أردت، مثل معالجة الصور
    return enrolledCourses;
};



const getTeacherStats = async (teacherId) => {
    const studentCount = await courseRepository.getTeacherStudentCount(teacherId);
    return {
        teacherId,
        totalStudents: studentCount
    };
};

const getStudentsStatsForTeacher = async (teacherId) => {
    // 1. جلب البيانات الخام من الـ Repository
    const rawData = await courseRepository.getStudentProgressInCourses(teacherId);

    // 2. معالجة البيانات (Data Transformation)
    const formattedData = rawData.map(record => {
        return {
            studentName: record.Student,
            courseTitle: record.Course,
            // التأكد من وجود قيمة للتقدم وتحويلها لنص منسق
            progress: `${record.Progress || 0}%`,
            // إذا لم يكن للطالب نقاط XP نضع 0
            xp: record.XP || 0,
            // إذا لم يتحدد مستوى الطالب في نظام الجيمنج نضع 'N/A'
            level: record.Level || 'N/A',
            // تنسيق تاريخ آخر نشاط ليكون مقروءاً
            lastActive: record.Last_Active 
                ? new Date(record.Last_Active).toLocaleString('en-GB') 
                : 'No activity yet',
            // تحديد الحالة مع جعل أول حرف كبير
            status: record.Status ? record.Status.charAt(0).toUpperCase() + record.Status.slice(1) : 'Unknown'
        };
    });

    return formattedData;
};
// ============================================================
// Exports
// ============================================================
module.exports = {
    createCourse,
    getTeacherCourses,
    getCourseDetails,
    updateCourse,
    toggleCoursePublishStatus,
    updateCourseThumbnail,
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
    searchCourses,
    getStudentCourseProgress,
    trackProgress,
    getChaptersList,
    getLessonsList,
    getLessonContent,
    getFormattedContents,
    finishLessonAndAwardXP,
    getAvailableCourses,
    getStudentDashboard,
    getTeacherStats ,
    getStudentsStatsForTeacher

};
