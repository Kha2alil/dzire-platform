const courseRepository = require('../repositories/courseRepository');
const db = require('../config/database.js');
const studentRepository = require('../repositories/studentRepository');
const axios = require('axios');
const studentService = require('./studentService');

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

const getCourseDetails = async (courseId, teacherId,studentId) => {
    const course = await courseRepository.findCourseById(courseId);
    if (!course) {
        const error = new Error('الكورس غير موجود / Course not found');
        error.statusCode = 404;
        throw error;
    }

    // if (course.teacher_id !== teacherId ) {
    //     const error = new Error('ليس لديك صلاحية لهذا الكورس / You do not have permission for this course');
    //     error.statusCode = 403;
    //     throw error;
    // }

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

    if (updateData.type && !['quiz', 'final_exam', 'boss_exam'].includes(updateData.type)) {
        const error = new Error('نوع الاختبار يجب أن يكون quiz أو final_exam أو boss_exam');
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
    return chapters.map(chapter => ({ ...chapter, is_locked: false }));
};

const getLessonsList = async (studentId, courseId, chapterId) => {
    const lessons = await courseRepository.getLessonsByChapter(chapterId);
    return lessons.map(lesson => ({ ...lesson, is_locked: false }));
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
    if (!lesson) throw new Error("Lesson does not exist");

    const courseInfo = await studentRepository.getCourseInfo(courseId);
    if (!courseInfo) throw new Error("Course not found");
    const { subdomain_id: subdomainId } = courseInfo;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const isUpdated = await courseRepository.updateEnrollmentProgress(
            connection, studentId, courseId, lesson.order_index
        );

        if (isUpdated) {
            // Award subdomain XP
            if (subdomainId && xp_reward > 0) {
                try {
                    await studentService.updateStudentProgress(studentId, subdomainId, xp_reward);
                } catch (err) {
                    console.error('Failed to update subdomain progress:', err.message);
                }
            }

            // Update lesson stats & badges
            const progressAggregator = require('./progressAggregator');
            try {
                await progressAggregator.handleLessonCompleted(studentId, courseId, lessonId, xp_reward);
            } catch (err) {
                console.error('Failed to update progress aggregator:', err.message);
            }

            // 🔓 Check if course is now fully completed → unlock skill + trigger course_completed badge
            try {
                const [maxOrderRow] = await db.query(
                    "SELECT MAX(order_index) as maxOrder FROM lessons WHERE course_id = ?",
                    [courseId]
                );
                const maxOrder = maxOrderRow[0]?.maxOrder || 0;
                const isComplete = lesson.order_index >= maxOrder;

                if (isComplete) {
                    const skillService = require('./skillService');
                    await skillService.unlockSkillIfCourseCompleted(studentId, courseId);
                    await progressAggregator.handleCourseCompleted(studentId, courseId);
                }
            } catch (err) {
                console.error('Failed to unlock skill / course_completed badge:', err.message);
            }

            await connection.commit();
            return { 
                message: "Great! Progress updated and XP awarded",
                xp_gained: xp_reward || 0
            };
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

const submitAssessment = async (studentId, assessmentId, studentAnswers) => {
    // 1. جلب التقييم
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment) {
        const error = new Error('Assessment not found');
        error.statusCode = 404;
        throw error;
    }

    // 2. التحقق إذا كان الطالب قد اجتاز هذا التقييم من قبل (اختياري)
    const alreadyPassed = await _hasAlreadyPassedAssessment(studentId, assessmentId);
    if (alreadyPassed) {
        return {
            alreadyPassed: true,
            message: 'You have already passed this assessment'
        };
    }

    // 3. جلب جميع أسئلة التقييم مع correct_answer و points
    const questions = await courseRepository.findQuestionsByAssessmentId(assessmentId);
    if (!questions.length) {
        const error = new Error('No questions found for this assessment');
        error.statusCode = 404;
        throw error;
    }

    // 4. خريطة السؤال → بياناته
    const questionMap = new Map(questions.map(q => [q.id, q]));

    let totalPoints = 0;
    let earnedPoints = 0;

    // 5. تصحيح كل إجابة
    for (const ans of studentAnswers) {
        const { questionId, answer } = ans;
        const question = questionMap.get(questionId);
        if (!question) continue;

        totalPoints += question.points;

        let isCorrect = false;
        const correctAnswerRaw = question.correct_answer;
        if (correctAnswerRaw === null || correctAnswerRaw === undefined) continue;

        if (Array.isArray(answer)) {
            const expected = correctAnswerRaw.split(',').map(s => s.trim());
            const actual = answer.map(a => a.trim()).sort();
            const expectedSorted = expected.sort();
            isCorrect = actual.length === expectedSorted.length && actual.every((val, idx) => val === expectedSorted[idx]);
        } else if (typeof answer === 'string') {
            const userAnswer = answer.trim();
            const correctAnswer = correctAnswerRaw.trim();
            isCorrect = (userAnswer === correctAnswer);
        } else {
            isCorrect = false;
        }

        if (isCorrect) {
            earnedPoints += question.points;
        }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= (assessment.passing_score || 60);

    // 6. حفظ المحاولة
    await _saveStudentAssessment(studentId, assessmentId, score, passed);

    // 7. إذا اجتاز، تحديث الشارات + فتح المهارة إذا اكتمل الكورس
    if (passed) {
        // تحديث الشارات
        const progressAggregator = require('./progressAggregator');
        await progressAggregator.handleQuizPassed(studentId, assessmentId, score, passed)
            .catch(err => console.error('Quiz badge evaluation failed:', err.message));

        // 🔓 التحقق إذا كان الكورس قد اكتمل الآن وفتح المهارة
        try {
            const enrollment = await courseRepository.getEnrollmentData(studentId, assessment.course_id);
            if (enrollment && enrollment.progress_percentage >= 100) {
                const skillService = require('./skillService');
                await skillService.unlockSkillIfCourseCompleted(studentId, assessment.course_id);
            }
        } catch (err) {
            console.error('Failed to unlock skill after assessment:', err.message);
        }
    }

    return {
        success: true,
        score: Math.round(score),
        passed,
        passingScore: assessment.passing_score || 60,
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

const submitBossExam = async (studentId, assessmentId, code, language) => {
    const assessment = await courseRepository.findAssessmentById(assessmentId);
    if (!assessment || assessment.type !== 'boss_exam') {
        throw { statusCode: 404, message: 'Boss exam not found' };
    }

    // 1. Run optional quick‑check test cases
    const testCases = assessment.test_cases || [];
    const quickResults = [];
    let quickScore = 0;
    if (testCases.length > 0) {
        for (const tc of testCases) {
            let passed = false;
            if (language === 'html' || language === 'css') {
                const expected = tc.expected || '';
                passed = code.includes(expected);
                quickResults.push({ input: tc.input, expected, actual: passed ? expected : 'NOT FOUND', passed });
            } else {
                try {
                    const res = await axios.post('https://onecompiler.com/api/code/exec', {
                        language: 'javascript',
                        code: code,
                        stdin: tc.input
                    });
                    const output = (res.data.stdout || res.data.output || '').trim();
                    const expected = (tc.expected || '').trim();
                    passed = output === expected;
                    quickResults.push({ input: tc.input, expected, actual: output, passed });
                } catch (e) {
                    quickResults.push({ input: tc.input, expected: tc.expected, actual: 'Execution error', passed: false });
                }
            }
        }
        const passedQuick = quickResults.filter(r => r.passed).length;
        quickScore = Math.round((passedQuick / testCases.length) * 100);
    }

    // 2. Fetch student's sub‑domain level
    let studentLevel = 'beginner';
    try {
        const [placement] = await db.query(
            'SELECT level FROM placement_results WHERE student_id = ? LIMIT 1',
            [studentId]
        );
        if (placement.length > 0 && placement[0].level) {
            studentLevel = placement[0].level.toLowerCase();
        }
    } catch (e) { /* use default */ }

    // 3. Call AI for grading
    let aiScore = 0;
    let aiFeedback = '';
    const aiService = require('./aiService');

    const prompt = `You are a strict but fair code evaluator for a learning platform.
The student is at the **${studentLevel}** level.
Task description: "${assessment.description}".
Student's code:
\`\`\`${language}
${code}
\`\`\`

Please return a JSON object with exactly two fields:
- "score": a number between 0 and 100 that reflects how well the code satisfies the task description. Be more lenient for beginners (allow partial/imperfect solutions) and stricter for advanced students.
- "feedback": a short, encouraging, and constructive message (max 150 words) explaining the score and suggesting improvements or praising good work.

Return ONLY the JSON object, no other text.`;

    try {
        const aiResponse = await aiService.askAI(studentId, prompt);
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiScore = parsed.score || 0;
            aiFeedback = parsed.feedback || '';
        }
    } catch (e) {
        console.error('AI grading failed:', e);
        aiFeedback = 'AI grading is currently unavailable. Please try again later.';
    }

    // 4. Combine scores
    let finalScore;
    if (testCases.length > 0) {
        finalScore = Math.round(quickScore * 0.4 + aiScore * 0.6);
    } else {
        finalScore = aiScore;
    }

    const passed = finalScore >= (assessment.passing_score || 70);

    // 5. Check if already passed BEFORE saving the new attempt
    const alreadyPassed = await _hasAlreadyPassedAssessment(studentId, assessmentId);

    // 6. Save the attempt
    await db.query(
        `INSERT INTO student_assessments (student_id, assessment_id, score, passed) VALUES (?, ?, ?, ?)`,
        [studentId, assessmentId, finalScore, passed]
    );

    // 7. Award XP only on FIRST pass
    let xpGained = 0;
    console.log('XP debug: alreadyPassed =', alreadyPassed, ', xp_reward =', assessment.xp_reward, ', passed =', passed);
    if (passed && !alreadyPassed && assessment.xp_reward > 0) {
        xpGained = assessment.xp_reward;
        console.log('Awarding XP:', xpGained);
        const connection = await db.getConnection();
        try {
            await courseRepository.updateStudentXP(connection, studentId, xpGained);
        } finally {
            connection?.release();
        }
        const courseInfo = await courseRepository.findCourseById(assessment.course_id);
        if (courseInfo?.subdomain_id) {
            await studentService.updateStudentProgress(studentId, courseInfo.subdomain_id, xpGained);
        }
        const progressAggregator = require('./progressAggregator');
        await progressAggregator.handleQuizPassed(studentId, assessmentId, finalScore, passed).catch(() => {});
    } else {
        console.log('XP NOT awarded. alreadyPassed:', alreadyPassed, ', xp_reward:', assessment.xp_reward, ', passed:', passed);
    }

    if (isNaN(finalScore) || finalScore === null || finalScore === undefined) {
        finalScore = quickScore || 0;
    }

    // Return xp_gained (even if 0)
    return {
        results: quickResults,
        score: finalScore,
        passed,
        xp_gained: xpGained,
        ai_feedback: aiFeedback || null,
    };
};

// ============================================================
// ADDITIONAL FUNCTIONS (from dev branch)
// ============================================================



const getLessonsByChapter = async (chapterId) => {
    return await courseRepository.findLessonsByChapter(chapterId);
};

// services/courseService.js

const getCourseSubdomain = async (courseId) => {
    return await courseRepository.getCourseSubdomain(courseId);
};



const updateCourseInfo = async (courseId, updateData, currentUser) => {
    // 1. التحقق من وجود الكورس
    const course = await courseRepository.findCourseById(courseId);
    if (!course) {
        throw new Error('Course not found');
    }

    // 2. التحقق من الصلاحيات (المالك أو أدمن)
    const isAdmin = currentUser.role === 'admin';
    const isOwner = course.teacher_id === currentUser.id;
    if (!isAdmin && !isOwner) {
        throw new Error('You are not authorized to edit this course');
    }

    // 3. التحقق من وجود بيانات صالحة للتحديث
    if (!updateData.title && !updateData.description) {
        throw new Error('At least title or description must be provided');
    }

    // 4. التحقق من طول النصوص (اختياري حسب متطلباتك)
    if (updateData.title && (updateData.title.length < 3 || updateData.title.length > 255)) {
        throw new Error('Title must be between 3 and 255 characters');
    }
    if (updateData.description && updateData.description.length > 2000) {
        throw new Error('Description cannot exceed 2000 characters');
    }

    // 5. تحديث الكورس باستخدام الدالة الموجودة updateCourse
    const updatedCourse = await courseRepository.updateCourse(courseId, {
        title: updateData.title,
        description: updateData.description
    });

    return updatedCourse;
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
    getLessonsByChapter, 
    getCourseSubdomain,
    submitBossExam
   ,updateCourseInfo
};