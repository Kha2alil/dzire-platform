const db = require('../config/database');

/**
 * البحث عن طلاب الأستاذ
 * Search teacher's students
 */
const searchStudents = async (teacherId, filters) => {
    let query = `
        SELECT DISTINCT
            u.id,
            u.full_name,
            u.email,
            g.total_xp,
            g.current_level,
            g.rank
        FROM users u
        JOIN enrollments e ON e.student_id = u.id
        JOIN courses c     ON c.id = e.course_id
        LEFT JOIN gamification_stats g ON g.student_id = u.id
        WHERE c.teacher_id = ?
        AND u.role = 'student'
    `;

    const values = [teacherId];

    // إضافة فلتر الاسم إذا أُرسل
    if (filters.name) {
        query += ` AND u.full_name LIKE ?`;
        values.push(`%${filters.name}%`);
    }

    // إضافة فلتر المستوى إذا أُرسل
    if (filters.level) {
        query += ` AND g.current_level = ?`;
        values.push(filters.level);
    }

    query += ` ORDER BY u.full_name ASC`;

    const [rows] = await db.query(query, values);
    return rows;
};
const enrollStudent = async (studentId, courseId) => {
    const query = `
        INSERT INTO enrollments (student_id, course_id, progress_percentage, status, enrolled_at)
        VALUES (?, ?, 0, 'active', NOW())
    `;
    const [result] = await db.query(query, [studentId, courseId]);
    return result.insertId;
};

/**
 * التحقق مما إذا كان الطالب مسجلاً بالفعل
 */
const findEnrollment = async (studentId, courseId) => {
    const query = `SELECT * FROM enrollments WHERE student_id = ? AND course_id = ? LIMIT 1`;
    const [rows] = await db.query(query, [studentId, courseId]);
    return rows[0];
};

const getLeaderboard = async (limit = 10) => {
    const query = `
        SELECT DISTINCT
            u.id, 
            u.full_name AS Name, 
            gs.total_xp AS XP, 
            p.avatar_url AS Image,
            p.specialization AS Specialization
        FROM users u
        INNER JOIN gamification_stats gs ON u.id = gs.student_id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.role = 'student' 
        GROUP BY u.id, u.full_name, gs.total_xp, p.avatar_url, p.specialization
        ORDER BY XP DESC 
        LIMIT ?
    `;
    const [rows] = await db.query(query, [limit]);
    return rows;
};
const getCourseInfo = async (courseId) => {
    const [rows] = await db.query(
        `SELECT subdomain_id, difficulty_level FROM courses WHERE id = ?`,
        [courseId]
    );
    return rows[0] || null;
};
const getSubdomainStats = async (studentId, subdomainId) => {
    const [rows] = await db.query(
        `SELECT accumulated_xp, new_level, current_level 
         FROM gamification_stats 
         WHERE student_id = ? AND subdomain_id = ?`,
        [studentId, subdomainId]
    );
    if (rows.length === 0) return null;
    return rows[0];
};

// تحديث accumulated_xp فقط
const updateSubdomainXP = async (studentId, subdomainId, newXP) => {
    await db.query(
        `UPDATE gamification_stats 
         SET accumulated_xp = ?, updated_at = NOW() 
         WHERE student_id = ? AND subdomain_id = ?`,
        [newXP, studentId, subdomainId]
    );
};

// ترقية مستوى subdomain وإعادة ضبط accumulated_xp إلى 0
const upgradeSubdomainLevel = async (studentId, subdomainId, newLevel) => {
    await db.query(
        `UPDATE gamification_stats 
         SET new_level = ?, accumulated_xp = 0, updated_at = NOW() 
         WHERE student_id = ? AND subdomain_id = ?`,
        [newLevel, studentId, subdomainId]
    );
};

// جلب إحصائيات المستوى العام (global)
const getGlobalStats = async (studentId) => {
    // نبحث عن أي صف للطالب، ونأخذ total_xp و current_level من أول صف
    const [rows] = await db.query(
        `SELECT total_xp, current_level 
         FROM gamification_stats 
         WHERE student_id = ? 
         LIMIT 1`,
        [studentId]
    );
    if (rows.length === 0) return null;
    return rows[0];
};
// تحديث المستوى العام
const updateGlobalStats = async (studentId, newTotalXP, newLevel) => {
    await db.query(
        `UPDATE gamification_stats 
         SET total_xp = ?, current_level = ?, updated_at = NOW() 
         WHERE student_id = ?`,
        [newTotalXP, newLevel, studentId]
    );
};

// جلب عدد المواضيع (topics) في subdomain لحساب targetXP
const getTopicCount = async (subdomainId) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM courses WHERE subdomain_id = ? AND is_published = 1`,
        [subdomainId]
    );
    return rows[0].count || 0; // إذا لم توجد دورات، سيعود 0
};
const getPlacementLevel = async (studentId, subdomainId) => {
    const [rows] = await db.query(
        `SELECT level FROM placement_results 
         WHERE student_id = ? AND subdomain_id = ?`,
        [studentId, subdomainId]
    );
    if (rows.length === 0) return null;
    return rows[0].level; // 'beginner', 'intermediate', 'advanced' (نفس القيم)
};
const getSkillsBySubdomain = async (subdomainId) => {
    const [rows] = await db.query(
        `SELECT DISTINCT s.id 
         FROM skills s
         JOIN courses c ON c.skill_id = s.id
         WHERE c.subdomain_id = ? AND c.is_published = 1`,
        [subdomainId]
    );
    return rows.map(row => row.id);
};

// التحقق من وجود كورس مكتمل بنسبة 100% لمهارة معينة بمستوى محدد
const hasCompletedCourseForSkill = async (studentId, skillId, difficultyLevel) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) as count
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.student_id = ? 
           AND c.skill_id = ?
           AND c.difficulty_level = ?
           AND e.progress_percentage = 100`,
        [studentId, skillId, difficultyLevel]
    );
    return rows[0].count > 0;
};
const getAssessmentsByCourse = async (courseId) => {
    const [rows] = await db.query(
        `SELECT id, title, type, passing_score, chapter_id , lesson_id
         FROM assessments 
         WHERE course_id = ?`,
        [courseId]
    );
    return rows;
};

const getStudentAssessmentsOverview = async (studentId) => {
    const query = `
        SELECT a.id, a.title, a.type, a.passing_score, a.lesson_id,
               c.id AS course_id, c.title AS course_title,
               COALESCE(l.order_index, 0) AS lesson_order,
               e.last_completed_order,
               COUNT(sa.id) AS attempts_count,
               MAX(sa.score) AS best_score,
               MAX(sa.passed) AS best_passed,
               MAX(sa.attempted_at) AS last_attempted_at
        FROM assessments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON e.course_id = c.id AND e.student_id = ?
        LEFT JOIN lessons l ON a.lesson_id = l.id
        LEFT JOIN student_assessments sa ON sa.assessment_id = a.id AND sa.student_id = ?
        GROUP BY a.id
        ORDER BY ISNULL(MAX(sa.attempted_at)), MAX(sa.attempted_at) DESC, c.title, a.title
    `;
    const [rows] = await db.query(query, [studentId, studentId]);
    return rows;
};



module.exports = { searchStudents,
    enrollStudent,
    findEnrollment,
    getLeaderboard, getTopicCount,
    getCourseInfo, getSubdomainStats,
    updateSubdomainXP, upgradeSubdomainLevel,
    getGlobalStats, updateGlobalStats,
    getPlacementLevel, getSkillsBySubdomain, hasCompletedCourseForSkill,
    getAssessmentsByCourse, getStudentAssessmentsOverview};