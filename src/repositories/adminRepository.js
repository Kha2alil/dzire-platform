const db = require('../config/database');

// 1. جلب قائمة الطلاب والأساتذة فقط
const getAllUsers = async () => {
    const query = `SELECT id, full_name, email, role, status, created_at FROM users WHERE role IN ('student', 'teacher') ORDER BY created_at DESC`;
    const [rows] = await db.query(query);
    return rows;
};

// 2. إضافة مستخدم جديد (Add)
const addUser = async (userData) => {
    const { id, full_name, email, password, role, status = 'active' } = userData;
    const query = `
        INSERT INTO users (id, full_name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    return await db.query(query, [id, full_name, email, password, role, status]);
};

// دالة التعديل في المستودع
const updateRoleAndStatus = async (id, role, status) => {
    const query = `
        UPDATE users 
        SET role = ?, status = ? 
        WHERE id = ?
    `;

    // تنفيذ الاستعلام
    const [result] = await db.query(query, [role, status, id]);
    return result;
};

const banUser = async (id) => {
    const query = `UPDATE users SET status = 'banned' WHERE id = ?`;
    const [result] = await db.query(query, [id]);
    return result;
};

const deleteUser = async (id) => {
    const query = `DELETE FROM users WHERE id = ?`;
    const [result] = await db.query(query, [id]);
    return result;
};
const getAllCourses = async () => {
   const query = `
        SELECT 
            c.id,
            c.title AS Course,
            u.full_name AS Instructor,
            c.difficulty_level AS Level,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS Students,
            c.is_published,   -- أضفنا هذا الحقل (0 أو 1)
            CASE 
                WHEN c.is_published = 1 THEN 'Published' 
                ELSE 'Draft' 
            END AS Status
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        ORDER BY c.created_at DESC
    `;
    const [rows] = await db.query(query);
    return rows;
};

// تحديث حالة الكورس (مثلاً: published, draft, archived)
const updateCourseStatus = async (id, isPublished) => {
    // نغير status إلى is_published
    const query = `UPDATE courses SET is_published = ? WHERE id = ?`;

    // نمرر القيمة (0 أو 1) والمعرف
    const [result] = await db.query(query, [isPublished, id]);
    return result;
};

// حذف كورس
const deleteCourse = async (id) => {
    const query = `DELETE FROM courses WHERE id = ?`;
    const [result] = await db.query(query, [id]);
    return result;
};

const getAllSkills = async () => {
    const [rows] = await db.query(
        `SELECT id, code, name, description, icon_url, category, display_order, created_at, updated_at
         FROM skills
         ORDER BY display_order ASC, name ASC`
    );
    return rows;
};

// جلب مهارة بواسطة id
const getSkillById = async (skillId) => {
    const [rows] = await db.query(
        `SELECT id, code, name, description, icon_url, category, display_order
         FROM skills WHERE id = ?`,
        [skillId]
    );
    return rows[0] || null;
};

// جلب مهارة بواسطة code (للتحقق من الفريدة)
const getSkillByCode = async (code) => {
    const [rows] = await db.query(`SELECT id FROM skills WHERE code = ?`, [code]);
    return rows[0] || null;
};

// إنشاء مهارة جديدة
const createSkill = async (skillData) => {
    const { code, name, description, category, display_order, icon_url } = skillData;
    // استخدم UUID() داخل الاستعلام بدلاً من uuidv4()
    const [result] = await db.query(
        `INSERT INTO skills (id, code, name, description, icon_url, category, display_order)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [code, name, description, icon_url, category, display_order || 0]
    );
    // لاحظ: لا يمكننا إرجاع id مباشرة بهذه الطريقة، يجب جلب السجل بعد الإدراج أو استخدام LAST_INSERT_ID()
    // للحصول على id، يمكنك إما جلب السجل مرة أخرى:
    const [rows] = await db.query(`SELECT id FROM skills WHERE code = ?`, [code]);
    return { id: rows[0].id, ...skillData };
};

// تحديث مهارة
const updateSkill = async (skillId, skillData) => {
    const { code, name, description, icon_url, category, display_order } = skillData;
    await db.query(
        `UPDATE skills 
         SET code = ?, name = ?, description = ?, icon_url = ?, category = ?, display_order = ?, updated_at = NOW()
         WHERE id = ?`,
        [code, name, description, icon_url, category, display_order, skillId]
    );
    return { id: skillId, ...skillData };
};

// حذف مهارة (تحقق من عدم وجود ارتباطات مع courses)
const deleteSkill = async (skillId) => {
    // أولاً، تحقق إذا كانت المهارة مستخدمة في أي كورس
    const [used] = await db.query(`SELECT COUNT(*) as count FROM courses WHERE skill_id = ?`, [skillId]);
    if (used[0].count > 0) {
        throw new Error('Skill is used in one or more courses. Cannot delete.');
    }
    await db.query(`DELETE FROM skills WHERE id = ?`, [skillId]);
    return true;
};

// لا تنسَ إضافة deleteUser إلى module.exports في ملف الـ Repository
module.exports = { getAllUsers, addUser, updateRoleAndStatus, banUser, deleteUser, getAllCourses, updateCourseStatus, deleteCourse , getAllSkills, getSkillById, getSkillByCode, createSkill, updateSkill, deleteSkill}; 