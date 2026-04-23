const courseRepository = require('../repositories/courseRepository');
const db = require('../config/database.js');

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

const createCourse = async (teacherUser, courseData) => {
    const { valid, messages, value } = validateCreateCourse(courseData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    const course = await courseRepository.createCourse({
        ...value,
        teacher_id: teacherUser.id,
        thumbnail_url: value.thumbnail_url || null
    });

    return course;
};

const getTeacherCourses = async (teacherId) => {
    return courseRepository.findCoursesByTeacher(teacherId);
};

const getCourseDetails = async (courseId, teacherId) => {
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

    const chapters = await courseRepository.findChaptersByCourse(courseId);

    const chaptersWithDetails = await Promise.all(
        chapters.map(async (chapter) => {
            const lessons = await courseRepository.findLessonsByChapter(chapter.id);
            const assessments = await courseRepository.findAssessmentsByChapter(chapter.id);

            const assessmentsWithQuestions = await Promise.all(
                assessments.map(async (assessment) => {
                    const questions = await courseRepository.findQuestionsByAssessmentId(assessment.id);
                    return { ...assessment, questions };
                })
            );

            return {
                ...chapter,
                lessons,
                assessments: assessmentsWithQuestions
            };
        })
    );

    return { ...course, chapters: chaptersWithDetails };
};

const updateCourse = async (courseId, teacherId, updateData) => {
    const { valid, messages, value } = validateUpdateCourse(updateData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    await _verifyCourseOwnership(courseId, teacherId);

    const updated = await courseRepository.updateCourse(courseId, value);
    if (!updated) {
        const error = new Error('فشل التحديث / Update failed');
        error.statusCode = 500;
        throw error;
    }

    return updated;
};

const toggleCoursePublishStatus = async (courseId, teacherId, isPublished) => {
    await _verifyCourseOwnership(courseId, teacherId);

    if (typeof isPublished !== 'boolean') {
        const error = new Error('قيمة غير صالحة، يجب أن تكون true أو false');
        error.statusCode = 400;
        throw error;
    }

    const updated = await courseRepository.updateCourse(courseId, { is_published: isPublished });

    if (!updated) {
        const error = new Error('فشل تحديث حالة الكورس');
        error.statusCode = 500;
        throw error;
    }

    return updated;
};

const updateCourseThumbnail = async (courseId, teacherId, file) => {
    if (!file) {
        const error = new Error('لم يتم رفع أي صورة / No image uploaded');
        error.statusCode = 400;
        throw error;
    }

    const course = await _verifyCourseOwnership(courseId, teacherId);

    if (course.thumbnail_url) {
        const oldPath = course.thumbnail_url.replace('/uploads/', 'uploads/');
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    const thumbnailUrl = `/uploads/thumbnails/${file.filename}`;
    await courseRepository.updateCourseThumbnail(courseId, thumbnailUrl);

    return { thumbnail_url: thumbnailUrl };
};

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

const uploadLessonContent = async (courseId, chapterId, lessonId, teacherId, file) => {
    const course = await courseRepository.findCourseById(courseId);
    if (!course || course.teacher_id !== teacherId) {
        throw new Error('غير مسموح لك بتعديل هذا الكورس / Unauthorized');
    }

    if (!file) {
        throw new Error('لم يتم رفع أي ملف / No file uploaded');
    }

    const folder = file.mimetype.startsWith('video/') ? 'videos' : 'pdfs';
    const fileUrl = `/uploads/${folder}/${file.filename}`;

    const updateData = {};
    if (file.mimetype.startsWith('video/')) {
        updateData.video_url = fileUrl;
    } else if (file.mimetype === 'application/pdf') {
        updateData.pdf_url = fileUrl;
    }

    const success = await courseRepository.updateLessonContent(lessonId, updateData);

    if (!success) {
        throw new Error('فشل تحديث بيانات الدرس / Failed to update lesson');
    }

    return {
        url: fileUrl,
        type: file.mimetype
    };
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

    const { lesson_id } = assessmentData;

    return courseRepository.createAssessment(chapterId, value, courseId, lesson_id);
};

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
// Helper Functions
// ============================================================

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

const updateAssessment = async (courseId, chapterId, assessmentId, teacherId, updateData) => {
    await _verifyCourseOwnership(courseId, teacherId);

    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment || assessment.chapter_id !== chapterId) {
        const error = new Error('الاختبار غير موجود');
        error.statusCode = 404;
        throw error;
    }

    if (!updateData.title && !updateData.type && updateData.passing_score === undefined && updateData.lesson_id === undefined && !updateData.questions) {
        const error = new Error('يجب إرسال حقل واحد على الأقل للتحديث');
        error.statusCode = 400;
        throw error;
    }

    if (updateData.type && !['quiz', 'final_exam'].includes(updateData.type)) {
        const error = new Error('نوع الاختبار يجب أن يكون quiz أو final_exam');
        error.statusCode = 400;
        throw error;
    }

    return courseRepository.updateAssessment(assessmentId, updateData);
};

const updateQuestion = async (courseId, assessmentId, questionId, teacherId, updateData) => {
    await _verifyCourseOwnership(courseId, teacherId);

    const question = await courseRepository.findQuestionById(questionId);
    if (!question || question.assessment_id !== assessmentId) {
        const error = new Error('السؤال غير موجود');
        error.statusCode = 404;
        throw error;
    }

    if (Object.keys(updateData).length === 0) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }

    return courseRepository.updateQuestion(questionId, updateData);
};

const addQuestion = async (courseId, assessmentId, teacherId, questionData) => {
    await _verifyCourseOwnership(courseId, teacherId);

    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment) {
        const error = new Error('الاختبار غير موجود');
        error.statusCode = 404;
        throw error;
    }

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

    return courseRepository.addQuestion(assessmentId, questionData);
};

