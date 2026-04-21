const db = require('../config/database');

/**
 * Get all skills ordered by display_order and name
 */
const findAll = async () => {
    const [rows] = await db.query('SELECT * FROM skills ORDER BY display_order, name');
    return rows;
};

/**
 * Find a skill by ID
 */
const findById = async (id) => {
    const [rows] = await db.query('SELECT * FROM skills WHERE id = ?', [id]);
    return rows[0] || null;
};

/**
 * Find a skill by unique code
 */
const findByCode = async (code) => {
    const [rows] = await db.query('SELECT * FROM skills WHERE code = ?', [code]);
    return rows[0] || null;
};

/**
 * Create a new skill
 */
const create = async (skillData) => {
    const { code, name, description, icon_url, category, display_order } = skillData;
    const query = `
        INSERT INTO skills (code, name, description, icon_url, category, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [code, name, description || null, icon_url || null, category || null, display_order || 0]);
    const [rows] = await db.query('SELECT * FROM skills WHERE code = ?', [code]);
    return rows[0];
};

/**
 * Update a skill
 */
const update = async (id, skillData) => {
    const fields = [];
    const values = [];
    const allowed = ['name', 'description', 'icon_url', 'category', 'display_order'];
    
    allowed.forEach(field => {
        if (skillData[field] !== undefined) {
            fields.push(`${field} = ?`);
            values.push(skillData[field]);
        }
    });
    
    if (fields.length === 0) return null;
    values.push(id);
    
    await db.query(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`, values);
    return findById(id);
};

/**
 * Delete a skill
 */
const deleteSkill = async (id) => {
    await db.query('DELETE FROM skills WHERE id = ?', [id]);
    return true;
};

/**
 * Get all skills unlocked by a specific student
 */
const getUnlockedSkillsForStudent = async (studentId) => {
    const [rows] = await db.query(
        `SELECT s.*, ss.unlocked_at, ss.unlocked_by, c.title as course_title
         FROM student_skills ss
         JOIN skills s ON ss.skill_id = s.id
         LEFT JOIN courses c ON ss.course_id = c.id
         WHERE ss.student_id = ?
         ORDER BY ss.unlocked_at DESC`,
        [studentId]
    );
    return rows;
};

/**
 * Check if a student has already unlocked a specific skill
 */
const hasUnlockedSkill = async (studentId, skillId) => {
    const [rows] = await db.query(
        'SELECT 1 FROM student_skills WHERE student_id = ? AND skill_id = ?',
        [studentId, skillId]
    );
    return rows.length > 0;
};

/**
 * Unlock a skill for a student (idempotent due to UNIQUE constraint)
 */
const unlockSkillForStudent = async (studentId, skillId, courseId = null) => {
    try {
        await db.query(
            `INSERT INTO student_skills (student_id, skill_id, unlocked_by, course_id)
             VALUES (?, ?, 'course_completion', ?)`,
            [studentId, skillId, courseId]
        );
        return true;
    } catch (error) {
        // Duplicate entry means already unlocked
        if (error.code === 'ER_DUP_ENTRY') {
            return false;
        }
        throw error;
    }
};

/**
 * Get the skill_id associated with a course
 */
const getSkillIdByCourseId = async (courseId) => {
    const [rows] = await db.query('SELECT skill_id FROM courses WHERE id = ?', [courseId]);
    return rows[0]?.skill_id || null;
};

module.exports = {
    findAll,
    findById,
    findByCode,
    create,
    update,
    deleteSkill,
    getUnlockedSkillsForStudent,
    hasUnlockedSkill,
    unlockSkillForStudent,
    getSkillIdByCourseId
};