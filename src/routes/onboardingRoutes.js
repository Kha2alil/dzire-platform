const express            = require('express');
const router             = express.Router();

const authMiddleware     = require('../middlewares/authMiddleware');
const roleMiddleware     = require('../middlewares/roleMiddleware');
const OnboardingController = require('../controllers/onboardingController');

const studentOnly = [authMiddleware, roleMiddleware('student')];

router.get('/status',     ...studentOnly, OnboardingController.getStatus);
router.get('/domains',    ...studentOnly, OnboardingController.getDomains);
router.get('/subdomains', ...studentOnly, OnboardingController.getSubdomains);
router.get('/questions',  ...studentOnly, OnboardingController.getQuestions);
router.post('/submit',    ...studentOnly, OnboardingController.submitTest);
router.post('/skip',      ...studentOnly, OnboardingController.skipTest);

module.exports = router;