const deleteQuestion = async (courseId, assessmentId, questionId, teacherId) => {
    await _verifyCourseOwnership(courseId, teacherId);

    const question = await courseRepository.findQuestionById(questionId);
    if (!question || question.assessment_id !== assessmentId) {
        const error = new Error('السؤال غير موجود');
        error.statusCode = 404;
        throw error;
    }

    await courseRepository.deleteQuestion(questionId);
    return { message: 'تم حذف السؤال بنجاح' };
};

const updateChapter = async (courseId, chapterId, teacherId, updateData) => {
    await _verifyCourseOwnership(courseId, teacherId);

    const chapter = await courseRepository.findChapterById(chapterId);
    if (!chapter || chapter.course_id !== courseId) {
        const error = new Error('الـ Chapter غير موجود');
        error.statusCode = 404;
        throw error;
    }

    if (!updateData.title && updateData.order_index === undefined) {
        const error = new Error('يجب إرسال حقل واحد على الأقل');
        error.statusCode = 400;
        throw error;
    }

    return courseRepository.updateChapter(chapterId, updateData);
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

    return courseRepository.updateLesson(lessonId, updateData);
};

const searchCourses = async (teacherId, filters) => {
    if (!filters.title && !filters.level) {
        const error = new Error('يجب إرسال title أو level للبحث');
        error.statusCode = 400;
        throw error;
    }

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
        if (chapter.order_index === 1) return { ...chapter, is_locked: false };

        const previousChapter = chapters[index - 1];

        const assessmentResult = await courseRepository.getAssessmentResult(studentId, previousChapter.id);

        const isLocked = !assessmentResult || assessmentResult.status !== 'passed';

        return {
            ...chapter,
            is_locked: isLocked
        };
    }));
};

const getLessonsList = async (studentId, courseId, chapterId) => {
    const lessons = await courseRepository.getLessonsByChapter(chapterId);
    const enrollment = await courseRepository.getEnrollmentData(studentId, courseId);
    const totalInCourse = await courseRepository.getTotalCourseLessons(courseId);

    const currentProgress = enrollment?.progress_percentage || 0;
    const lessonWeight = 100 / (totalInCourse || 1);

    return lessons.map(lesson => {
        const requiredProgress = (lesson.order_index - 1) * lessonWeight;

        return {
            ...lesson,
            is_locked: lesson.order_index > 1 && currentProgress < (requiredProgress - 0.5)
        };
    });
};

const getLessonContent = async (studentId, courseId, lessonId) => {
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

    return {
        video: rawData.find(item => item.content_type === 'video') || null,
        pdf: rawData.find(item => item.content_type === 'pdf') || null,
        quiz: rawData.find(item => item.content_type === 'quiz') || null,
        xp_reward: rawData[0].xp_reward
    };
};

