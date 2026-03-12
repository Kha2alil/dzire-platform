const express           = require('express');
const router            = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware    = require('../middlewares/authMiddleware');
const validateRequest   = require('../middlewares/validateRequest');
const { validateUpdateProfile } = require('../validators/profileValidator');

// كل الـ Routes تتطلب تسجيل دخول
// All routes require authentication
router.use(authMiddleware);

// GET  /api/profile/me  ← get my profile
router.get('/me', profileController.getProfile);

// PATCH /api/profile/me ← update my profile
router.patch('/me', validateRequest(validateUpdateProfile), profileController.updateProfile);

module.exports = router;