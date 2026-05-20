const courseService = require('../../services/courseService');

const createAssessment = async (req, res, next) => {
    try {
        const assessment = await courseService.createAssessment(
            req.params.courseId,
            req.params.chapterId,
            req.user.id,
            req.body
        );
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الـ Assessment بنجاح / Assessment created successfully',
            data: { assessment }
        });
    } catch (error) { next(error); }
};

const deleteAssessment = async (req, res, next) => {
    try {
        const result = await courseService.deleteAssessment(
            req.params.courseId,
            req.params.chapterId,
            req.params.assessmentId,
            req.user.id
        );
        res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
};

const updateAssessment = async (req, res, next) => {
    try {
        const assessment = await courseService.updateAssessment(
            req.params.courseId,
            req.params.chapterId,
            req.params.assessmentId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: 'تم تعديل الاختبار بنجاح',
            data: { assessment }
        });
    } catch (error) { next(error); }
};

const updateQuestion = async (req, res, next) => {
    try {
        const question = await courseService.updateQuestion(
            req.params.courseId,
            req.params.assessmentId,
            req.params.questionId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: 'تم تعديل السؤال بنجاح',
            data: { question }
        });
    } catch (error) { next(error); }
};

const addQuestion = async (req, res, next) => {
    try {
        const assessment = await courseService.addQuestion(
            req.params.courseId,
            req.params.assessmentId,
            req.user.id,
            req.body
        );
        res.status(201).json({
            success: true,
            message: 'تم إضافة السؤال بنجاح',
            data: { assessment }
        });
    } catch (error) { next(error); }
};

const deleteQuestion = async (req, res, next) => {
    try {
        const result = await courseService.deleteQuestion(
            req.params.courseId,
            req.params.assessmentId,
            req.params.questionId,
            req.user.id
        );
        res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
};
const submitAssessment = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const studentId = req.user.id;
        const { answers } = req.body;

        const result = await courseService.submitAssessment(studentId, assessmentId, answers);
        res.status(200).json({
            success: true,
            score: result.score,
            passed: result.passed,
            message: result.passed ? 'Assessment passed!' : 'Assessment failed. Try again.',
            xp_gained: result.xp_gained
        });
    } catch (error) {
        next(error);
    }
};

const submitBossExam = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const studentId = req.user.id;
        const { code, language } = req.body;

        const result = await courseService.submitBossExam(studentId, assessmentId, code, language);
        res.status(200).json({
            success: true,
            score: result.score,
            passed: result.passed,
            results: result.results,
            ai_feedback: result.ai_feedback,
            xp_gained: result.xp_gained
        });
    } catch (error) {
        next(error);
    }
};


module.exports = {
    createAssessment,
    deleteAssessment,
    updateAssessment,
    updateQuestion,
    addQuestion,
    deleteQuestion,
    submitAssessment,
    submitBossExam
};