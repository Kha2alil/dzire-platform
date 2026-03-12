const db = require('../config/database');

/**
 * إنشاء ملف شخصي فارغ للمستخدم الجديد
 * Create an empty profile for the new user
 *
 * تُستخدم في / Used in:
 *   - مباشرةً بعد إنشاء المستخدم في جدول users
 *   - Immediately after creating the user in the users table
 *
 * ملاحظة: نُدخل user_id فقط، الباقي يصير NULL تلقائياً
 * Note: we only insert user_id, the rest becomes NULL automatically
 *
 * @param {number} userId - الـ ID للمستخدم الجديد / ID of the new user
 * @returns {Object} - الملف الشخصي المُنشأ مع الـ ID / Created profile with ID
 */
const createProfile = async (userId) => {

    const query = `
        INSERT INTO profiles (user_id) 
        VALUES (?)
    `;

    const [result] = await db.query(query, [userId]);

    return {
        id: result.insertId,
        user_id: userId
    };
};

/**
 * جلب الملف الشخصي عن طريق الـ user_id
 * Fetch the profile by user_id
 *
 * تُستخدم في / Used in:
 *   - عند عرض صفحة الملف الشخصي للمستخدم
 *   - When displaying the user's profile page
 *
 * ملاحظة: نبحث بـ user_id وليس بـ id
 * Note: we search by user_id not by id
 * لأن user_id هو الرابط بين جدول users وجدول profiles
 * because user_id is the link between the users and profiles tables
 *
 * @param {number} userId - الـ ID للمستخدم / User's ID
 * @returns {Object|null} - بيانات الملف الشخصي أو null إذا لم يوجد / Profile data or null if not found
 */
const findByUserId = async (userId) => {

    const query = `
        SELECT
            id,
            user_id,
            avatar_url,
            bio,
            date_of_birth,
            created_at
        FROM profiles
        WHERE user_id = ?
        LIMIT 1
    `;

    const [rows] = await db.query(query, [userId]);

    return rows[0] || null;
};

// Exports — تصدير جميع الدوال
module.exports = {
    createProfile,
    findByUserId
};