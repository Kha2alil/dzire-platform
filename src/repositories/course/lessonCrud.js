const db = require('../../config/database');

const createLesson = async (chapterId, lessonData, courseId) => {
    const { title, order_index, duration, is_free, xp_reward, summary_text } = lessonData;

    let finalOrder = order_index;
    if (finalOrder === undefined || finalOrder === null) {
        const [maxOrderRows] = await db.query(
            'SELECT COALESCE(MAX(order_index), 0) AS max_order FROM lessons WHERE chapter_id = ?',
            [chapterId]
        );
        finalOrder = maxOrderRows[0].max_order + 1;
    }

    const query = `
        INSERT INTO lessons (course_id, chapter_id, title, order_index, duration, is_free, xp_reward, summary_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [
        courseId, chapterId, title, finalOrder,
        duration || null, is_free || false, xp_reward || 0, summary_text || null
    ]);

    const [newRows] = await db.query(
        'SELECT * FROM lessons WHERE chapter_id = ? AND title = ? ORDER BY order_index DESC LIMIT 1',
        [chapterId, title]
    );
    return newRows[0];
};

const updateLessonContent = async (id, contentData) => {
    const fields = [];
    const values = [];
    if (contentData.video_url !== undefined) { fields.push('video_url = ?'); values.push(contentData.video_url); }
    if (contentData.pdf_url !== undefined) { fields.push('pdf_url = ?'); values.push(contentData.pdf_url); }
    if (contentData.summary_text !== undefined) { fields.push('summary_text = ?'); values.push(contentData.summary_text); }
    if (fields.length === 0) return false;
    const query = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ? OR id = UUID_TO_BIN(?)`;
    values.push(id, id);
    const [result] = await db.query(query, values);
    return result.affectedRows > 0;
};

const updateLesson = async (lessonId, updateData) => {
    const fields = [];
    const values = [];
    const allowed = ['title', 'order_index', 'duration', 'is_free', 'xp_reward', 'summary_text', 'video_url', 'pdf_url', 'content_type'];
    allowed.forEach(key => {
        if (updateData[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(updateData[key]);
        }
    });
    if (fields.length === 0) return null;
    values.push(lessonId);
    await db.query(`UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`, values);
    return findLessonById(lessonId);
};

const findLessonsByChapter = async (chapterId) => {
    const query = `SELECT * FROM lessons WHERE chapter_id = ? ORDER BY order_index ASC`;
    const [rows] = await db.query(query, [chapterId]);
    return rows;
};

const findLessonById = async (id) => {
    const [rows] = await db.query('SELECT * FROM lessons WHERE id = ?', [id]);
    return rows[0] || null;
};

const deleteLesson = async (id) => {
    const [result] = await db.query('DELETE FROM lessons WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = {
    createLesson,
    updateLessonContent,
    updateLesson,
    findLessonsByChapter,
    findLessonById,
    deleteLesson
};