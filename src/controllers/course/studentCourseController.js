const courseService = require('../../services/courseService');

const getAvailableCourses = async (req, res) => {
    try {
        const studentId = req.user.id;
        const courses = await courseService.getAvailableCourses(studentId);
        res.status(200).json({
            success: true,
            count: courses.length,
            data: { courses }
        });
    } catch (error) {
        console.error("Error in getAvailableCourses Controller:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching available courses",
            error: error.message
        });
    }
};

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
    getAvailableCourses,
    getMyCourses
};