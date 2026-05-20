const OnboardingRepository = require('../repositories/onboardingRepository');

const LEVEL_THRESHOLDS = {
  advanced:          0.70,
  intermediate: 0.40,
};
const QUESTIONS_PER_TEST = 17;
const VALID_LEVELS       = ['beginner', 'intermediate', 'advanced'];

/* ── helpers ── */
function assignLevel(scorePercent) {
  if (scorePercent >= LEVEL_THRESHOLDS.advanced)          return 'advanced';
  if (scorePercent >= LEVEL_THRESHOLDS.intermediate) return 'intermediate';
  return 'beginner';
}

function gradeAnswers(answers, questions) {
  const questionMap = new Map(questions.map(q => [q.id, q]));
  let earnedPoints  = 0;
  let totalPoints   = 0;

  const perQuestion = answers.map(({ questionId, answer }) => {
    const q = questionMap.get(questionId);
    if (!q) return { questionId, correct: false, points: 0 };

    totalPoints += q.points;
    const isCorrect =
      String(answer).trim().toLowerCase() ===
      String(q.correct_answer).trim().toLowerCase();
    if (isCorrect) earnedPoints += q.points;

    return { questionId, correct: isCorrect, points: isCorrect ? q.points : 0 };
  });

  // Count unanswered questions against the total
  for (const q of questions) {
    if (!answers.some(a => a.questionId === q.id)) totalPoints += q.points;
  }

  const scorePercent = totalPoints > 0 ? earnedPoints / totalPoints : 0;
  return { earnedPoints, totalPoints, scorePercent, perQuestion };
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ═══════════════════════════════════════════════════════════════
   SERVICE
═══════════════════════════════════════════════════════════════ */
const OnboardingService = {

  async getOnboardingStatus(studentId) {
    return OnboardingRepository.getPlacementResult(studentId);
  },

  async getDomains() {
    return OnboardingRepository.getAllDomains();
  },

  async getSubdomains(domainId) {
    const subdomains = await OnboardingRepository.getSubdomainsByDomain(domainId);
    if (domainId && !subdomains.length) {
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

    // 7 beginner, 5 intermediate, 5 advanced = 17 total
    const counts = { beginner: 7, intermediate: 5, advanced: 5 };

    let allQuestions = [];

    for (const [lvl, count] of Object.entries(counts)) {
      const questions = await OnboardingRepository.getQuestions(
        subdomainId, lvl, count
      );
      allQuestions = allQuestions.concat(questions);
    }

    // If any level didn't have enough questions, fill the gap with any available questions
    if (allQuestions.length < QUESTIONS_PER_TEST) {
      const remaining = QUESTIONS_PER_TEST - allQuestions.length;
      // Try to get remaining from all levels (the repository can return any level)
      const extraQuestions = await OnboardingRepository.getQuestions(
        subdomainId, null, remaining
      );
      allQuestions = allQuestions.concat(extraQuestions);
    }

    if (allQuestions.length === 0) {
      const err = new Error(
        'No placement questions available for this subdomain.'
      );
      err.statusCode = 404;
      throw err;
    }

    // Shuffle the mixed set and take exactly QUESTIONS_PER_TEST
    allQuestions = shuffleArray(allQuestions).slice(0, QUESTIONS_PER_TEST);

    return allQuestions.map(q => ({
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

    return {
      earnedPoints,
      totalPoints,
      scorePercent:   parseFloat((scorePercent * 100).toFixed(2)),
      assignedLevel,
      perQuestion,
    };
  },

  /**
   * Skip the placement test and record the student's self-assessed level.
   *
   * @param {string} studentId
   * @param {string} subdomainId
   * @param {string} domainId
   * @param {string} [level='beginner'] – The level chosen by the student on the
   *   onboarding form.  Defaults to 'beginner' if not supplied so that existing
   *   callers that don't pass a level still work.
   */
  async skipToLevel({ studentId, subdomainId, domainId, level }) {
    // Guard: don't overwrite an existing result
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

    // Sanitise level — fall back to 'beginner' when missing or invalid
    const safeLevel = level && VALID_LEVELS.includes(String(level).trim())
      ? String(level).trim()
      : 'beginner';

    await OnboardingRepository.savePlacementResult({
      studentId,
      subdomainId,
      domainId,
      level: safeLevel,
      score: 0,
    });

    return { assignedLevel: safeLevel, skipped: true };
  },
  
};

module.exports = OnboardingService;