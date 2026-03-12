const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const profileRoutes = require('./src/routes/profileRoutes');          // ← NEW
const errorHandler = require('./src/middlewares/errorHandler');

// تحميل متغيرات البيئة من ملف .env
// Load environment variables from .env file
dotenv.config();

// إنشاء تطبيق Express
// Create Express app
const app = express();

// السماح للـ Frontend بالتواصل مع الـ Backend
// Allow Frontend to communicate with Backend
app.use(cors());

// تحويل الـ JSON تلقائياً في كل طلب
// Automatically parse JSON in every request
app.use(express.json());

// ربط الـ Routes
// Connect the Routes
app.use('/api/auth',    authRoutes);
app.use('/api/profile', profileRoutes);                               // ← NEW

// ربط الـ Error Handler - يجب أن يكون آخر شيء دائماً
// Connect Error Handler - must always be the last thing
app.use(errorHandler);

// تشغيل السيرفر
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});