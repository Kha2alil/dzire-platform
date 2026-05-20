const courseService = require('../../services/courseService');

const searchCourses = async (req, res, next) => {
    try {
        const courses = await courseService.searchCourses(req.user.id, req.query);
        res.status(200).json({ success: true, data: { courses } });
    } catch (error) { next(error); }
};

module.exports = { searchCourses };