const courseRepository = require('../../repositories/courseRepository');
const studentRepository = require('../../repositories/studentRepository');
const db = require('../../config/database');

const getStudentCourseProgress = async (studentId, courseId) => {
    const enrollment = await courseRepository.getEnrollmentData(studentId, courseId);
    if (!enrollment) return { percentage: 0, last_accessed: null, isEnrolled: false };
    return { percentage: parseFloat(enrollment.progress_percentage) || 0, last_accessed: enrollment.last_accessed || null, isEnrolled: true };
};

const trackProgress = async (userId, courseId) => {
    if (!userId || !courseId) throw new Error("UserID and CourseID are required");
    const newPercentage = await courseRepository.updateEnrollmentProgress(userId, courseId);
    return { success: true, updatedProgress: `${newPercentage.toFixed(2)}%`, isCompleted: newPercentage >= 100 };
};

const getChaptersList = async (studentId, courseId) => {
    const chapters = await courseRepository.getAllChapters(courseId);
    return await Promise.all(chapters.map(async (chapter, index) => {
        if (chapter.order_index === 1) return { ...chapter, is_locked: false };
        const previousChapter = chapters[index - 1];
        const assessmentResult = await courseRepository.getAssessmentResult(studentId, previousChapter.id);
        const isLocked = !assessmentResult || assessmentResult.status !== 'passed';
        return { ...chapter, is_locked: isLocked };
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
        return { ...lesson, is_locked: lesson.order_index > 1 && currentProgress < (requiredProgress - 0.5) };
    });
};

const finishLessonAndAwardXP = async (studentId, courseId, chapterId, lessonId, xp_reward) => {
    const lesson = await courseRepository.getLessonById(lessonId);
    if (!lesson) throw new Error("Lesson does not exist");
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const isUpdated = await courseRepository.updateEnrollmentProgress(connection, studentId, courseId, lesson.order_index);
        if (isUpdated) {
            // Award XP logic – you may have additional steps
            await connection.commit();
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
    return await courseRepository.findEnrolledCoursesByStudent(studentId);
};

const getTeacherStats = async (teacherId) => {
    const studentCount = await courseRepository.getTeacherStudentCount(teacherId);
    return { teacherId, totalStudents: studentCount };
};

const getStudentsStatsForTeacher = async (teacherId) => {
    const rawData = await courseRepository.getStudentProgressInCourses(teacherId);
    return rawData.map(record => ({
        studentName: record.Student,
        courseTitle: record.Course,
        progress: `${record.Progress || 0}%`,
        xp: record.XP || 0,
        level: record.Level || 'N/A',
        lastActive: record.Last_Active ? new Date(record.Last_Active).toLocaleString('en-GB') : 'No activity yet',
        status: record.Status ? record.Status.charAt(0).toUpperCase() + record.Status.slice(1) : 'Unknown'
    }));
};

module.exports = {
    getStudentCourseProgress,
    trackProgress,
    getChaptersList,
    getLessonsList,
    finishLessonAndAwardXP,
    getAvailableCourses,
    getStudentDashboard,
    getTeacherStats,
    getStudentsStatsForTeacher
};