const db = require('../config/database');
const aiService = require('./aiService');
const progressAggregator = require('./progressAggregator');
const notificationService = require('./notificationService');

const submitQuest = async (studentId, questId, code, language) => {
  // 1. Fetch the quest
  const [questRows] = await db.query(
    'SELECT * FROM assessments WHERE id = ? AND type = ?',
    [questId, 'quest']
  );
  const quest = questRows[0];
  if (!quest) {
    const err = new Error('Quest not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. AI grading (with fallback for reliability)
  let aiScore = 0;
  let aiFeedback = '';
  try {
    const prompt = `You are a strict but fair code evaluator for a learning platform.
Task description: "${quest.description}".
Student's code:
\`\`\`${language}
${code}
\`\`\`
Return ONLY a JSON object (no other text) with:
- "score": a number between 0 and 100
- "feedback": a short, encouraging message (max 150 words)`;

    const aiResponse = await aiService.askAI(studentId, prompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      aiScore = typeof parsed.score === 'number' ? parsed.score : 0;
      aiFeedback = parsed.feedback || 'Good effort!';
    } else {
      // AI didn't return JSON — give a default score
      aiScore = 70;
      aiFeedback = 'Good effort! Your solution has been submitted.';
    }
  } catch (e) {
    console.error('AI grading failed, using fallback:', e.message);
    aiScore = 70;
    aiFeedback = 'Your solution has been submitted. Our AI is currently unavailable for detailed feedback, but keep practicing!';
  }

  const passed = aiScore >= (quest.passing_score || 60);

  // 3. Check if already passed (first pass only gets XP)
  const [existing] = await db.query(
    'SELECT id FROM student_assessments WHERE student_id = ? AND assessment_id = ? AND passed = TRUE',
    [studentId, questId]
  );
  const alreadyPassed = existing.length > 0;

  // 4. Save attempt
  await db.query(
    'INSERT INTO student_assessments (student_id, assessment_id, score, passed) VALUES (?, ?, ?, ?)',
    [studentId, questId, aiScore, passed]
  );

  let xpGained = 0;
  if (passed && !alreadyPassed && quest.xp_reward > 0) {
    xpGained = quest.xp_reward;

    // Award XP through gamification_stats
    try {
      const [placement] = await db.query(
        'SELECT subdomain_id FROM placement_results WHERE student_id = ? LIMIT 1',
        [studentId]
      );

      if (placement.length > 0) {
        const subdomainId = placement[0].subdomain_id;

        await db.query(
          `INSERT INTO gamification_stats (student_id, subdomain_id, total_xp, accumulated_xp)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             total_xp = total_xp + VALUES(total_xp),
             accumulated_xp = accumulated_xp + VALUES(accumulated_xp),
             updated_at = NOW()`,
          [studentId, subdomainId, xpGained, xpGained]
        );
      } else {
        await db.query(
          `UPDATE gamification_stats
           SET total_xp = total_xp + ?,
               accumulated_xp = accumulated_xp + ?,
               updated_at = NOW()
           WHERE student_id = ?`,
          [xpGained, xpGained, studentId]
        );
      }
    } catch (e) {
      console.error('Failed to award XP:', e.message);
    }

    // Trigger badge evaluation
    progressAggregator.handleQuizPassed(studentId, questId, aiScore, passed).catch(() => {});

    // Notify the student
    notificationService.sendNotification(
      studentId,
      'achievement',
      '⚔️ Quest Completed!',
      `You completed "${quest.title}" and earned +${xpGained} XP!`,
      '/student-quests.html'
    ).catch(() => {});
  }

  return {
    score: aiScore,
    passed,
    xp_gained: xpGained,
    ai_feedback: aiFeedback
  };
};

module.exports = { submitQuest };