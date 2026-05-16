const studentService = require('../services/studentService');

/**
 * البحث عن طلاب الأستاذ
 * GET /api/students/search?name=ahmed&level=2
 */
const searchStudents = async (req, res, next) => {
    try {
        const students = await studentService.searchStudents(
            req.user.id,
            req.query  // name و level يأتيان من الـ URL
        );
        res.status(200).json({
            success: true,
            data: { students }
        });
    } catch (error) {
        next(error);
    }
};
const enroll = async (req, res, next) => {
    try {
        const studentId = req.user.id;
        const { courseId } = req.body;
 
        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'courseId is required'
            });
        }
 
        const enrollment = await studentService.enrollInCourse(studentId, courseId);
 
        res.status(201).json({
            success: true,
            message: 'Enrolled successfully',
            data: { enrollment }
        });
 
    } catch (error) {
        // إذا كان الطالب مسجّل مسبقاً نرجع 409 بدل 500
        if (error.message.includes('already enrolled')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};
const getLeaderboardData = async (req, res, next) => {
    try {
        const leaderboard = await studentService.fetchLeaderboard();
        
        res.status(200).json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error("Error in Student Leaderboard:", error.message);
        next(error);
    }
};
const updateProgress = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { subdomainId, xpGained, targetXPOverride } = req.body;

        if (!studentId || !subdomainId || xpGained === undefined) {
            return res.status(400).json({ error: 'Missing required fields: studentId (params), subdomainId, xpGained (body)' });
        }

        const result = await studentService.updateStudentProgress(studentId, subdomainId, xpGained, targetXPOverride || null);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
// controllers/courseController.js (أو studentController.js)

const getAssessmentById = async (req, res, next) => {
    try {
        const { assessmentId } = req.params; // قد يكون courseId غير مطلوب
        const studentId = req.user.id;

        const assessment = await studentService.getAssessmentWithQuestions(studentId, assessmentId);

        res.status(200).json({
            success: true,
            data: assessment
        });
    } catch (error) {
        next(error);
    }
};
const getAssessmentsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const assessments = await studentService.getAssessmentsByCourse(courseId);
        res.status(200).json({ success: true, data: assessments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
 };
module.exports = { searchStudents , enroll , getLeaderboardData, updateProgress , getAssessmentById, getAssessmentsByCourse };