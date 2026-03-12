const authService = require('../services/authService');

/**
 * استقبال طلب التسجيل وإرسال الرد
 * Receive signup request and send response
 *
 * POST /api/auth/signup
*/

const signup = async (req, res, next) => {

    try {

        // البيانات تأتي من جسم الطلب
        // Data comes from the request body
        const userData = req.body;

        // نعطي البيانات للـ Service ليتعامل معها
        // We give the data to the Service to handle
        const result = await authService.signup(userData);

        // نرسل رسالة نجاح للمستخدم
        // Send success response to the user
        res.status(201).json({
            success: true,
            message: result.message,
            email: result.email
        });

    } catch (error) {
        // نمرر الخطأ للـ errorHandler تلقائياً
        // Pass the error to errorHandler automatically
        next(error);
    }
};

/**
 * استقبال طلب تفعيل الحساب وإرسال الرد
 * Receive email verification request and send response
 *
 * GET /api/auth/verify-email?token=...
 */
const verifyEmail = async (req, res, next) => {

    try {

        // الـ token يأتي من الـ URL وليس من الـ body
        // The token comes from the URL not from the body
        const { token } = req.query;

        if (!token) {
            const error = new Error('الـ token مفقود / Token is missing');
            error.statusCode = 400;
            throw error;
        }

        const result = await authService.verifyEmail(token);

        // نرسل رسالة نجاح للمستخدم
        // Send success response to the user
        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    verifyEmail
};