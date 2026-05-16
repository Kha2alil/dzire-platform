const express = require('express');
const router  = express.Router();

const studentController = require('../controllers/studentController');
const authMiddleware    = require('../middlewares/authMiddleware');
const roleMiddleware    = require('../middlewares/roleMiddleware');
const studentService = require('../services/studentService');

router.use(authMiddleware);

// GET /api/students/search?name=ahmed&level=2
router.get(
    '/search',
    roleMiddleware('teacher'),
    studentController.searchStudents
);
//GET  /api/students/enroll
router.post('/enroll',
    authMiddleware,
    roleMiddleware('student'),
    studentController.enroll
);
router.get('/leaderboard', authMiddleware ,roleMiddleware('student') , studentController.getLeaderboardData);

router.post('/:studentId/update', authMiddleware, studentController.updateProgress);

router.get(
    '/:courseId/assessments/:assessmentId',
    authMiddleware,
    roleMiddleware('teacher', 'student'),
    studentController.getAssessmentById
);

router.get(
    '/courses/:courseId/assessments',
    authMiddleware,
    roleMiddleware('student'),
    studentController.getAssessmentsByCourse
);

// GET /api/students/assessments/overview
router.get('/assessments/overview', authMiddleware, roleMiddleware('student'), async (req, res, next) => {
    try {
        const data = await studentService.getAssessmentsOverview(req.user.id);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

module.exports = router;