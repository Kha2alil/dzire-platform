/**
 * معالج الأخطاء العام
 * Global Error Handler
 * 
 * يتعامل مع جميع الأخطاء في التطبيق ويحولها لرسائل واضحة
 * Handles all application errors and converts them to clear messages
 */

const errorHandler = (err, req, res, next) => {
    
    // 1. تسجيل الخطأ في console للمطور
    // 1. Log error in console for developer
    console.error('❌ خطأ / Error occurred:');
    console.error('📍 المسار / Path:', req.method, req.originalUrl);
    console.error('📛 رسالة الخطأ / Error message:', err.message);
    console.error('🔍 التفاصيل الكاملة / Full details:', err);
    console.error('─────────────────────────────────────');
    
    // 2. تحديد القيم الافتراضية
    // 2. Set default values
    let statusCode = 500;
    let message = 'حدث خطأ في السيرفر';
    let message_en = 'Internal server error';
    
    // 3. فحص أنواع الأخطاء المختلفة
    // 3. Check different error types
    
    // خطأ 1: إيميل مكرر (MySQL Duplicate Entry)
    //  Error 1: Duplicate email (MySQL Duplicate Entry)
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'البريد الإلكتروني مستخدم من قبل';
        message_en = 'Email already exists';
    }
    
    //  خطأ 2: خطأ في التحقق من البيانات (Joi Validation)
    //  Error 2: Validation error (Joi Validation)
    else if (err.name === 'ValidationError' && err.isJoi) {
        statusCode = 400;
        message = err.details[0].message;
        message_en = err.details[0].message;
    }
    
    //  خطأ 3: أخطاء مخصصة من الكود (Custom Errors)
    //  Error 3: Custom errors from our code
    else if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message || message;
        message_en = err.message_en || err.message || message_en;
    }
    
    // 4. إرسال الرد للمستخدم
    // 4. Send response to user
    res.status(statusCode).json({
        success: false,
        message: message,
        message_en: message_en
    });
};

// Export function
module.exports = errorHandler;