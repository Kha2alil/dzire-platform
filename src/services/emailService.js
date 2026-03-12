const nodemailer = require('nodemailer');
require('dotenv').config();

// البوابة التي نمر منها لإرسال الإيميل عبر Gmail
// The gateway we use to send emails via Gmail
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,        // smtp.gmail.com
    port: process.env.EMAIL_PORT,        // 587
    secure: false,                       // false للـ port 587 / false for port 587
    auth: {
        user: process.env.EMAIL_USER,    // إيميلك / your email
        pass: process.env.EMAIL_PASSWORD // كلمة مرور التطبيق / app password
    }
});

/**
 * إرسال إيميل التحقق للمستخدم الجديد
 * Send verification email to the new user
 *
 * @param {string} email - إيميل المستخدم / User's email
 * @param {string} full_name - اسم المستخدم / User's full name
 * @param {string} token - رمز التحقق / Verification token
 */
const sendVerificationEmail = async (email, full_name, token) => {

    // بناء رابط التحقق
    // Build the verification link
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email.html?token=${token}`;

    // محتوى الإيميل
    // Email content
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'تفعيل حسابك في Dzire / Activate your Dzire account',
        html: `
            <h2>مرحباً ${full_name}! / Hello ${full_name}!</h2>
            <p>
                شكراً لتسجيلك في منصة Dzire.
                Thank you for signing up on Dzire.
            </p>
            <p>
                اضغط على الرابط التالي لتفعيل حسابك:
                Click the link below to activate your account:
            </p>
            <a href="${verificationLink}">
                تفعيل الحساب / Activate Account
            </a>
            <p>
                ينتهي هذا الرابط بعد 24 ساعة.
                This link expires in 24 hours.
            </p>
        `
    };

    // إرسال الإيميل
    // Send the email
    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendVerificationEmail
};