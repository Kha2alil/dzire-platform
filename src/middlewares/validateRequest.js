/**
 * Middleware للتحقق من بيانات الطلب قبل وصوله للـ Controller
 * Middleware to validate request data before it reaches the Controller
 *
 * @param {Function} validatorFn - دالة التحقق المراد تطبيقها / Validator function to apply
 * @returns {Function} - Middleware function
*/

const validateRequest = (validatorFn) => {

    return (req, res, next) => {

        // نشغّل الـ validator على بيانات الطلب
        // Run the validator on the request data
        const { valid, messages } = validatorFn(req.body);

        if (!valid) {
            // نوقف الطلب ونرسل رسالة خطأ للمستخدم
            // Stop the request and send error message to the user
            return res.status(400).json({
                success: false,
                messages
            });
        }

        // البيانات صحيحة → نكمل للـ Controller
        // Data is valid → continue to Controller
        next();
    };
};

module.exports = validateRequest;