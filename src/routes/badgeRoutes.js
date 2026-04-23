const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const authMiddleware = require('../middlewares/authMiddleware');

// All badge routes require authentication
router.use(authMiddleware);

// GET /api/badges - List all available badges
router.get('/', badgeController.getAllBadges);

// GET /api/badges/me - Get current user's earned badges
router.get('/me', badgeController.getUserBadges);

module.exports = router;