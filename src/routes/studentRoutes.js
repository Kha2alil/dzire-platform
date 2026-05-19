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

router.get('/evaluate-all-badges', authMiddleware, async (req, res, next) => {
    try {
        const badgeService = require('../services/badgeService');
        const triggers = ['lesson_completed', 'quiz_passed', 'course_completed', 'skill_unlocked'];
        const results = [];
        for (const trigger of triggers) {
            const awarded = await badgeService.evaluateAndAwardBadges(req.user.id, trigger);
            results.push({ trigger, awarded });
        }
        res.json({ success: true, results });
    } catch (err) {
        next(err);
    }
});

// GET /api/student/quests → list standalone quests
router.get('/quests', async (req, res, next) => {
  try {
    const db = require('../config/database');
    const [quests] = await db.query(
      `SELECT id, title, description, language, starter_code, xp_reward
       FROM assessments 
       WHERE type = 'quest'
       ORDER BY id ASC`               // ← changed from created_at to id
    );
    const result = quests.map(q => ({ ...q, difficulty: 'beginner' }));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/student/quests/:id/submit – submit a quest solution
router.post('/quests/:id/submit', authMiddleware, roleMiddleware('student'), async (req, res, next) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });
    const questService = require('../services/questService');
    const result = await questService.submitQuest(req.user.id, req.params.id, code, language);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/student/quests/:id/hint – get AI hint for a quest
router.post('/quests/:id/hint', authMiddleware, roleMiddleware('student'), async (req, res, next) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    const db = require('../config/database');
    const [questRows] = await db.query('SELECT * FROM assessments WHERE id = ? AND type = ?', [req.params.id, 'quest']);
    const quest = questRows[0];
    if (!quest) return res.status(404).json({ success: false, message: 'Quest not found' });

    const aiService = require('../services/aiService');
    const prompt = `You are a friendly coding mentor. The student is working on this task:
"${quest.description}"

Here is their current code:
\`\`\`${language}
${code}
\`\`\`

Give ONE short, encouraging hint (max 60 words) that helps them move forward. Don't give the full solution. Focus on what might be wrong or what they should try next. For HTML/CSS, check structure and tags. For JavaScript, suggest debugging or logic fixes.`;

    const aiResponse = await aiService.askAI(req.user.id, prompt);
    res.json({ success: true, data: { hint: aiResponse } });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/assessments/my-attempts → get student's quest/boss exam attempts
router.get('/assessments/my-attempts', authMiddleware, async (req, res, next) => {
  try {
    const db = require('../config/database');
    const [rows] = await db.query(
      `SELECT sa.assessment_id, MAX(sa.passed) as passed
       FROM student_assessments sa
       JOIN assessments a ON sa.assessment_id = a.id
       WHERE sa.student_id = ? AND a.type IN ('quest', 'boss_exam')
       GROUP BY sa.assessment_id`,
      [req.user.id]
    );
    const data = rows.map(r => ({
      assessment_id: r.assessment_id,
      passed: r.passed === 1
    }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

module.exports = router;