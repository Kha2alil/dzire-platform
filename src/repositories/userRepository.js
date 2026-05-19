const db = require('../config/database');

/**
 * إنشاء مستخدم جديد في قاعدة البيانات
 * Create a new user in the database
 *
 * @param {Object} userData - بيانات المستخدم الجديد / New user data
 * @returns {Object} - المستخدم المُنشأ مع الـ ID / Created user with ID
 */

const createUser = async (userData) => {

    const query = `
        INSERT INTO users (
            email,
            password_hash,
            full_name,
            role,
            verification_token,
            token_expires_at,
            status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending_verification')
    `;

    const values = [
        userData.email,
        userData.password_hash,
        userData.full_name,
        userData.role,
        userData.verification_token,
        userData.token_expires_at
    ];

    const [result] = await db.query(query, values);

    // Fetch the user from DB instead of relying on insertId
    // نجلب المستخدم من DB بدل الاعتماد على insertId
    const [rows] = await db.query(
        'SELECT * FROM users WHERE email = ?',
        [userData.email]
    );

    return rows[0];
};

/**
 * البحث عن مستخدم عن طريق الإيميل
 * Find a user by their email address
 *
 * تُستخدم في / Used in:
 *   - التسجيل: للتأكد أن الإيميل غير مستخدم مسبقاً
 *   - Signup: to ensure the email is not already taken
 *   - تسجيل الدخول: للتحقق من كلمة المرور
 *   - Login: to verify the password
 *
 * @param {string} email - الإيميل المراد البحث عنه / Email to search for
 * @returns {Object|null} - بيانات المستخدم أو null إذا لم يوجد / User data or null if not found
*/
const findByEmail = async (email) => {

    const query = `
        SELECT
            id,
            email,
            password_hash,
            full_name,
            role,
            status,
            verification_token,
            token_expires_at,
            created_at
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    const [rows] = await db.query(query, [email]);

    return rows[0] || null;
};

/**
 * البحث عن مستخدم عن طريق الـ ID
 * Find a user by their ID
 *
 * تُستخدم في / Used in:
 *   - بعد التحقق من الـ JWT token لجلب بيانات المستخدم الحالي
 *   - After verifying the JWT token to fetch the current user's data
 *
 * ملاحظة: لا تجلب password_hash لأنها غير ضرورية هنا
 * Note: does not fetch password_hash as it is not needed here
 *
 * @param {number} id - الـ ID المراد البحث عنه / ID to search for
 * @returns {Object|null} - بيانات المستخدم أو null إذا لم يوجد / User data or null if not found
 */
const findById = async (id) => {

    const query = `
        SELECT
            id,
            email,
            full_name,
            username,
            role,
            status,
            created_at
        FROM users
        WHERE id = ?
        LIMIT 1
    `;

    const [rows] = await db.query(query, [id]);

    return rows[0] || null;
};

/**
 * تحديث حالة المستخدم إلى 'active' بعد تأكيد الإيميل
 * Update user status to 'active' after email verification
 *
 * تُستخدم في / Used in:
 *   - عندما يضغط المستخدم على رابط التحقق في إيميله
 *   - When the user clicks the verification link in their email
 *
 * ماذا تفعل بالضبط / What it does exactly:
 *   1. تغير status من 'pending_verification' إلى 'active'
 *      Changes status from 'pending_verification' to 'active'
 *   2. تمسح verification_token (استُخدم مرة واحدة فقط)
 *      Clears verification_token (one-time use only)
 *   3. تمسح token_expires_at
 *      Clears token_expires_at
 *
 * @param {number} userId - الـ ID للمستخدم المراد تفعيله / ID of user to activate
 * @returns {boolean} - true إذا نجح التحديث / true if update succeeded
 *                      false إذا لم يُعثر على المستخدم / false if user not found
 */
const updateVerificationStatus = async (userId) => {

    const query = `
        UPDATE users
        SET
            status = 'active',
            verification_token = NULL,
            token_expires_at = NULL
        WHERE id = ?
    `;

    const [result] = await db.query(query, [userId]);

    return result.affectedRows > 0;
};

/**
 * تحديث الاسم الكامل للمستخدم
 * Update user's full name
 *
 * @param {string} userId - ID المستخدم / User ID
 * @param {string} fullName - الاسم الجديد / New full name
 * @returns {boolean} - true إذا نجح التحديث / true if update succeeded
 */
const updateFullName = async (userId, fullName) => {

    const query = `
        UPDATE users
        SET full_name = ?
        WHERE id = ?
    `;

    const [result] = await db.query(query, [fullName, userId]);

    return result.affectedRows > 0;
};

/**
 * تحديث كلمة مرور المستخدم
 * Update user's password
 *
 * @param {string} userId   - ID المستخدم / User ID
 * @param {string} newHash  - الهاش الجديد لكلمة المرور / New password hash
 * @returns {boolean} - true إذا نجح التحديث / true if update succeeded
 */
const updatePassword = async (userId, newHash) => {

    const query = `
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
    `;

    const [result] = await db.query(query, [newHash, userId]);

    return result.affectedRows > 0;
};

/**
 * تحديث اسم المستخدم
 * Update username
 *
 * @param {string} userId   - ID المستخدم / User ID
 * @param {string} username - اسم المستخدم الجديد / New username
 * @returns {boolean}
 */
const updateUsername = async (userId, username) => {

    const query = `
        UPDATE users
        SET username = ?
        WHERE id = ?
    `;

    const [result] = await db.query(query, [username, userId]);

    return result.affectedRows > 0;
};

const findAdminIds = async () => {
    const [rows] = await db.query(
        "SELECT id FROM users WHERE role = 'admin' AND status = 'active'"
    );
    return rows.map(r => r.id);
};

// Exports — تصدير جميع الدوال
module.exports = {
    createUser,
    findByEmail,
    findById,
    updateVerificationStatus,
    updateFullName,
    updatePassword,
    updateUsername,
    findAdminIds
};