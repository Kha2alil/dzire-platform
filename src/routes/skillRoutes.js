const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skillController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Public (authenticated) – view all skills
router.get('/', skillController.getAllSkills);
router.get('/:id', skillController.getSkillById);

// Student – view own unlocked skills
router.get('/me/unlocked', roleMiddleware('student'), skillController.getMyUnlockedSkills);

// Admin – manage skills
router.post('/', roleMiddleware('admin'), skillController.createSkill);
router.patch('/:id', roleMiddleware('admin'), skillController.updateSkill);
router.delete('/:id', roleMiddleware('admin'), skillController.deleteSkill);

module.exports = router;