/**
 * التحقق من قوة كلمة المرور
 * Validate password strength
 * 
 * @param {string} password - كلمة المرور المراد التحقق منها
 * @returns {Object} - نتيجة التحقق
*/

const validatePassword = (password) => {
    
    // مصفوفة لتخزين الأخطاء
    // Array to store errors
    const errors = [];
    
    // 1. التحقق من الطول (8 أحرف على الأقل)
    // 1. Check length (minimum 8 characters)
    if (password.length < 8) {
        errors.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
        errors.push('Password must be at least 8 characters');
    }
    
    // 2. التحقق من وجود حرف كبير
    // 2. Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push('يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل');
        errors.push('Password must contain at least one uppercase letter');
    }
    
    // 3. التحقق من وجود حرف صغير
    // 3. Check for lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push('يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل');
        errors.push('Password must contain at least one lowercase letter');
    }
    
    // 4. التحقق من وجود رقم
    // 4. Check for digit
    if (!/[0-9]/.test(password)) {
        errors.push('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل');
        errors.push('Password must contain at least one number');
    }
    
    // 5. التحقق من وجود رمز خاص
    // 5. Check for special character
    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (!@#$%^&*)');
        errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    // إرجاع النتيجة
    // Return result
    return {
        isValid: errors.length === 0,  // صحيحة إذا لا توجد أخطاء
        errors: errors
    };
};

module.exports = { validatePassword };