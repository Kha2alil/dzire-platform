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

module.exports = { searchStudents };