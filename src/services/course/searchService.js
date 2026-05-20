const courseRepository = require('../../repositories/courseRepository');

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
    return await courseRepository.searchCourses(teacherId, filters);
};

module.exports = { searchCourses };