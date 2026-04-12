const OnboardingService   = require('../services/onboardingService');
const OnboardingValidator = require('../validators/onboardingValidator');

function sendError(res, statusCode, errors) {
  return res.status(statusCode).json({ success: false, errors });
}

const OnboardingController = {

  async getStatus(req, res) {
    try {
      const result = await OnboardingService.getOnboardingStatus(req.user.id);

      if (result) {
        return res.status(200).json({
          success: true,
          onboardingDone: true,
          result: {
            level:          result.level,
            score:          result.score,
            subdomain_id:   result.subdomain_id,
            subdomain_name: result.subdomain_name,
            domain_id:      result.domain_id,
            domain_name:    result.domain_name,
            taken_at:       result.taken_at,
          },
        });
      }

      return res.status(200).json({ success: true, onboardingDone: false });

    } catch (err) {
      console.error('[OnboardingController.getStatus]', err);
      return sendError(res, 500, ['Internal server error.']);
    }
  },

  async getDomains(req, res) {
    try {
      const domains = await OnboardingService.getDomains();
      return res.status(200).json({ success: true, domains });
    } catch (err) {
      console.error('[OnboardingController.getDomains] REAL ERROR:', err.message, err.stack);
      return sendError(res, 500, [err.message || 'Failed to load domains.']);
    }
  },

  async getSubdomains(req, res) {
    try {
      const domainId = req.query.domain_id || null;

      if (domainId) {
        const errors = OnboardingValidator.validateDomainId(req.query);
        if (errors.length) return sendError(res, 400, errors);
      }

      const subdomains = await OnboardingService.getSubdomains(domainId);
      return res.status(200).json({ success: true, subdomains });

    } catch (err) {
      console.error('[OnboardingController.getSubdomains] REAL ERROR:', err.message);
      if (err.statusCode === 404) {
        return res.status(200).json({ success: true, subdomains: [] });
      }
      return sendError(res, err.statusCode || 500, [err.message]);
    }
  },

  async getQuestions(req, res) {
    try {
      const errors = OnboardingValidator.validateGetQuestions(req.query);
      if (errors.length) return sendError(res, 400, errors);

      const { subdomain_id, domain_id, level } = req.query;
      const questions = await OnboardingService.getPlacementQuestions(
        subdomain_id, domain_id, level
      );

      return res.status(200).json({ success: true, level, questions });

    } catch (err) {
      console.error('[OnboardingController.getQuestions]', err);
      return sendError(res, err.statusCode || 500, [err.message]);
    }
  },

  async submitTest(req, res) {
    try {
      const errors = OnboardingValidator.validateSubmit(req.body);
      if (errors.length) return sendError(res, 400, errors);

      const { subdomain_id, domain_id, level, answers } = req.body;

      const summary = await OnboardingService.submitPlacementTest({
        studentId:   req.user.id,
        subdomainId: subdomain_id,
        domainId:    domain_id,
        level,
        answers,
      });

      return res.status(200).json({
        success: true,
        message: `Placement test completed. Assigned level: ${summary.assignedLevel}.`,
        ...summary,
      });

    } catch (err) {
      console.error('[OnboardingController.submitTest]', err);
      return sendError(res, err.statusCode || 500, [err.message]);
    }
  },

  /**
   * POST /api/onboarding/skip
   *
   * Accepts { domain_id, subdomain_id, level? } and writes a placement_result
   * row so the student is marked as onboarded.  The `level` field from the
   * request body is forwarded to the service so the student's self-assessed
   * level is stored correctly (previously it was always hardcoded to 'beginner').
   */
  async skipTest(req, res) {
    try {
      const errors = OnboardingValidator.validateSkip(req.body);
      if (errors.length) return sendError(res, 400, errors);

      const { subdomain_id, domain_id, level } = req.body;

      const result = await OnboardingService.skipToLevel({
        studentId:   req.user.id,
        subdomainId: subdomain_id,
        domainId:    domain_id,
        level,                    // ← pass it through; service defaults to 'beginner' if absent
      });

      return res.status(200).json({
        success: true,
        message: `Onboarding complete. Starting at ${result.assignedLevel} level.`,
        ...result,
      });

    } catch (err) {
      console.error('[OnboardingController.skipTest]', err);
      return sendError(res, err.statusCode || 500, [err.message]);
    }
  },
};

module.exports = OnboardingController;