const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validateRequest = require('../middlewares/validateRequest');
const authMiddleware = require('../middlewares/authMiddleware');
const { validateSignup, validateLogin } = require('../validators/authValidator');


// POST /api/auth/signup
router.post('/signup',       validateRequest(validateSignup), authController.signup);

// GET  /api/auth/verify-email?token=...
router.get('/verify-email',  authController.verifyEmail);

// POST /api/auth/login
router.post('/login',        validateRequest(validateLogin),  authController.login);

// GET /api/auth/me  ← Requires authentication
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;