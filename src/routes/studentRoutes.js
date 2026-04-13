const express = require('express');
const router  = express.Router();

const studentController = require('../controllers/studentController');
const authMiddleware    = require('../middlewares/authMiddleware');
const roleMiddleware    = require('../middlewares/roleMiddleware');

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
module.exports = router;