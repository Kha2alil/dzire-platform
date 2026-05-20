const db = require('../../config/database');

const addQuestion = async (assessmentId, q) => {
    const query = `
        INSERT INTO questions (assessment_id, question_text, options, correct_answer, socratic_hint, difficulty_level, points, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        assessmentId,
        q.question_text,
        JSON.stringify(q.options),
        q.correct_answer,
        q.socratic_hint || null,
        q.difficulty_level || 'medium',
        q.points || 1,
        q.order_index || 0
    ];
    await db.query(query, values);
    // ✅ لا نعيد استدعاء findAssessmentById هنا (لتجنب الخطأ)
    return true;
};

const updateQuestion = async (questionId, updateData) => {
    const fields = []; const values = [];
    const keys = ['question_text', 'options', 'correct_answer', 'socratic_hint', 'difficulty_level', 'points', 'order_index'];
    keys.forEach(k => {
        if (updateData[k] !== undefined) {
            fields.push(`${k} = ?`);
            values.push(k === 'options' ? JSON.stringify(updateData[k]) : updateData[k]);
        }
    });
    if (fields.length === 0) return null;
    values.push(questionId);
    await db.query(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, values);
    return findQuestionById(questionId);
};

const deleteQuestion = async (id) => {
    const [result] = await db.query('DELETE FROM questions WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

const findQuestionById = async (id) => {
    const [rows] = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const q = rows[0];
    return { ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options };
};

const findQuestionsByAssessmentId = async (assessmentId) => {
    const [rows] = await db.query(
        "SELECT * FROM questions WHERE assessment_id = ? ORDER BY id ASC",
        [assessmentId]
    );
    return rows;
};

module.exports = {
    addQuestion, updateQuestion, deleteQuestion, findQuestionById, findQuestionsByAssessmentId
};