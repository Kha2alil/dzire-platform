const courseService = require('../../services/courseService');

const createChapter = async (req, res, next) => {
    try {
        const chapter = await courseService.createChapter(req.params.courseId, req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: 'تم إضافة الـ Chapter بنجاح / Chapter added successfully',
            data: { chapter }
        });
    } catch (error) { next(error); }
};

const deleteChapter = async (req, res, next) => {
    try {
        const result = await courseService.deleteChapter(req.params.courseId, req.params.chapterId, req.user.id);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
};

const updateChapter = async (req, res, next) => {
    try {
        const chapter = await courseService.updateChapter(
            req.params.courseId,
            req.params.chapterId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: 'تم تعديل الـ Chapter بنجاح',
            data: { chapter }
        });
    } catch (error) { next(error); }
};

module.exports = {
    createChapter,
    deleteChapter,
    updateChapter
};