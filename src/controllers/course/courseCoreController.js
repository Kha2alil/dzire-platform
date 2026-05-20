const courseService = require('../../services/courseService');

const createCourse = async (req, res, next) => {
    try {
        const course = await courseService.createCourse(req.user, req.body);
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الكورس بنجاح / Course created successfully',
            data: { course }
        });
    } catch (error) { next(error); }
};

const getTeacherCourses = async (req, res, next) => {
    try {
        const courses = await courseService.getTeacherCourses(req.user.id);
        res.status(200).json({ success: true, data: { courses } });
    } catch (error) { next(error); }
};

const getCourseDetails = async (req, res, next) => {
    try {
        const course = await courseService.getCourseDetails(req.params.courseId, req.user.id);
        res.status(200).json({ success: true, data: { course } });
    } catch (error) { next(error); }
};

const updateCourse = async (req, res, next) => {
    try {
        const course = await courseService.updateCourse(req.params.courseId, req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: 'تم تعديل الكورس بنجاح / Course updated successfully',
            data: { course }
        });
    } catch (error) { next(error); }
};

const uploadThumbnail = async (req, res, next) => {
    try {
        const result = await courseService.updateCourseThumbnail(req.params.courseId, req.user.id, req.file);
        res.status(200).json({
            success: true,
            message: 'تم رفع صورة الغلاف بنجاح / Thumbnail uploaded successfully',
            data: result
        });
    } catch (error) { next(error); }
};

const togglePublishStatus = async (req, res, next) => {
    try {
        const course = await courseService.toggleCoursePublishStatus(
            req.params.courseId,
            req.user.id,
            req.body.is_published
        );
        res.status(200).json({
            success: true,
            message: req.body.is_published
                ? 'تم نشر الكورس بنجاح / Course published successfully'
                : 'تم تحويل الكورس إلى مسودة / Course moved to draft',
            data: { course }
        });
    } catch (error) { next(error); }
};

const deleteCourse = async (req, res, next) => {
    try {
        const result = await courseService.deleteCourse(req.params.courseId, req.user.id);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
};

const updateCourseInfo = async (req, res, next) => {
    try {
        const course = await courseService.updateCourseInfo(
            req.params.courseId,
            req.user.id,
            { title: req.body.title, description: req.body.description }
        );
        res.status(200).json({
            success: true,
            message: 'Course info updated successfully',
            course
        });
    } catch (error) { next(error); }
};

module.exports = {
    createCourse,
    getTeacherCourses,
    getCourseDetails,
    updateCourse,
    uploadThumbnail,
    togglePublishStatus,
    deleteCourse
    , updateCourseInfo
};