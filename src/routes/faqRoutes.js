const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const authMiddleware = require('../middlewares/authMiddleware');

// All chat routes require login
router.use(authMiddleware);

// POST /api/chat/faq
router.post('/faq', faqController.askFAQ);

module.exports = router;