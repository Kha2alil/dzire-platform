const db = require('../../config/database');

const createChapter = async (courseId, chapterData) => {
    const { title, order_index } = chapterData;

    let finalOrder = order_index;
    if (finalOrder === undefined || finalOrder === null) {
        const [maxOrderRows] = await db.query(
            'SELECT COALESCE(MAX(order_index), 0) AS max_order FROM chapters WHERE course_id = ?',
            [courseId]
        );
        finalOrder = maxOrderRows[0].max_order + 1;
    }

    const query = 'INSERT INTO chapters (course_id, title, order_index) VALUES (?, ?, ?)';
    await db.query(query, [courseId, title, finalOrder]);

    const [newRows] = await db.query(
        'SELECT * FROM chapters WHERE course_id = ? AND title = ? ORDER BY order_index DESC LIMIT 1',
        [courseId, title]
    );
    return newRows[0];
};

const findChaptersByCourse = async (courseId) => {
    const query = `
        SELECT ch.id, ch.title, ch.order_index,
               COUNT(DISTINCT l.id) AS lessons_count,
               COUNT(DISTINCT a.id) AS assessments_count
        FROM chapters ch
        LEFT JOIN lessons l ON l.chapter_id = ch.id
        LEFT JOIN assessments a ON a.chapter_id = ch.id
        WHERE ch.course_id = ?
        GROUP BY ch.id ORDER BY ch.order_index ASC
    `;
    const [rows] = await db.query(query, [courseId]);
    return rows;
};

const findChapterById = async (id) => {
    const [rows] = await db.query('SELECT * FROM chapters WHERE id = ?', [id]);
    return rows[0] || null;
};

const updateChapter = async (chapterId, updateData) => {
    const fields = [];
    const values = [];
    if (updateData.title !== undefined) { fields.push('title = ?'); values.push(updateData.title); }
    if (updateData.order_index !== undefined) { fields.push('order_index = ?'); values.push(updateData.order_index); }
    if (fields.length === 0) return null;
    values.push(chapterId);
    await db.query(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, values);
    return findChapterById(chapterId);
};

const deleteChapter = async (id) => {
    const [result] = await db.query('DELETE FROM chapters WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = {
    createChapter,
    findChaptersByCourse,
    findChapterById,
    updateChapter,
    deleteChapter
};