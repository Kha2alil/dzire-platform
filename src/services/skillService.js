const skillRepository = require('../repositories/skillRepository');

/**
 * Get all skills (system-defined)
 */
const getAllSkills = async () => {
    return skillRepository.findAll();
};

/**
 * Get a single skill by ID
 */
const getSkillById = async (id) => {
    const skill = await skillRepository.findById(id);
    if (!skill) {
        const error = new Error('Skill not found');
        error.statusCode = 404;
        throw error;
    }
    return skill;
};

/**
 * Create a new skill (admin only)
 */
const createSkill = async (skillData) => {
    if (!skillData.code || !skillData.name) {
        const error = new Error('code and name are required');
        error.statusCode = 400;
        throw error;
    }

    const existing = await skillRepository.findByCode(skillData.code);
    if (existing) {
        const error = new Error('Skill code already exists');
        error.statusCode = 409;
        throw error;
    }

    return skillRepository.create(skillData);
};

/**
 * Update an existing skill (admin only)
 */
const updateSkill = async (id, skillData) => {
    const skill = await skillRepository.update(id, skillData);
    if (!skill) {
        const error = new Error('Skill not found');
        error.statusCode = 404;
        throw error;
    }
    return skill;
};

/**
 * Delete a skill (admin only)
 */
const deleteSkill = async (id) => {
    await skillRepository.deleteSkill(id);
};

/**
 * Get all skills unlocked by the current student
 */
const getMyUnlockedSkills = async (studentId) => {
    return skillRepository.getUnlockedSkillsForStudent(studentId);
};

/**
 * Core unlocking logic – called when a student completes a course
 * If the course is linked to a skill, unlock it for the student
 */
const unlockSkillIfCourseCompleted = async (studentId, courseId) => {
    const skillId = await skillRepository.getSkillIdByCourseId(courseId);
    if (!skillId) return null; // no skill linked to this course

    const unlocked = await skillRepository.unlockSkillForStudent(studentId, skillId, courseId);
    
    if (unlocked) {
        // Optionally send a notification (requires notificationService)
        try {
            const notificationService = require('./notificationService');
            const courseRepository = require('../repositories/courseRepository');
            const course = await courseRepository.findCourseById(courseId);
            const skill = await skillRepository.findById(skillId);
            
            await notificationService.sendNotification(
                studentId,
                'achievement',
                '🎉 New Skill Unlocked!',
                `You have unlocked the "${skill.name}" skill by completing "${course.title}".`,
                '/skills'
            );
        } catch (err) {
            // Notification failure should not break the unlock flow
            console.error('Failed to send skill unlock notification:', err.message);
        }
        return { unlocked: true, skillId };
    }
    
    return { unlocked: false, alreadyUnlocked: true };
};

module.exports = {
    getAllSkills,
    getSkillById,
    createSkill,
    updateSkill,
    deleteSkill,
    getMyUnlockedSkills,
    unlockSkillIfCourseCompleted
};