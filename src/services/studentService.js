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
    // Check if already enrolled
    const existingEnrollment = await studentRepository.findEnrollment(studentId, courseId);
    if (existingEnrollment) {
        throw new Error('You are already enrolled in this course');
    }

    // Enroll
    const enrollment = await studentRepository.enrollStudent(studentId, courseId);

    // Send enrollment notification (non-blocking)
    const courseRepository = require('../repositories/courseRepository');
    const notificationService = require('./notificationService');
    
    courseRepository.findCourseById(courseId)
        .then(course => {
            if (course) {
                return notificationService.notifyEnrollment(studentId, course.title);
            }
        })
        .catch(err => console.error('Failed to send enrollment notification:', err.message));

    return enrollment;
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