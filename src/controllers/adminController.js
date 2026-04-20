const adminService = require('../services/adminService');
const adminRepository = require('../repositories/adminRepository');
const bcrypt = require('bcrypt');

// 1. جلب القائمة (للعرض في الجدول)

const getProfiles = async (req, res) => {
    try {
        const users = await adminService.fetchAllUsers();
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. إضافة مستخدم (زر Add)
const { v4: uuidv4 } = require('uuid'); // استيراد المكتبة

const addProfile = async (req, res, next) => {
    try {
        const { full_name, email, password, role } = req.body;

        const id = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 12);

        // ✅ نمرر hashedPassword تحت مفتاح password (وليس password_hash)
        const newUser = await adminRepository.addUser({
            id,
            full_name,
            email,
            password: hashedPassword,   // التصحيح هنا
            role,
            status: 'active'
        });

        res.status(201).json({
            success: true,
            message: "تمت إضافة المستخدم بنجاح",
            data: { id, full_name, email, role }
        });
    } catch (error) {
        next(error);
    }
};

const editUserPermissions = async (req, res, next) => {
    try {
        const { id } = req.params; // معرف المستخدم من الرابط
        const { role, status } = req.body; // البيانات الجديدة من Postman

        // تنفيذ التحديث
        const result = await adminRepository.updateRoleAndStatus(id, role, status);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "المستخدم غير موجود"
            });
        }

        res.status(200).json({
            success: true,
            message: "تم تحديث الصلاحيات والحالة بنجاح"
        });
    } catch (error) {
        next(error); // تمرير الخطأ للميدل وير العام
    }
};
const banUser = async (req, res, next) => {
    try {
        const { id } = req.params; // ID المستخدم المراد حظره
        const adminId = req.user.id; // ID الأدمن الذي يقوم بالعملية

        const response = await adminService.banUserService(adminId, id);

        res.status(200).json({
            success: true,
            ...response
        });
    } catch (error) {
        next(error);
    }

};
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        const response = await adminService.deleteUserService(adminId, id);

        res.status(200).json({
            success: true,
            ...response
        });
    } catch (error) {
        next(error);
    }
};
const listCourses = async (req, res, next) => {
    try {
        const courses = await adminService.fetchAllCourses();
        res.status(200).json({ success: true, data: courses });
    } catch (error) { next(error); }
};

// adminController.js
const editCourseStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const response = await adminService.changeCourseStatus(id, status);

        res.status(200).json({
            success: true,
            message: response.message
        });
    } catch (error) {
        next(error);
    }
};
const destroyCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const response = await adminService.removeCourse(id);
        res.status(200).json({ success: true, ...response });
    } catch (error) { next(error); }
};

module.exports = { getProfiles, addProfile, editUserPermissions, banUser, deleteUser, listCourses, editCourseStatus, destroyCourse };