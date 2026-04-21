const skillService = require('../services/skillService');

/**
 * GET /api/skills
 * Get all skills (system-defined)
 */
const getAllSkills = async (req, res, next) => {
    try {
        const skills = await skillService.getAllSkills();
        res.status(200).json({ success: true, skills });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/skills/:id
 * Get a single skill by ID
 */
const getSkillById = async (req, res, next) => {
    try {
        const skill = await skillService.getSkillById(req.params.id);
        res.status(200).json({ success: true, skill });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/skills
 * Create a new skill (admin only)
 */
const createSkill = async (req, res, next) => {
    try {
        const skill = await skillService.createSkill(req.body);
        res.status(201).json({
            success: true,
            message: 'Skill created successfully',
            skill
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/skills/:id
 * Update an existing skill (admin only)
 */
const updateSkill = async (req, res, next) => {
    try {
        const skill = await skillService.updateSkill(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: 'Skill updated successfully',
            skill
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/skills/:id
 * Delete a skill (admin only)
 */
const deleteSkill = async (req, res, next) => {
    try {
        await skillService.deleteSkill(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Skill deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/skills/me/unlocked
 * Get all skills unlocked by the current student
 */
const getMyUnlockedSkills = async (req, res, next) => {
    try {
        const skills = await skillService.getMyUnlockedSkills(req.user.id);
        res.status(200).json({ success: true, skills });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllSkills,
    getSkillById,
    createSkill,
    updateSkill,
    deleteSkill,
    getMyUnlockedSkills
};