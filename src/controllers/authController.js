const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');

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

/**
 * استقبال طلب تسجيل الدخول وإرسال الرد
 * Receive login request and send response
 *
 * POST /api/auth/login
 */
const login = async (req, res, next) => {

    try {

        // البيانات تأتي من جسم الطلب
        // Data comes from the request body
        const userData = req.body;

        const result = await authService.login(userData);

        // نرسل التوكن وبيانات المستخدم
        // Send token and user data
        res.status(200).json({
            success: true,
            message: result.message,
            token:   result.token,
            user:    result.user
        });

    } catch (error) {
        next(error);
    }
};

/**
 * جلب بيانات المستخدم الحالي
 * Get current logged-in user data
 *
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {

    try {

        // req.user comes from authMiddleware — already verified
        const user = await userRepository.findById(req.user.id);

        if (!user) {
            const error = new Error('المستخدم غير موجود / User not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            user: {
                id:         user.id,
                full_name:  user.full_name,
                email:      user.email,
                role:       user.role,
                status:     user.status,
                created_at: user.created_at
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/auth/change-password
 * تغيير كلمة مرور المستخدم الحالي
 * Change current user's password
 */
const changePassword = async (req, res, next) => {

    try {

        const result = await authService.changePassword(req.user.id, req.body);

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
    verifyEmail,
    login,
    getMe,
    changePassword
};