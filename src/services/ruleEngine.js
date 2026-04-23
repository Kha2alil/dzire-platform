/**
 * Evaluate a single badge rule condition against user data
 * @param {Object} rule - The badge rule object containing condition_json
 * @param {Object} userData - Object with user's aggregated stats
 * @returns {boolean} - True if conditions are met
 */
const evaluateRule = (rule, userData) => {
    try {
        const conditions = rule.condition_json;
        if (!conditions || Object.keys(conditions).length === 0) {
            return false;
        }

        for (const [field, operatorObj] of Object.entries(conditions)) {
            const userValue = userData[field] !== undefined ? userData[field] : 0;
            const operator = Object.keys(operatorObj)[0];
            const threshold = operatorObj[operator];

            switch (operator) {
                case '>=':
                    if (!(userValue >= threshold)) return false;
                    break;
                case '>':
                    if (!(userValue > threshold)) return false;
                    break;
                case '<=':
                    if (!(userValue <= threshold)) return false;
                    break;
                case '<':
                    if (!(userValue < threshold)) return false;
                    break;
                case '==':
                    if (!(userValue == threshold)) return false;
                    break;
                case '===':
                    if (!(userValue === threshold)) return false;
                    break;
                default:
                    return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Rule evaluation error:', error.message);
        return false;
    }
};

module.exports = { evaluateRule };