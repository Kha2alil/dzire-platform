const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');


// جلب قائمة الطلاب والأساتذة لعرضها في الجدول
router.get('/profiles', authMiddleware, roleMiddleware('admin'), adminController.getProfiles);

// إضافة مستخدم جديد (زر Add)
router.post('/add-user', authMiddleware, roleMiddleware('admin'), adminController.addProfile);


router.put(
    '/edit-user/:id',
    authMiddleware,                      // التحقق من التوكن
    roleMiddleware('admin'),      // التحقق من صلاحية الأدمن
    adminController.editUserPermissions // الدالة في الـ Controller
);

router.patch(
    '/ban-user/:id',
    authMiddleware,
    roleMiddleware('admin'),
    adminController.banUser
);
router.delete(
    '/delete-user/:id',
    authMiddleware,
    roleMiddleware('admin'),
    adminController.deleteUser
);
// جلب الكورسات
router.get('/courses', authMiddleware, roleMiddleware('admin'), adminController.listCourses);

// تعديل حالة كورس
router.patch('/courses/:id/status', authMiddleware, roleMiddleware('admin'), adminController.editCourseStatus);

// حذف كورس
router.delete('/courses/:id', authMiddleware, roleMiddleware('admin'), adminController.destroyCourse);
// تعديل بيانات مستخدم (زر Edit)

module.exports = router;