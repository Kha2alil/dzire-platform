const db = require('../config/database');

const OnboardingRepository = {

  async getPlacementResult(studentId) {
    const [rows] = await db.execute(
      `SELECT pr.*, d.name AS domain_name, s.name AS subdomain_name
       FROM   placement_results pr
       JOIN   domains    d ON d.id = pr.domain_id
       JOIN   subdomains s ON s.id = pr.subdomain_id
       WHERE  pr.student_id = ?
       LIMIT  1`,
      [studentId]
    );
    return rows[0] || null;
  },

  async getAllDomains() {
    const [rows] = await db.execute(
      'SELECT id, name FROM domains ORDER BY name ASC'
    );
    return rows;
  },

  async getSubdomainsByDomain(domainId) {
    if (!domainId) {
      // No filter — return every subdomain (used by teacher dropdown)
      const [rows] = await db.execute(
        'SELECT id, name, domain_id FROM subdomains ORDER BY name ASC'
      );
      return rows;
    }
    const [rows] = await db.execute(
      'SELECT id, name, domain_id FROM subdomains WHERE domain_id = ? ORDER BY name ASC',
      [domainId]
    );
    return rows;
  },

  async getSubdomain(subdomainId, domainId) {
    const [rows] = await db.execute(
      'SELECT id, name, domain_id FROM subdomains WHERE id = ? AND domain_id = ? LIMIT 1',
      [subdomainId, domainId]
    );
    return rows[0] || null;
  },

  async getQuestions(subdomainId, level, limit = 10) {
    let query = '';
    let params = [];
    if (level) {
        query = `SELECT id, question_text, options, points
                 FROM placement_questions
                 WHERE subdomain_id = ? AND level = ?
                 ORDER BY RAND()
                 LIMIT ${parseInt(limit)}`;
        params = [subdomainId, level];
    } else {
        query = `SELECT id, question_text, options, points
                 FROM placement_questions
                 WHERE subdomain_id = ?
                 ORDER BY RAND()
                 LIMIT ${parseInt(limit)}`;
        params = [subdomainId];
    }
    const [rows] = await db.execute(query, params);
    return rows;
  },

    async savePlacementResult({ studentId, subdomainId, domainId, level, score }) {
    const [result] = await db.execute(
      `INSERT INTO placement_results
         (id, student_id, subdomain_id, domain_id, level, score)
       VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [studentId, subdomainId, domainId, level, score]
    );
    return result;
  },

  async getQuestionsWithAnswers(subdomainId, level) {
    const [rows] = await db.execute(
      `SELECT id, question_text, options, correct_answer, points
       FROM   placement_questions
       WHERE  subdomain_id = ? AND level = ?`,
      [subdomainId, level]
    );
    return rows;
  },

};

module.exports = OnboardingRepository;