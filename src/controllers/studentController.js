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
 
module.exports = { searchStudents , enroll };