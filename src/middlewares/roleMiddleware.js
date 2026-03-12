const roleMiddleware = (requiredRole) => {

    return (req, res, next) => {

        // req.user comes from authMiddleware — must run AFTER it
        // req.user يأتي من authMiddleware — يجب أن يعمل بعده دائماً
        if (!req.user) {
            const error = new Error('غير مصرح / Unauthorized');
            error.statusCode = 401;
            return next(error);
        }

        // تحقق أن دور المستخدم يطابق الدور المطلوب
        // Check user role matches the required role
        if (req.user.role !== requiredRole) {
            const error = new Error('ليس لديك صلاحية للقيام بهذا / You do not have permission');
            error.statusCode = 403;
            return next(error);
        }

        // الدور صحيح → تابع للـ Controller
        // Role is correct → continue to Controller
        next();
    };
};

module.exports = roleMiddleware;