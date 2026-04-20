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

// لا تنسَ إضافة deleteUser إلى module.exports في ملف الـ Repository
module.exports = { getAllUsers, addUser, updateRoleAndStatus, banUser, deleteUser, getAllCourses, updateCourseStatus, deleteCourse }; 