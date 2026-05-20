const courseService = require('../../services/courseService');

const getMyStudentCount = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const stats = await courseService.getTeacherStats(teacherId);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching student count",
            error: error.message
        });
    }
};

const getTeacherDashboard = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const data = await courseService.getStudentsStatsForTeacher(teacherId);
        res.status(200).json({
            success: true,
            results: data.length,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching students statistics",
            error: error.message
        });
    }
};

module.exports = {
    getMyStudentCount,
    getTeacherDashboard
};