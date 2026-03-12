/**
 * مولد ومُحقق الـتوكنز
 * JWT Token Generator and Verifier
 * 
 * يُستخدم لـ:
 * - توليد tokens للتحقق من الإيميل / Generate tokens for email verification
 * - التحقق من صحة الـ tokens / Verify token validity
 * - تسجيل الدخول (لاحقاً) / Login (later)
 */

const jwt = require('jsonwebtoken');

/**
 * توليد JWT token
 * Generate JWT token
 * 
 * @param {Object} payload - البيانات المراد تشفيرها / Data to encode
 *   مثال / Example: { userId: "abc-123", email: "test@example.com" }
 * @param {string} expiresIn - مدة صلاحية الـ token / Token expiry time
 *   القيم المسموحة / Allowed values: '1h', '24h', '7d', etc.
 *   القيمة الافتراضية / Default: '24h'
 * @returns {string} - الـ token المُشفّر / Encrypted token
 * @throws {Error} - إذا فشل التوليد / If generation fails
 */

const generateToken = (payload, expiresIn = '24h') => {
    
    try {
        // توليد الـ token باستخدام jwt.sign()
        // Generate token using jwt.sign()
        const token = jwt.sign(
            payload,                        // البيانات المراد تشفيرها / Data to encode
            process.env.JWT_SECRET,         // المفتاح السري من .env / Secret key from .env
            { expiresIn: expiresIn }        // مدة الصلاحية / Expiry time
        );
        
        return token;
        
    } catch (error) {
        console.error('❌ خطأ في توليد الـ token / Error generating token:', error.message);
        throw new Error('فشل في توليد الـ token / Failed to generate token');
    }
};

/**
 * التحقق من صحة الـ token
 * Verify token validity
 * 
 * @param {string} token - الـ token المراد التحقق منه / Token to verify
 * @returns {Object} - البيانات المفكوكة من الـ token / Decoded data from token
 *   مثال / Example: { userId: "abc-123", email: "test@example.com", iat: 1710268800, exp: 1710355200 }
 * @throws {Error} - إذا كان الـ token غير صالح أو منتهي الصلاحية / If token is invalid or expired
 */

const verifyToken = (token) => {
    
    try {
        // التحقق من الـ token وفك تشفيره
        // Verify and decode token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        return decoded;
        
    } catch (error) {
        
        //  خطأ 1: Token منتهي الصلاحية (مرت 24 ساعة)
        //  Error 1: Token expired (24 hours passed)
        if (error.name === 'TokenExpiredError') {
            const err = new Error('انتهت صلاحية الرابط، يرجى طلب رابط جديد');
            err.message_en = 'Link expired, please request a new one';
            err.statusCode = 401;
            throw err;
        }
        
        //  خطأ 2: Token غير صالح (مُعدّل أو مزيف)
        //  Error 2: Token invalid (modified or fake)
        if (error.name === 'JsonWebTokenError') {
            const err = new Error('الرابط غير صالح');
            err.message_en = 'Invalid link';
            err.statusCode = 401;
            throw err;
        }
        
        //  خطأ 3: أي خطأ آخر غير متوقع
        //  Error 3: Any other unexpected error
        const err = new Error('فشل التحقق من الرابط');
        err.message_en = 'Failed to verify link';
        err.statusCode = 500;
        throw err;
    }
};

// تصدير الدالتين
// Export both functions
module.exports = { generateToken, verifyToken };