const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Auth & Profile (feature/auth)
const authRoutes        = require('./src/routes/authRoutes');
const profileRoutes     = require('./src/routes/profileRoutes');
const gamificationRoutes = require('./src/routes/gamificationRoutes');
const errorHandler      = require('./src/middlewares/errorHandler');

// Courses & Students (feature/courses)
const courseRoutes  = require('./src/routes/courseRoutes');
const studentRoutes = require('./src/routes/studentRoutes');

// Load environment variables from .env file
// تحميل متغيرات البيئة من ملف .env
dotenv.config();

// Create Express app
// إنشاء تطبيق Express
const app = express();

// Allow Frontend to communicate with Backend
// السماح للـ Frontend بالتواصل مع الـ Backend
app.use(cors());

// Automatically parse JSON in every request
// تحويل الـ JSON تلقائياً في كل طلب
app.use(express.json());

// Serve uploaded files statically (registered once)
app.use('/uploads', express.static('uploads'));

// Connect the Routes
// ربط الـ Routes
app.use('/api/auth',          authRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/gamification',  gamificationRoutes);
app.use('/api/courses',       courseRoutes);
app.use('/api/students',      studentRoutes);

// Error Handler — must always be last
// ربط الـ Error Handler - يجب أن يكون آخر شيء دائماً
app.use(errorHandler);

// Start the server
// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});