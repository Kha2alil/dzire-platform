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
            specialization,
            experience_years,
            preferences,
            updated_at
        FROM profiles
        WHERE user_id = ?
        LIMIT 1
    `;
    
    const [rows] = await db.query(query, [userId]);

    return rows[0] || null;
};

/**
 * تحديث الملف الشخصي
 * Update profile data
 *
 * @param {string} userId - ID المستخدم / User ID
 * @param {Object} data   - البيانات المراد تحديثها / Data to update
 * @returns {boolean}     - true إذا نجح التحديث / true if update succeeded
 */
const updateProfile = async (userId, data) => {

    // نبني الـ query ديناميكياً بناءً على البيانات المُرسلة
    // Build query dynamically based on sent data
    const fields = [];
    const values = [];

    if (data.bio !== undefined) {
        fields.push('bio = ?');
        values.push(data.bio);
    }

    if (data.avatar_url !== undefined) {
        fields.push('avatar_url = ?');
        values.push(data.avatar_url);
    }

    if (data.specialization !== undefined) {
        fields.push('specialization = ?');
        values.push(data.specialization);
    }

    if (data.experience_years !== undefined) {
        fields.push('experience_years = ?');
        values.push(data.experience_years);
    }

    // If no data to update — return immediately
    if (fields.length === 0) return false;

    values.push(userId);

    const query = `
        UPDATE profiles
        SET ${fields.join(', ')}
        WHERE user_id = ?
    `;

    const [result] = await db.query(query, values);

    return result.affectedRows > 0;
};

/**
 * تحديث رابط الصورة الشخصية
 * Update user's avatar URL
 *
 * @param {string} userId    - ID المستخدم / User ID
 * @param {string} avatarUrl - مسار الصورة الجديدة / New avatar path
 * @returns {boolean} - true إذا نجح التحديث / true if update succeeded
 */
const updateAvatarUrl = async (userId, avatarUrl) => {

    const query = `
        UPDATE profiles
        SET avatar_url = ?
        WHERE user_id = ?
    `;

    const [result] = await db.query(query, [avatarUrl, userId]);

    return result.affectedRows > 0;
};

// Exports — تصدير جميع الدوال
module.exports = {
    createProfile,
    findByUserId,
    updateProfile,
    updateAvatarUrl 
};