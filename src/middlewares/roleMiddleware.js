/**
 * Middleware للتحقق من صلاحية الدور
 * Middleware to check user role authorization
 *
 * يُستخدم بعد authMiddleware مباشرةً
 * Used directly after authMiddleware
 *
 * يدعم دوراً واحداً أو أكثر
 * Supports one or multiple roles
 *
 * مثال / Example:
 *   router.post('/', authMiddleware, roleMiddleware('admin'), ...)
 *   router.post('/', authMiddleware, roleMiddleware('teacher', 'admin'), ...)
 *
 * @param {...string} roles - الأدوار المسموحة / Allowed roles
 * @returns {Function} - Middleware function
 */
const roleMiddleware = (...roles) => {

    return (req, res, next) => {

        // req.user تأتي من authMiddleware — يجب أن يعمل بعده دائماً
        // req.user comes from authMiddleware — must run after it
        if (!req.user) {
            const error = new Error('غير مصرح / Unauthorized');
            error.statusCode = 401;
            return next(error);     // ✅ consistent: delegate to errorHandler
        }

        // تحقق أن دور المستخدم ضمن الأدوار المسموحة
        // Check that user role is within allowed roles
        if (!roles.includes(req.user.role)) {
            const error = new Error(
                `هذه العملية مخصصة لـ ${roles.join(' أو ')} فقط / This action is for ${roles.join(' or ')} only`
            );
            error.statusCode = 403;
            return next(error);     // ✅ consistent: delegate to errorHandler
        }

        // الدور صحيح → تابع للـ Controller
        // Role is correct → continue to Controller
        next();
    };
};

module.exports = roleMiddleware;