const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');
const profileRepository = require('../repositories/profileRepository');
const gamificationRepository = require('../repositories/gamificationRepository');
const { generateToken, verifyToken } = require('../utils/tokenGenerator');
const { sendVerificationEmail } = require('./emailService');
const { validateSignup, validateLogin, validateChangePassword } = require('../validators/authValidator'); // ✅ kept from feature/auth

/**
 * تسجيل مستخدم جديد
 * Register a new user
 */
const signup = async (userData) => {

    const { valid, messages, value } = validateSignup(userData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    const existingUser = await userRepository.findByEmail(value.email);
    if (existingUser) {
        const error = new Error('الإيميل مستخدم مسبقاً / Email already exists');
        error.statusCode = 409;
        throw error;
    }

    const password_hash = await bcrypt.hash(value.password, 12);
    const verificationToken = generateToken({ email: value.email }, '24h');

    const user = await userRepository.createUser({
        email:              value.email,
        password_hash,
        full_name:          value.full_name,
        role:               value.role,
        verification_token: verificationToken,
        token_expires_at:   new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await profileRepository.createProfile(user.id);
    await gamificationRepository.createGamificationStats(user.id, user.role);
    await sendVerificationEmail(user.email, user.full_name, verificationToken);

    return {
        message: 'تم التسجيل بنجاح، تحقق من إيميلك / Signed up successfully, check your email',
        email:   user.email
    };
};

/**
 * تفعيل حساب المستخدم عن طريق الـ token
 * Activate user account via token
 */
const verifyEmail = async (token) => {

    // الخطوة 1: تحقق من صحة الـ token
    // Step 1: Verify the token is valid
    const decoded = verifyToken(token);

    // الخطوة 2: ابحث عن المستخدم بالإيميل
    // Step 2: Find the user by email
    const user = await userRepository.findByEmail(decoded.email);
    if (!user) {
        const error = new Error('المستخدم غير موجود / User not found');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: تحقق أن الحساب لم يُفعّل مسبقاً
    // Step 3: Check account is not already active
    if (user.status === 'active') {
        const error = new Error('الحساب مفعّل مسبقاً / Account already active');
        error.statusCode = 400;
        throw error;
    }

    // الخطوة 4: فعّل الحساب
    // Step 4: Activate the account
    await userRepository.updateVerificationStatus(user.id);

    return {
        message: 'تم تفعيل حسابك بنجاح / Account activated successfully'
    };
};

/**
 * تسجيل دخول المستخدم
 * Login user
 */
const login = async (userData) => {

    // الخطوة 1: تحقق من البيانات
    // Step 1: Validate the data
    const { valid, messages, value } = validateLogin(userData);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    // الخطوة 2: ابحث عن المستخدم بالإيميل
    // Step 2: Find user by email
    const user = await userRepository.findByEmail(value.email);
    if (!user) {
        const error = new Error('الإيميل أو كلمة المرور غير صحيحة / Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    // الخطوة 3: تحقق أن الحساب مفعّل
    // Step 3: Check account is active
    if (user.status !== 'active') {
        const error = new Error('يرجى تفعيل حسابك أولاً / Please verify your email first');
        error.statusCode = 403;
        throw error;
    }

    // الخطوة 4: تحقق من كلمة المرور
    // Step 4: Check password is correct
    const isPasswordValid = await bcrypt.compare(value.password, user.password_hash);
    if (!isPasswordValid) {
        const error = new Error('الإيميل أو كلمة المرور غير صحيحة / Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    // الخطوة 5: أنشئ JWT token
    // Step 5: Generate JWT token
    const token = generateToken(
        { id: user.id, email: user.email, role: user.role },
        '7d'
    );

    return {
        message: 'تم تسجيل الدخول بنجاح / Logged in successfully',
        token,
        user: {
            id:        user.id,
            full_name: user.full_name,
            email:     user.email,
            role:      user.role
        }
    };
};

/**
 * تغيير كلمة مرور المستخدم
 * Change user's password
 */
const changePassword = async (userId, data) => {

    // الخطوة 1: تحقق من البيانات
    // Step 1: Validate the data
    const { valid, messages, value } = validateChangePassword(data);
    if (!valid) {
        const error = new Error('بيانات غير صحيحة / Invalid data');
        error.statusCode = 400;
        error.messages = messages;
        throw error;
    }

    // الخطوة 2: جلب المستخدم من DB
    // Step 2: Fetch user from DB
    const user = await userRepository.findById(userId);
    if (!user) {
        const error = new Error('المستخدم غير موجود / User not found');
        error.statusCode = 404;
        throw error;
    }

    // الخطوة 3: تحقق من كلمة المرور الحالية
    // Step 3: Verify current password
    // ملاحظة: findById لا يجلب password_hash — نحتاج findByEmail
    // Note: findById doesn't fetch password_hash — we need findByEmail
    const fullUser = await userRepository.findByEmail(user.email);
    const isValid  = await bcrypt.compare(value.current_password, fullUser.password_hash);
    if (!isValid) {
        const error = new Error('كلمة المرور الحالية غير صحيحة / Current password is incorrect');
        error.statusCode = 401;
        throw error;
    }

    // الخطوة 4: تشفير كلمة المرور الجديدة
    // Step 4: Hash the new password
    const newHash = await bcrypt.hash(value.new_password, 12);

    // الخطوة 5: حفظ الهاش الجديد في DB
    // Step 5: Save new hash in DB
    await userRepository.updatePassword(userId, newHash);

    return {
        message: 'تم تغيير كلمة المرور بنجاح / Password changed successfully'
    };
};

module.exports = {
    signup,
    verifyEmail,
    login,
    changePassword  // ✅ kept from feature/auth
};