const finishLessonAndAwardXP = async (studentId, courseId, chapterId, lessonId, xp_reward) => {
    const lesson = await courseRepository.getLessonById(lessonId);
    if (!lesson) {
        console.error(`Lesson not found: ${lessonId}`);
        throw new Error("The lesson does not exist");
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const isUpdated = await courseRepository.updateEnrollmentProgress(
            connection,
            studentId,
            courseId,
            lesson.order_index
        );

        if (isUpdated) {
            await courseRepository.updateStudentXP(connection, studentId, xp_reward);
            await connection.commit();

            const progressAggregator = require('./progressAggregator');

            await progressAggregator.handleLessonCompleted(studentId, courseId, lessonId, xp_reward)
                .catch(err => console.error('Badge evaluation failed:', err.message));

            const enrollment = await courseRepository.getEnrollmentData(studentId, courseId);
            if (enrollment && enrollment.progress_percentage >= 100) {
                await progressAggregator.handleCourseCompleted(studentId, courseId)
                    .catch(err => console.error('Course completion handling failed:', err.message));

                const skillService = require('./skillService');
                skillService.unlockSkillIfCourseCompleted(studentId, courseId)
                    .catch(err => console.error('Skill unlock failed:', err.message));
            }

            return { message: "Great! Progress updated and XP awarded" };
        } else {
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

const getAvailableCourses = async (studentId) => {
    return await courseRepository.findAvailableCourses(studentId);
};

const getStudentDashboard = async (studentId) => {
    const enrolledCourses = await courseRepository.findEnrolledCoursesByStudent(studentId);
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
    const rawData = await courseRepository.getStudentProgressInCourses(teacherId);

    const formattedData = rawData.map(record => {
        return {
            studentName: record.Student,
            courseTitle: record.Course,
            progress: `${record.Progress || 0}%`,
            xp: record.XP || 0,
            level: record.Level || 'N/A',
            lastActive: record.Last_Active
                ? new Date(record.Last_Active).toLocaleString('en-GB')
                : 'No activity yet',
            status: record.Status ? record.Status.charAt(0).toUpperCase() + record.Status.slice(1) : 'Unknown'
        };
    });

    return formattedData;
};

// ============================================================
// ASSESSMENT SUBMISSION
// ============================================================

const submitAssessment = async (studentId, assessmentId, answers) => {
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment) {
        const error = new Error('Assessment not found');
        error.statusCode = 404;
        throw error;
    }

    const alreadyPassed = await _hasAlreadyPassedAssessment(studentId, assessmentId);
    if (alreadyPassed) {
        return {
            alreadyPassed: true,
            message: 'You have already passed this assessment'
        };
    }

    const questions = await courseRepository.findQuestionsByAssessmentId(assessmentId);
    if (!questions.length) {
        const error = new Error('No questions found for this assessment');
        error.statusCode = 404;
        throw error;
    }

    const score = _gradeSubmission(questions, answers);
    const passingScore = assessment.passing_score || 60;
    const passed = score >= passingScore;

    await _saveStudentAssessment(studentId, assessmentId, score, passed);

    if (passed) {
        const progressAggregator = require('./progressAggregator');
        await progressAggregator.handleQuizPassed(studentId, assessmentId, score, passed)
            .catch(err => console.error('Quiz badge evaluation failed:', err.message));
    }

    return {
        success: true,
        score,
        passed,
        passingScore,
        message: passed ? 'Congratulations! You passed the assessment.' : 'You did not pass. Try again!'
    };
};

const _hasAlreadyPassedAssessment = async (studentId, assessmentId) => {
    const [rows] = await db.query(
        `SELECT id FROM student_assessments
         WHERE student_id = ? AND assessment_id = ? AND passed = TRUE`,
        [studentId, assessmentId]
    );
    return rows.length > 0;
};

const _saveStudentAssessment = async (studentId, assessmentId, score, passed) => {
    await db.query(
        `INSERT INTO student_assessments (student_id, assessment_id, score, passed)
         VALUES (?, ?, ?, ?)`,
        [studentId, assessmentId, score, passed]
    );
};

const _gradeSubmission = (questions, studentAnswers) => {
    let totalPoints = 0;
    let earnedPoints = 0;

    const questionMap = new Map(questions.map(q => [q.id, q]));

    for (const answer of studentAnswers) {
        const question = questionMap.get(answer.questionId);
        if (!question) continue;

        totalPoints += question.points || 1;
        if (answer.selectedAnswer === question.correct_answer) {
            earnedPoints += question.points || 1;
        }
    }

    for (const q of questions) {
        if (!studentAnswers.some(a => a.questionId === q.id)) {
            totalPoints += q.points || 1;
        }
    }

    const scorePercent = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    return parseFloat(scorePercent.toFixed(2));
};

// ============================================================
// ADDITIONAL FUNCTIONS (from dev branch)
// ============================================================

const getAssessmentWithQuestions = async (assessmentId) => {
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment) {
        const error = new Error('Assessment not found');
        error.statusCode = 404;
        throw error;
    }

    const questions = await courseRepository.findQuestionsByAssessmentId(assessmentId);

    return {
        ...assessment,
        questions
    };
};

const getLessonsByChapter = async (chapterId) => {
    return await courseRepository.findLessonsByChapter(chapterId);
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
    getTeacherStats,
    getStudentsStatsForTeacher,
    submitAssessment,
    getAssessmentWithQuestions,
    getLessonsByChapter
};