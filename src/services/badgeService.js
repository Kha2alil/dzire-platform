const badgeRepository = require('../repositories/badgeRepository');
const progressRepository = require('../repositories/progressRepository');
const ruleEngine = require('./ruleEngine');

/**
 * Evaluate all relevant rules and award badges if conditions are met
 */
const evaluateAndAwardBadges = async (studentId, triggerEvent) => {
    const rules = await badgeRepository.getActiveRulesByEvent(triggerEvent);
    if (!rules.length) return;

    const globalStats = await progressRepository.getUserGlobalStats(studentId);
    const awardedBadges = [];

    for (const rule of rules) {
        let userData;
        if (rule.scope === 'global') {
            userData = { ...globalStats };
        } else {
            const skillProgress = await progressRepository.getUserSkillProgress(studentId, rule.skill_id);
            if (!skillProgress) continue;

            // Get the badge to check its required_tier
            const badge = await badgeRepository.getBadgeById(rule.badge_id);
            const requiredTier = badge?.required_tier || 'beginner';
            const tierActivated = skillProgress[`${requiredTier}_courses`] >= 1;

            if (!tierActivated) continue; // Tier not unlocked yet – skip this badge

            userData = { ...skillProgress };
        }

        if (ruleEngine.evaluateRule(rule, userData)) {
            const awarded = await badgeRepository.awardBadge(studentId, rule.badge_id);
            if (awarded) {
                awardedBadges.push(rule.badge_id);
            }
        }
    }

    // Optionally send notifications for newly awarded badges
    if (awardedBadges.length > 0) {
        const notificationService = require('./notificationService');
        for (const badgeId of awardedBadges) {
            const badge = await badgeRepository.getBadgeById(badgeId);
            if (badge) {
                await notificationService.sendNotification(
                    studentId,
                    'achievement',
                    `🏅 New Badge: ${badge.name}`,
                    `You earned the "${badge.name}" badge!`,
                    '/student-badges.html'
                );
            }
        }
    }

    return awardedBadges;
};

/**
 * Get all badges in the system
 */
const getAllBadges = async () => {
    return badgeRepository.getAllBadgesWithRules();
};

/**
 * Get badges earned by a specific user
 */
const getUserBadges = async (studentId) => {
    return badgeRepository.getUserBadges(studentId);
};

module.exports = {
    evaluateAndAwardBadges,
    getAllBadges,
    getUserBadges
};