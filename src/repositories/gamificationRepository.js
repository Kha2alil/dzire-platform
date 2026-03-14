const db = require('../config/database');

/**
 * إنشاء سجل نقاط للطالب الجديد فقط
 * Create a gamification record for new students only
 */
const createGamificationStats = async (userId, role) => {

    // هذه الخاصية للطلاب فقط
    // This feature is for students only
    if (role !== 'student') {
        return null;
    }

    const query = `
        INSERT INTO gamification_stats (student_id)
        VALUES (?)
    `;

    const [result] = await db.query(query, [userId]);

    return {
        id: result.insertId,
        student_id: userId,
        total_xp: 0,
        current_level: 1,
        rank: null
    };
};

/**
 * جلب سجل النقاط عن طريق الـ student_id
 * Fetch gamification stats by student_id
 */
const findByUserId = async (userId) => {

    const query = `
    SELECT
        id,
        student_id,
        total_xp,
        current_level,
        \`rank\`,
        updated_at
    FROM gamification_stats
    WHERE student_id = ?
    LIMIT 1
    `;

    const [rows] = await db.query(query, [userId]);

    return rows[0] || null;
};

module.exports = {
    createGamificationStats,
    findByUserId
};