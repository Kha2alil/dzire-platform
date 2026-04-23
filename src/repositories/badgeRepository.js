const db = require('../config/database');

/**
 * Get all active badge rules for a given trigger event
 */
const getActiveRulesByEvent = async (triggerEvent) => {
    const [rows] = await db.query(
        `SELECT br.*, b.category, b.tier, b.skill_id as badge_skill_id
         FROM badge_rules br
         JOIN badges b ON br.badge_id = b.id
         WHERE br.trigger_event = ? AND br.is_active = TRUE`,
        [triggerEvent]
    );
    return rows;
};

/**
 * Get all badges (for admin/public listing)
 */
const getAllBadges = async () => {
    const [rows] = await db.query(
        `SELECT * FROM badges ORDER BY category, tier, name`
    );
    return rows;
};



/**
 * Get badges earned by a specific user
 */
const getUserBadges = async (studentId) => {
    const [rows] = await db.query(
        `SELECT b.*, sb.earned_at
         FROM student_badges sb
         JOIN badges b ON sb.badge_id = b.id
         WHERE sb.student_id = ?
         ORDER BY sb.earned_at DESC`,
        [studentId]
    );
    return rows;
};

/**
 * Award a badge to a user (idempotent)
 */
const awardBadge = async (studentId, badgeId) => {
    try {
        await db.query(
            `INSERT INTO student_badges (student_id, badge_id) VALUES (?, ?)`,
            [studentId, badgeId]
        );
        return true; // Badge awarded
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return false; // Already awarded
        }
        throw error;
    }
};

/**
 * Get a single badge by ID
 */
const getBadgeById = async (badgeId) => {
    const [rows] = await db.query(`SELECT * FROM badges WHERE id = ?`, [badgeId]);
    return rows[0] || null;
};

const getAllBadgesWithRules = async () => {
    const [rows] = await db.query(
        `SELECT b.*, 
                br.id as rule_id, 
                br.trigger_event, 
                br.scope, 
                br.skill_id as rule_skill_id, 
                br.condition_json, 
                br.is_active
         FROM badges b
         LEFT JOIN badge_rules br ON b.id = br.badge_id AND br.is_active = TRUE
         ORDER BY b.category, b.tier, b.name`
    );
    // Group rules under each badge
    const badgesMap = {};
    rows.forEach(row => {
        if (!badgesMap[row.id]) {
            badgesMap[row.id] = {
                id: row.id,
                name: row.name,
                description: row.description,
                icon_url: row.icon_url,
                xp_required: row.xp_required,
                category: row.category,
                tier: row.tier,
                required_tier: row.required_tier,
                skill_id: row.skill_id,
                rules: []
            };
        }
        if (row.rule_id) {
            badgesMap[row.id].rules.push({
                id: row.rule_id,
                trigger_event: row.trigger_event,
                scope: row.scope,
                skill_id: row.rule_skill_id,
                condition_json: row.condition_json
            });
        }
    });
    return Object.values(badgesMap);
};

module.exports = {
    getActiveRulesByEvent,
    getAllBadges,
    getUserBadges,
    awardBadge,
    getBadgeById,
    getAllBadgesWithRules
};