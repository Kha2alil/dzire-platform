const studentRepository = require('../repositories/studentRepository');
const courseRepository = require('../repositories/courseRepository');
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
    // 1. التحقق من وجود تسجيل مسبق في نفس الكورس
    const existingEnrollment = await studentRepository.findEnrollment(studentId, courseId);
    if (existingEnrollment) {
        throw new Error('You are already enrolled in this course');
    }

    // 2. جلب معلومات الكورس (subdomain_id, difficulty_level)
    const courseInfo = await studentRepository.getCourseInfo(courseId);
    if (!courseInfo) {
        throw new Error('Course not found');
    }
    const { subdomain_id, difficulty_level } = courseInfo;

    // 3. التحقق من وجود تسجيل في أي كورس آخر له نفس المجال الفرعي ونفس المستوى



    // 4. التسجيل
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
const XP_PER_TOPIC = 100;
const GENERAL_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];

const updateStudentProgress = async (studentId, subdomainId, xpGained, targetXPOverride = null) => {
    // 1. الحصول على سجل الـ subdomain للطالب
    let stats = await studentRepository.getSubdomainStats(studentId, subdomainId);
    if (!stats) {
        throw new Error(`No gamification stats found for student ${studentId} in subdomain ${subdomainId}`);
    }

    let { accumulated_xp, new_level, current_level } = stats;
    let currentLevelStr = new_level || (current_level === 1 ? 'Beginner' : current_level === 2 ? 'Intermediate' : 'Advanced');

    // 2. تحديث accumulated_xp (لأغراض إحصائية فقط، لا يؤثر على الترقية)
    const newAccumulatedXP = (accumulated_xp || 0) + xpGained;
    await studentRepository.updateSubdomainXP(studentId, subdomainId, newAccumulatedXP);

    // 3. الشرط الجديد للترقية: إكمال كورس واحد في كل skill بنفس المستوى الحالي
    let levelUpgraded = false;
    let updatedLevelStr = currentLevelStr;

    // لا نرقى إذا كنا بالفعل Advanced
    if (currentLevelStr !== 'Advanced') {
        // جلب كل المهارات في هذا الـ subdomain
        const skills = await studentRepository.getSkillsBySubdomain(subdomainId);
        if (skills.length === 0) {
            // لا توجد مهارات محددة – قد لا نرقى أو نترك الأمر لك
            // هنا نعتبر أنه لا يمكن الترقية بدون مهارات
        } else {
            let allSkillsHaveCompletedCourse = true;
            // تحديد مستوى الكورس المطلوب (نفس المستوى الحالي)
            const requiredDifficulty = currentLevelStr.toLowerCase(); // 'beginner' أو 'intermediate'
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
                // ترقية المستوى
                if (currentLevelStr === 'Beginner') {
                    updatedLevelStr = 'Intermediate';
                    levelUpgraded = true;
                } else if (currentLevelStr === 'Intermediate') {
                    updatedLevelStr = 'Advanced';
                    levelUpgraded = true;
                }
                if (levelUpgraded) {
                    // تحديث new_level وإعادة ضبط accumulated_xp (اختياري)
                    await studentRepository.upgradeSubdomainLevel(studentId, subdomainId, updatedLevelStr);
                }
            }
        }
    }

    // 4. تحديث المستوى العام (إذا كنت لا تزال تريد total_xp)
    // هنا يمكنك الاحتفاظ بـ total_xp منفصلاً (مثلاً في سجل global أو في كل صف)
    // لكن بالحد الأدنى، إذا أردت الاحتفاظ بـ total_xp، فسأتركها كما هي
    // إذا لم تكن تريدها، احذف هذا الجزء.
    let globalStats = await studentRepository.getGlobalStats(studentId);
    oldTotalXP = globalStats.total_xp;
    oldGeneralLevel = globalStats.current_level;
    if (!globalStats) {
        // إنشاء سجل أولي باستخدام subdomainId الحالي
        await studentRepository.createGamificationStats(studentId, subdomainId);
        oldTotalXP = 0;
        oldGeneralLevel = 1;
    } else {
        oldTotalXP = globalStats.total_xp;
        oldGeneralLevel = globalStats.current_level;
    }

    const newTotalXP = oldTotalXP + xpGained;
    let newGeneralLevel = oldGeneralLevel;
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
        currentXP: newAccumulatedXP,   // XP المتراكم (قد لا تستخدمه بعد الآن)
        message: levelUpgraded ? `Level upgraded to ${updatedLevelStr}` : 'Level unchanged'
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
const getAssessmentWithQuestions = async (assessmentId) => {
    // 1. جلب بيانات التقييم
    const assessment = await courseRepository.findAssessmentByIds(assessmentId);
    if (!assessment) {
        const error = new Error('Assessment not found');
        error.statusCode = 404;
        throw error;
    }

    // 2. جلب الأسئلة المرتبطة
    const questions = await courseRepository.findQuestionsByAssessmentIds(assessmentId);

    // 3. إرجاع الكائن المدمج
    return {
        ...assessment,
        questions
    };
};

const getAssessmentsByCourse = async (courseId) => {
    return await studentRepository.getAssessmentsByCourse(courseId);
};



module.exports = { searchStudents, enrollInCourse, fetchLeaderboard, updateStudentProgress, getAssessmentWithQuestions, getAssessmentsByCourse };