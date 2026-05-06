const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const teacherAnalyticsService = require('../services/teacherAnalyticsService');

router.use(authMiddleware);
router.use(roleMiddleware('teacher'));

// GET /api/teacher/failure-points?limit=5
router.get('/failure-points', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const data = await teacherAnalyticsService.getFailurePoints(req.user.id, limit);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// GET /api/teacher/failure-points/:assessmentId/students
router.get('/failure-points/:assessmentId/students', async (req, res, next) => {
  try {
    const data = await teacherAnalyticsService.getStudentsForAssessment(
      req.params.assessmentId,
      req.user.id
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/assessments
router.get('/assessments', async (req, res, next) => {
    try {
        const data = await teacherAnalyticsService.getAssessments(req.user.id);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// GET /api/teacher/failure-points/count
router.get('/failure-points/count', async (req, res, next) => {
    try {
        const count = await teacherAnalyticsService.countFailurePoints(req.user.id);
        res.json({ success: true, count });
    } catch (err) {
        next(err);
    }
});

module.exports = router;