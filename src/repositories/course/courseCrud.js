const db = require('../../config/database');

const createCourse = async (courseData) => {
    const { teacher_id, title, description, subdomain_id, difficulty_level } = courseData;
    const query = `
        INSERT INTO courses (teacher_id, title, description, subdomain_id, difficulty_level)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [teacher_id, title, description || null, subdomain_id, difficulty_level]);
    return findCourseById(result.insertId);
};

const findCourseById = async (id) => {
    const query = `
        SELECT
            c.id, c.teacher_id, c.title, c.description, c.subdomain_id,
            c.difficulty_level, c.thumbnail_url, c.is_published, c.created_at,
            u.full_name AS teacher_name, s.name AS subdomain_name
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        JOIN subdomains s ON c.subdomain_id = s.id
        WHERE c.id = ?
        LIMIT 1
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0] || null;
};

const findCoursesByTeacher = async (teacherId) => {
    const query = `
        SELECT 
            c.id, c.title, c.description, c.difficulty_level, c.thumbnail_url, 
            c.is_published, c.created_at, s.name AS subdomain_name,
            (SELECT COUNT(*) FROM chapters WHERE course_id = c.id) AS chapters_count,
            (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) AS lessons_count
        FROM courses c
        JOIN subdomains s ON c.subdomain_id = s.id
        WHERE c.teacher_id = ?
        ORDER BY c.created_at DESC
    `;
    const [rows] = await db.query(query, [teacherId]);
    return rows;
};

const updateCourse = async (id, updateData) => {
    const fields = [];
    const values = [];
    if (updateData.title !== undefined) { fields.push('title = ?'); values.push(updateData.title); }
    if (updateData.description !== undefined) { fields.push('description = ?'); values.push(updateData.description); }
    if (updateData.difficulty_level !== undefined) { fields.push('difficulty_level = ?'); values.push(updateData.difficulty_level); }
    if (updateData.is_published !== undefined) { fields.push('is_published = ?'); values.push(updateData.is_published); }
    if (fields.length === 0) return null;
    values.push(id);
    const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(query, values);
    return findCourseById(id);
};

const updateCourseThumbnail = async (id, thumbnailUrl) => {
    const query = `UPDATE courses SET thumbnail_url = ? WHERE id = ?`;
    const [result] = await db.query(query, [thumbnailUrl, id]);
    return result.affectedRows > 0;
};

const deleteCourse = async (id) => {
    const [result] = await db.query(`DELETE FROM courses WHERE id = ?`, [id]);
    return result.affectedRows > 0;
};

module.exports = {
    createCourse,
    findCourseById,
    findCoursesByTeacher,
    updateCourse,
    updateCourseThumbnail,
    deleteCourse
};