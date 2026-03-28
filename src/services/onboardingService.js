const OnboardingRepository = require('../repositories/onboardingRepository');

const LEVEL_THRESHOLDS = {
  pro:          0.70,
  intermediate: 0.40,
};

const QUESTIONS_PER_TEST = 10;

function assignLevel(scorePercent) {
  if (scorePercent >= LEVEL_THRESHOLDS.pro)          return 'pro';
  if (scorePercent >= LEVEL_THRESHOLDS.intermediate) return 'intermediate';
  return 'beginner';
}

function gradeAnswers(answers, questions) {
  const questionMap = new Map(questions.map(q => [q.id, q]));
  let earnedPoints = 0;
  let totalPoints  = 0;

  const perQuestion = answers.map(({ questionId, answer }) => {
    const q = questionMap.get(questionId);
    if (!q) return { questionId, correct: false, points: 0 };

    totalPoints += q.points;
    const isCorrect = String(answer).trim().toLowerCase() ===
                      String(q.correct_answer).trim().toLowerCase();
    if (isCorrect) earnedPoints += q.points;

    return { questionId, correct: isCorrect, points: isCorrect ? q.points : 0 };
  });

  for (const q of questions) {
    const answered = answers.some(a => a.questionId === q.id);
    if (!answered) totalPoints += q.points;
  }

  const scorePercent = totalPoints > 0 ? earnedPoints / totalPoints : 0;
  return { earnedPoints, totalPoints, scorePercent, perQuestion };
}

const OnboardingService = {

  async getOnboardingStatus(studentId) {
    return OnboardingRepository.getPlacementResult(studentId);
  },

  async getDomains() {
    return OnboardingRepository.getAllDomains();
  },

  async getSubdomains(domainId) {
    const subdomains = await OnboardingRepository.getSubdomainsByDomain(domainId);
    if (!subdomains.length) {
      const err = new Error('Domain not found or has no subdomains.');
      err.statusCode = 404;
      throw err;
    }
    return subdomains;
  },

  async getPlacementQuestions(subdomainId, domainId, level) {
    const subdomain = await OnboardingRepository.getSubdomain(subdomainId, domainId);
    if (!subdomain) {
      const err = new Error('Subdomain does not belong to the specified domain.');
      err.statusCode = 400;
      throw err;
    }

    const questions = await OnboardingRepository.getQuestions(subdomainId, level, QUESTIONS_PER_TEST);
    if (!questions.length) {
      const err = new Error(`No placement questions available for this subdomain at level "${level}".`);
      err.statusCode = 404;
      throw err;
    }

    return questions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));
  },

  async submitPlacementTest({ studentId, subdomainId, domainId, level, answers }) {
    const existing = await OnboardingRepository.getPlacementResult(studentId);
    if (existing) {
      const err = new Error('Placement test already completed. Onboarding is done.');
      err.statusCode = 409;
      throw err;
    }

    const subdomain = await OnboardingRepository.getSubdomain(subdomainId, domainId);
    if (!subdomain) {
      const err = new Error('Subdomain does not belong to the specified domain.');
      err.statusCode = 400;
      throw err;
    }

    const questions = await OnboardingRepository.getQuestionsWithAnswers(subdomainId, level);
    if (!questions.length) {
      const err = new Error('No questions found for this test configuration.');
      err.statusCode = 404;
      throw err;
    }

    const { earnedPoints, totalPoints, scorePercent, perQuestion } =
      gradeAnswers(answers, questions);

    const assignedLevel = assignLevel(scorePercent);

    await OnboardingRepository.savePlacementResult({
      studentId,
      subdomainId,
      domainId,
      level: assignedLevel,
      score: parseFloat((scorePercent * 100).toFixed(2)),
    });

    return { earnedPoints, totalPoints, scorePercent: parseFloat((scorePercent * 100).toFixed(2)), assignedLevel, perQuestion };
  },

  async skipToLevel({ studentId, subdomainId, domainId }) {
    const existing = await OnboardingRepository.getPlacementResult(studentId);
    if (existing) {
      const err = new Error('Onboarding already completed.');
      err.statusCode = 409;
      throw err;
    }

    const subdomain = await OnboardingRepository.getSubdomain(subdomainId, domainId);
    if (!subdomain) {
      const err = new Error('Subdomain does not belong to the specified domain.');
      err.statusCode = 400;
      throw err;
    }

    await OnboardingRepository.savePlacementResult({
      studentId,
      subdomainId,
      domainId,
      level: 'beginner',
      score: 0,
    });

    return { assignedLevel: 'beginner', skipped: true };
  },
};

module.exports = OnboardingService;