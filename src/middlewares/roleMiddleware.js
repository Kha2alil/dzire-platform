/**
 * Middleware للتحقق من صلاحية الدور
 * Middleware to check user role authorization
 *
 * يُستخدم بعد authMiddleware مباشرةً
 * Used directly after authMiddleware
 *
 * مثال / Example:
 *   router.post('/', authMiddleware, roleMiddleware('teacher'), courseController.createCourse)
 *
 * @param {...string} roles - الأدوار المسموحة / Allowed roles
 * @returns {Function} - Middleware function
 */
const roleMiddleware = (...roles) => {

    return (req, res, next) => {

        // req.user تأتي من authMiddleware
        // req.user comes from authMiddleware
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'يرجى تسجيل الدخول أولاً / Please log in first'
            });
        }

        // تحقق أن دور المستخدم ضمن الأدوار المسموحة
        // Check that user role is within allowed roles
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `هذه العملية مخصصة لـ ${roles.join(' أو ')} فقط / This action is for ${roles.join(' or ')} only`
            });
        }

        next();
    };
};


module.exports = roleMiddleware;
