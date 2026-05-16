const studentRepository = require('../repositories/studentRepository');
const courseRepository = require('../repositories/courseRepository');

/**
 * البحث عن طلاب الأستاذ
 * Search teacher's students
 */
const searchStudents = async (teacherId, filters) => {
    if (!filters.name && !filters.level) {
        const error = new Error('يجب إرسال name أو level للبحث');
        error.statusCode = 400;
        throw error;
    }

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

    const courseInfo = await studentRepository.getCourseInfo(courseId);
    if (!courseInfo) {
        throw new Error('Course not found');
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
        medal: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null
    }));
};

const XP_PER_TOPIC = 100;

// ── New 30‑level thresholds (syncs with front‑end) ──
const GENERAL_LEVEL_THRESHOLDS = [
    0, 100, 220, 364, 537, 744, 993, 1292, 1650, 2080,
    2596, 3215, 3958, 4850, 5920, 7204, 8745, 10594,
    12813, 15476, 18671, 22505, 27106, 32627, 39252,
    47202, 56742, 68190, 81928, 98314
];

const updateStudentProgress = async (studentId, subdomainId, xpGained, targetXPOverride = null) => {
    // 1. الحصول على سجل الـ subdomain للطالب
    let stats = await studentRepository.getSubdomainStats(studentId, subdomainId);
    if (!stats) {
        // إذا لم يتم العثور على صف في هذا المجال الفرعي، قم بإنشائه
        await studentRepository.createGamificationStatsForSubdomain(studentId, subdomainId);
        stats = await studentRepository.getSubdomainStats(studentId, subdomainId);
        if (!stats) {
            throw new Error(`Could not create gamification stats for student ${studentId} in subdomain ${subdomainId}`);
        }
    }

    let { accumulated_xp, new_level, current_level } = stats;
    let currentLevelStr = new_level || (current_level === 1 ? 'Beginner' : current_level === 2 ? 'Intermediate' : 'Advanced');

    // 2. تحديث accumulated_xp (لأغراض إحصائية فقط، لا يؤثر على الترقية)
    const newAccumulatedXP = (accumulated_xp || 0) + xpGained;
    await studentRepository.updateSubdomainXP(studentId, subdomainId, newAccumulatedXP);

    // 3. الشرط الجديد للترقية: إكمال كورس واحد في كل skill بنفس المستوى الحالي
    let levelUpgraded = false;
    let updatedLevelStr = currentLevelStr;

    if (currentLevelStr !== 'Advanced') {
        const skills = await studentRepository.getSkillsBySubdomain(subdomainId);
        if (skills.length > 0) {
            let allSkillsHaveCompletedCourse = true;
            const requiredDifficulty = currentLevelStr.toLowerCase();
            for (const skillId of skills) {
                const completed = await studentRepository.hasCompletedCourseForSkill(
                    studentId, skillId, requiredDifficulty
                );
                if (!completed) {
                    allSkillsHaveCompletedCourse = false;
                    break;
                }
            }
            if (allSkillsHaveCompletedCourse) {
                if (currentLevelStr === 'Beginner') {
                    updatedLevelStr = 'Intermediate';
                    levelUpgraded = true;
                } else if (currentLevelStr === 'Intermediate') {
                    updatedLevelStr = 'Advanced';
                    levelUpgraded = true;
                }
                if (levelUpgraded) {
                    await studentRepository.upgradeSubdomainLevel(studentId, subdomainId, updatedLevelStr);
                }
            }
        }
    }

    // 4. تحديث المستوى العام (30‑level scale)
    let globalStats = await studentRepository.getGlobalStats(studentId);
    let oldTotalXP = 0;
    let oldGeneralLevel = 1;

    if (!globalStats) {
        await studentRepository.createGamificationStatsForSubdomain(studentId, subdomainId);
        oldTotalXP = 0;
        oldGeneralLevel = 1;
    } else {
        oldTotalXP = globalStats.total_xp;
        oldGeneralLevel = globalStats.current_level;
    }

    const newTotalXP = oldTotalXP + xpGained;

    // حساب المستوى العام الجديد باستخدام قائمة الـ 30 مستوى
    let newGeneralLevel = 1;
    for (let i = GENERAL_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (newTotalXP >= GENERAL_LEVEL_THRESHOLDS[i]) {
            newGeneralLevel = i + 1;
            break;
        }
    }

    await studentRepository.updateGlobalStats(studentId, newTotalXP, newGeneralLevel);
    const generalLevelUpgraded = (newGeneralLevel !== oldGeneralLevel);

    return {
        success: true,
        levelUpgraded,
        newLevel: updatedLevelStr,
        currentXP: newAccumulatedXP,
        message: levelUpgraded ? `Level upgraded to ${updatedLevelStr}` : 'Level unchanged',
        globalLevel: newGeneralLevel,
        globalLevelUpgraded: generalLevelUpgraded,
        totalXP: newTotalXP
    };
};

