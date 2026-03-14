const express                 = require('express');
const router                  = express.Router();
const gamificationController  = require('../controllers/gamificationController');
const authMiddleware           = require('../middlewares/authMiddleware');

// كل الـ Routes تتطلب تسجيل دخول
// All routes require authentication
router.use(authMiddleware);

// GET /api/gamification/me ← students only
router.get('/me', gamificationController.getStats);

module.exports = router;