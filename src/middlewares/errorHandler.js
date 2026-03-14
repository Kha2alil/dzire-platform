const multer = require('multer');

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

    // 2. أخطاء Multer — حجم الملف أو نوعه
    // 2. Multer errors — file size or type
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'حجم الصورة يتجاوز 2MB',
                message_en: 'Image size exceeds 2MB'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message,
            message_en: err.message
        });
    }

    // خطأ نوع الملف من fileFilter
    // File type error from fileFilter
    if (err.message && err.message.includes('JPG')) {
        return res.status(400).json({
            success: false,
            message: 'يجب أن يكون الملف صورة JPG أو PNG',
            message_en: 'File must be JPG or PNG'
        });
    }

    // 3. تحديد القيم الافتراضية
    // 3. Set default values
    let statusCode = 500;
    let message    = 'حدث خطأ في السيرفر';
    let message_en = 'Internal server error';

    // 4. فحص أنواع الأخطاء المختلفة
    // 4. Check different error types

    // خطأ 1: إيميل مكرر (MySQL Duplicate Entry)
    // Error 1: Duplicate email (MySQL Duplicate Entry)
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message    = 'البريد الإلكتروني مستخدم من قبل';
        message_en = 'Email already exists';
    }

    // خطأ 2: خطأ في التحقق من البيانات (Joi Validation)
    // Error 2: Validation error (Joi Validation)
    else if (err.name === 'ValidationError' && err.isJoi) {
        statusCode = 400;
        message    = err.details[0].message;
        message_en = err.details[0].message;
    }

    // خطأ 3: أخطاء مخصصة من الكود (Custom Errors)
    // Error 3: Custom errors from our code
    else if (err.statusCode) {
        statusCode = err.statusCode;
        message    = err.message    || message;
        message_en = err.message_en || err.message || message_en;
    }

    // 5. إرسال الرد للمستخدم
    // 5. Send response to user
    res.status(statusCode).json({
        success:    false,
        message:    message,
        message_en: message_en,
        ...(err.messages && { messages: err.messages })
    });
};

// تصدير الـ middleware
module.exports = errorHandler;