const db = require('../../config/database');
const { addQuestion } = require('./questionCrud');  // ✅ استيراد addQuestion

const createAssessment = async (chapterId, assessmentData, courseId, lessonId = null) => {
    const { title, type, passing_score, questions, xp_reward, description, language, starter_code, test_cases } = assessmentData;
    const finalScore = passing_score || 50;
    const xp = xp_reward || 0;
    const testCasesJson = test_cases ? JSON.stringify(test_cases) : null;

    let query;
    let params;
    if (lessonId) {
        query = `
            INSERT INTO assessments (course_id, chapter_id, lesson_id, title, type, passing_score, xp_reward, description, language, starter_code, test_cases)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        params = [courseId, chapterId, lessonId, title, type, finalScore, xp, description || null, language || null, starter_code || null, testCasesJson];
    } else {
        query = `
            INSERT INTO assessments (course_id, chapter_id, title, type, passing_score, xp_reward, description, language, starter_code, test_cases)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        params = [courseId, chapterId, title, type, finalScore, xp, description || null, language || null, starter_code || null, testCasesJson];
    }
    await db.query(query, params);

    let idQuery;
    let idParams;
    if (lessonId) {
        idQuery = `SELECT id FROM assessments WHERE course_id = ? AND chapter_id = ? AND lesson_id = ? AND title = ? ORDER BY id DESC LIMIT 1`;
        idParams = [courseId, chapterId, lessonId, title];
    } else {
        idQuery = `SELECT id FROM assessments WHERE course_id = ? AND chapter_id = ? AND title = ? ORDER BY id DESC LIMIT 1`;
        idParams = [courseId, chapterId, title];
    }
    const [assRows] = await db.query(idQuery, idParams);
    const assessmentId = assRows[0].id;

    if (questions && Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
            await addQuestion(assessmentId, q);
        }
    }
    return findAssessmentById(assessmentId);
};

const findAssessmentById = async (id) => {
    const [assRows] = await db.query('SELECT * FROM assessments WHERE id = ?', [id]);
    if (!assRows[0]) return null;
    const [questions] = await db.query(`SELECT * FROM questions WHERE assessment_id = ? ORDER BY order_index ASC`, [id]);
    const parsedQuestions = questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));
    const assessment = assRows[0];
    if (assessment.test_cases && typeof assessment.test_cases === 'string') {
        try { assessment.test_cases = JSON.parse(assessment.test_cases); } catch(e) { assessment.test_cases = []; }
    }
    return { ...assessment, questions: parsedQuestions };
};

const findAssessmentsByChapter = async (chapterId) => {
    const query = `
        SELECT 
            a.*, 
            COUNT(q.id) as questions_count
        FROM assessments a
        LEFT JOIN questions q ON a.id = q.assessment_id
        WHERE a.chapter_id = ?
        GROUP BY a.id;
    `;
    const [rows] = await db.query(query, [chapterId]);
    return rows;
};

const updateAssessment = async (assessmentId, data) => {
    await db.query(
        `UPDATE assessments 
         SET title = ?, type = ?, passing_score = ?, lesson_id = ?
         WHERE id = ?`,
        [
            data.title,
            data.type,
            data.passing_score,
            data.lesson_id || null,
            assessmentId
        ]
    );
    if (data.questions && Array.isArray(data.questions)) {
        await db.query("DELETE FROM questions WHERE assessment_id = ?", [assessmentId]);
        for (const q of data.questions) {
            await addQuestion(assessmentId, q);
        }
    }
    return { success: true };
};

const deleteAssessment = async (id) => {
    const [result] = await db.query('DELETE FROM assessments WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = {
    createAssessment, findAssessmentById, findAssessmentsByChapter, updateAssessment, deleteAssessment
};