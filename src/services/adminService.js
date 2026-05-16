const adminRepository = require('../repositories/adminRepository');

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const fetchAllUsers = () => adminRepository.getAllUsers();

const createAccount = async (data) => {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    return await adminRepository.addUser({
        id: uuidv4(),
        ...data,
        password: hashedPassword
    });
};
const updateUserRoleAndStatus = async (id, role, status) => {
    // 1. يمكنك إضافة منطق التحقق هنا (مثلاً: منع تغيير حالة الأدمن الأساسي)
    if (!id) {
        throw new Error('معرف المستخدم مطلوب');
    }

    // 2. استدعاء المستودع للتحديث
    const result = await adminRepository.updateRoleAndStatus(id, role, status);

    // 3. التحقق مما إذا كان المستخدم موجوداً أصلاً
    if (result.affectedRows === 0) {
        throw new Error('المستخدم غير موجود');
    }

    return { message: "تم تحديث البيانات بنجاح" };
};
const banUserService = async (adminId, targetUserId) => {
    // 1. منع الأدمن من حظر نفسه
    if (adminId === targetUserId) {
        throw new Error('لا يمكنك حظر حسابك الشخصي');
    }

    const result = await adminRepository.banUser(targetUserId);

    if (result.affectedRows === 0) {
        throw new Error('المستخدم غير موجود');
    }

    return { message: "تم حظر المستخدم بنجاح" };
};

const deleteUserService = async (adminId, targetUserId) => {
    if (adminId === targetUserId) {
        throw new Error('لا يمكنك حذف حسابك الشخصي');
    }

    const result = await adminRepository.deleteUser(targetUserId);

    if (result.affectedRows === 0) {
        throw new Error('المستخدم غير موجود بالفعل');
    }

    return { message: "تم حذف المستخدم نهائياً من النظام" };
};
const fetchAllCourses = async () => {
    const courses = await adminRepository.getAllCourses();

    // يمكننا هنا إضافة أي منطق إضافي قبل إرسال البيانات للـ Controller
    return courses.map(course => ({
        ...course,
        Actions: null // نترك مساحة للـ Frontend لإضافة أزرار التحكم
    }));
};
const changeCourseStatus = async (courseId, statusText) => {
    // تحويل النص إلى قيمة منطقية
    let isPublished;
    if (statusText === 'Published') {
        isPublished = 1;
    } else if (statusText === 'Draft') {
        isPublished = 0;
    } else {
        throw new Error('الحالة يجب أن تكون Published أو Draft');
    }

    const result = await adminRepository.updateCourseStatus(courseId, isPublished);
    if (result.affectedRows === 0) {
        throw new Error('الكورس غير موجود');
    }
    return { message: `تم تحديث حالة الكورس إلى ${statusText}` };
};
const removeCourse = async (courseId) => {
    const result = await adminRepository.deleteCourse(courseId);
    if (result.affectedRows === 0) throw new Error('فشل الحذف، الكورس غير موجود');

    return { message: "تم حذف الكورس نهائياً من النظام" };
};
// أضف deleteUserService إلى module.exports في الـ Service
const getAllSkills = async () => {
    return await adminRepository.getAllSkills();
};

// جلب مهارة واحدة
const getSkillById = async (skillId) => {
    const skill = await adminRepository.getSkillById(skillId);
    if (!skill) {
        const error = new Error('Skill not found');
        error.statusCode = 404;
        throw error;
    }
    return skill;
};

// إنشاء مهارة جديدة
const createSkill = async (skillData) => {
    // تحقق من وجود code فريد
    const existing = await adminRepository.getSkillByCode(skillData.code);
    if (existing) {
        const error = new Error(`Skill with code "${skillData.code}" already exists`);
        error.statusCode = 400;
        throw error;
    }
    return await adminRepository.createSkill(skillData);
};

// تحديث مهارة
const updateSkill = async (skillId, skillData) => {
    const skill = await adminRepository.getSkillById(skillId);
    if (!skill) {
        const error = new Error('Skill not found');
        error.statusCode = 404;
        throw error;
    }
    // إذا تم تغيير الكود، تحقق من عدم وجود تكرار (مع استثناء نفس id)
    if (skillData.code && skillData.code !== skill.code) {
        const existing = await adminRepository.getSkillByCode(skillData.code);
        if (existing && existing.id !== skillId) {
            const error = new Error(`Skill with code "${skillData.code}" already exists`);
            error.statusCode = 400;
            throw error;
        }
    }
    return await adminRepository.updateSkill(skillId, skillData);
};

// حذف مهارة
const deleteSkill = async (skillId) => {
    const skill = await adminRepository.getSkillById(skillId);
    if (!skill) {
        const error = new Error('Skill not found');
        error.statusCode = 404;
        throw error;
    }
    await adminRepository.deleteSkill(skillId);
    return { message: 'Skill deleted successfully' };
};

module.exports = { fetchAllUsers, createAccount, updateUserRoleAndStatus, banUserService, deleteUserService, fetchAllCourses, changeCourseStatus, removeCourse , getAllSkills, getSkillById, createSkill, updateSkill, deleteSkill };
