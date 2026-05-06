const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

// Create Express app
const app = express();

// ── CRITICAL: CORS and JSON parsing MUST come before ANY route ──
app.use(cors());
app.use(express.json());

// ── Serve uploaded files statically (registered once) ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: function (res, filePath) {
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
        }
    }
}));

// ── Import routes AFTER middleware ──
const authRoutes        = require('./src/routes/authRoutes');
const profileRoutes     = require('./src/routes/profileRoutes');
const gamificationRoutes = require('./src/routes/gamificationRoutes');
const courseRoutes      = require('./src/routes/courseRoutes');
const studentRoutes     = require('./src/routes/studentRoutes');
const onboardingRoutes  = require('./src/routes/onboardingRoutes');
const adminRoutes       = require('./src/routes/adminRoutes');
const skills            = require('./src/routes/skillRoutes');
const badgeRoutes       = require('./src/routes/badgeRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const faqRoutes         = require('./src/routes/faqRoutes');
const teacherAnalyticsRoutes = require('./src/routes/teacherAnalyticsRoutes');
const authMiddleware     = require('./src/middlewares/authMiddleware');
const OnboardingController = require('./src/controllers/onboardingController');

// ── Mount routes ──
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/gamification',  gamificationRoutes);
app.use('/api/courses',       courseRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/onboarding',    onboardingRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/teacher',       teacherAnalyticsRoutes);
app.get('/api/subdomains',    authMiddleware, OnboardingController.getSubdomains);
app.use('/api/skills',        skills);
app.use('/api/badges',        badgeRoutes);
app.use('/api/chat',          faqRoutes);

// ── Global error handler (must be last) ──
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);

// ── Start server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});