function calculateGlobalLevel(totalXP) {
    let level = 1;
    for (let i = GENERAL_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalXP >= GENERAL_LEVEL_THRESHOLDS[i]) {
            level = i + 1;
            break;
        }
    }
    return level;
}

// services/courseService.js

const getAssessmentWithQuestions = async (studentId, assessmentId) => {
    console.log("🔍 getAssessmentWithQuestions called with:", { studentId, assessmentId });
    try {
        const assessment = await courseRepository.findAssessmentById(assessmentId);
        if (!assessment) {
            console.log("❌ Assessment not found");
            throw new Error('Assessment not found');
        }
        const questions = await courseRepository.findQuestionsByAssessmentId(assessmentId);
        console.log(`✅ Found ${questions.length} questions`);
        
        // تحقق من وجود hasStudentPassedAssessment
        let alreadyPassed = false;
        try {
            alreadyPassed = await courseRepository.hasStudentPassedAssessment(studentId, assessmentId);
            console.log(`✅ alreadyPassed = ${alreadyPassed}`);
        } catch (err) {
            console.error("❌ Error in hasStudentPassedAssessment:", err.message);
        }
         const status = await courseRepository.getStudentAssessmentStatus(studentId, assessmentId);
        
         return {
        ...assessment,
        questions,
        has_attempted: status.has_attempted,
        already_passed: status.last_passed,   // للحفاظ على التوافق مع الـ Frontend القديم
        last_score: status.last_score
    };
    } catch (error) {
        console.error("❌ ERROR in getAssessmentWithQuestions:", error);
        throw error;
    }
};

const getAssessmentsByCourse = async (courseId) => {
    return await studentRepository.getAssessmentsByCourse(courseId);
};

const getAssessmentsOverview = async (studentId) => {
    const rows = await studentRepository.getStudentAssessmentsOverview(studentId);
    return rows.map(row => {
        const hasAttempt = row.last_attempted_at !== null;
        let status;
        if (hasAttempt) {
            status = row.best_passed ? 'Passed' : 'Attempted';
        } else {
            const lessonOrder = Number(row.lesson_order) || 0;
            const lastCompleted = Number(row.last_completed_order) || 0;
            if (lessonOrder > 0 && lessonOrder > lastCompleted + 1) {
                status = 'Locked';
            } else {
                status = 'Upcoming';
            }
        }
        return {
            id: row.id, title: row.title, type: row.type, passing_score: row.passing_score,
            course_id: row.course_id, course_title: row.course_title, status, best_score: row.best_score,
            last_attempted_at: row.last_attempted_at, attempts_count: row.attempts_count,
        };
    });
};

module.exports = {
    searchStudents,
    enrollInCourse,
    fetchLeaderboard,
    updateStudentProgress,
    getAssessmentWithQuestions,
    getAssessmentsByCourse,
    getAssessmentsOverview
};