const studentRepository = require('../repositories/studentRepository');

/**
 * البحث عن طلاب الأستاذ
 * Search teacher's students
 */
const searchStudents = async (teacherId, filters) => {

    // تحقق أن فلتر واحد على الأقل موجود
    if (!filters.name && !filters.level) {
        const error = new Error('يجب إرسال name أو level للبحث');
        error.statusCode = 400;
        throw error;
    }

    // تحقق من صحة المستوى إذا أُرسل
    if (filters.level && isNaN(filters.level)) {
        const error = new Error('المستوى يجب أن يكون رقماً');
        error.statusCode = 400;
        throw error;
    }

    return studentRepository.searchStudents(teacherId, filters);
};

module.exports = { searchStudents };