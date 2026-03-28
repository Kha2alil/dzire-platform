const VALID_LEVELS = ['beginner', 'intermediate', 'pro'];

const OnboardingValidator = {

  validateDomainId(query) {
    const errors = [];
    const { domain_id } = query;

    if (!domain_id || String(domain_id).trim() === '')
      errors.push('domain_id query parameter is required.');

    return errors;
  },

  validateGetQuestions(query) {
    const errors = [];
    const { subdomain_id, domain_id, level } = query;

    if (!subdomain_id || String(subdomain_id).trim() === '')
      errors.push('subdomain_id query parameter is required.');

    if (!domain_id || String(domain_id).trim() === '')
      errors.push('domain_id query parameter is required.');

    if (!level || !VALID_LEVELS.includes(level))
      errors.push(`level must be one of: ${VALID_LEVELS.join(', ')}.`);

    return errors;
  },

  validateSubmit(body) {
    const errors = [];
    const { subdomain_id, domain_id, level, answers } = body;

    if (!subdomain_id || String(subdomain_id).trim() === '')
      errors.push('subdomain_id is required.');

    if (!domain_id || String(domain_id).trim() === '')
      errors.push('domain_id is required.');

    if (!level || !VALID_LEVELS.includes(level))
      errors.push(`level must be one of: ${VALID_LEVELS.join(', ')}.`);

    if (!Array.isArray(answers) || answers.length === 0) {
      errors.push('answers must be a non-empty array.');
    } else {
      answers.forEach((a, i) => {
        if (!a.questionId || String(a.questionId).trim() === '')
          errors.push(`answers[${i}].questionId is required.`);
        if (a.answer === undefined || a.answer === null || String(a.answer).trim() === '')
          errors.push(`answers[${i}].answer is required.`);
      });
    }

    return errors;
  },

  validateSkip(body) {
    const errors = [];
    const { subdomain_id, domain_id } = body;

    if (!subdomain_id || String(subdomain_id).trim() === '')
      errors.push('subdomain_id is required.');

    if (!domain_id || String(domain_id).trim() === '')
      errors.push('domain_id is required.');

    return errors;
  },
};

module.exports = OnboardingValidator;