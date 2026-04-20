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

const enrollInCourse = async (studentId, courseId) => {
    const existingEnrollment = await studentRepository.findEnrollment(studentId, courseId);
    if (existingEnrollment) {
        throw new Error('You are already enrolled in this course');
    }
    return await studentRepository.enrollStudent(studentId, courseId);
};
const fetchLeaderboard = async () => {
    const students = await studentRepository.getLeaderboard(10);
    
    return students.map((student, index) => ({
        rank: index + 1,
        name: student.Name,
        xp: student.XP || 0,
        avatar: student.Image || 'default-avatar.png',
        specialization: student.Specialization || 'General Student',
        // تمييز الثلاثة الأوائل
        medal: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null
    }));
};

module.exports = { searchStudents, enrollInCourse , fetchLeaderboard  };