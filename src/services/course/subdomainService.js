const courseRepository = require('../../repositories/courseRepository');

const getCourseSubdomain = async (courseId) => {
    return await courseRepository.getCourseSubdomain(courseId);
};

module.exports = { getCourseSubdomain };