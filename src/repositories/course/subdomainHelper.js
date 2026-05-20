const db = require('../../config/database');

const getCourseSubdomain = async (courseId) => {
    const [rows] = await db.query(`SELECT s.id, s.name FROM subdomains s JOIN courses c ON c.subdomain_id = s.id WHERE c.id = ?`, [courseId]);
    return rows[0] || null;
};

module.exports = { getCourseSubdomain };