const { verifyToken } = require('../utils/tokenGenerator');

/**
 * التحقق من صحة الـ JWT token
 * Verify JWT token on protected routes
 *
 * How to use:
 * router.get('/profile', authMiddleware, profileController.getMe)
 */
const authMiddleware = (req, res, next) => {

    // الخطوة 1: اقرأ الـ token من الـ Header
    // Step 1: Read token from the Header
    const authHeader = req.headers.authorization;

    // الخطوة 2: تحقق أن الـ Header موجود وصيغته صحيحة
    // Step 2: Check Header exists and format is correct
    // Format must be: "Bearer TOKEN_HERE"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error('لا يوجد توكن / No token provided');
        error.statusCode = 401;
        return next(error);
    }

    // الخطوة 3: استخرج الـ token من الـ Header
    // Step 3: Extract token from Header
    // "Bearer TOKEN_HERE" → split → ["Bearer", "TOKEN_HERE"] → [1]
    const token = authHeader.split(' ')[1];

    // الخطوة 4: تحقق من صحة الـ token
    // Step 4: Verify the token
    const decoded = verifyToken(token);

    // الخطوة 5: تحقق أن الـ token صالح وغير منتهي
    // Step 5: Check token is valid and not expired
    if (!decoded) {
        const error = new Error('توكن غير صالح أو منتهي / Invalid or expired token');
        error.statusCode = 401;
        return next(error);
    }

    // الخطوة 6: احفظ بيانات المستخدم في الـ request
    // Step 6: Save user data in the request
    // Now req.user is available in ALL controllers after this middleware
    req.user = {
        id:    decoded.id,
        email: decoded.email,
        role:  decoded.role
    };

    // الخطوة 7: تابع للـ Controller
    // Step 7: Continue to the Controller
    next();
};

module.exports = authMiddleware;