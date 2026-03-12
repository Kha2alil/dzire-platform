const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validateRequest = require('../middlewares/validateRequest');
const { validateSignup } = require('../validators/authValidator');

// Middleware يتحقق من البيانات أولاً ← ثم Controller
router.post('/signup', validateRequest(validateSignup), authController.signup);
router.get('/verify-email', authController.verifyEmail);

module.exports = router;