const axios = require('axios');
const db = require('../config/database');

const API_URL = 'https://models.inference.ai.azure.com/chat/completions';

/**
 * Collect a student’s personal learning profile from the database
 */
async function getStudentProfile(studentId) {
  const [[gamif]]         = await db.query(
    'SELECT total_xp, current_level FROM gamification_stats WHERE student_id = ?', [studentId]);
  const [[badgeCount]]    = await db.query(
    'SELECT COUNT(*) as count FROM student_badges WHERE student_id = ?', [studentId]);
    console.log('👤 Student', studentId, '→ badges:', badgeCount?.count);
  const [[skillCount]]    = await db.query(
    'SELECT COUNT(*) as count FROM student_skills WHERE student_id = ?', [studentId]);
  const [enrollments]     = await db.query(
    `SELECT c.title, c.difficulty_level, e.progress_percentage
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     WHERE e.student_id = ?`, [studentId]);
  const [skillProgress]   = await db.query(
    `SELECT s.name, usp.highest_course_level, usp.total_xp
     FROM user_skill_progress usp
     JOIN skills s ON usp.skill_id = s.id
     WHERE usp.student_id = ?`, [studentId]);

  const inProgress = enrollments
    .filter(e => e.progress_percentage < 100)
    .map(e => `${e.title} (${e.progress_percentage}%, ${e.difficulty_level})`);
  const completed = enrollments
    .filter(e => e.progress_percentage >= 100)
    .map(e => e.title);

  const skillLevels = skillProgress.map(
    s => `${s.name}: ${s.highest_course_level} (${s.total_xp} XP)`
  );

  return {
    xp: gamif?.total_xp || 0,
    level: gamif?.current_level || 1,
    badgesEarned: badgeCount?.count || 0,
    skillsUnlocked: skillCount?.count || 0,
    inProgressCourses: inProgress,
    completedCourses: completed,
    skillLevels: skillLevels,
  };
}

/**
 * Build a dynamic system prompt with the student’s real data
 */
function buildSystemPrompt(profile) {
  return `You are a helpful AI tutor for **Dzire**, an e-learning platform focused on web development and programming.

The student who is talking to you has the following personal stats:
- Level: ${profile.level}
- Total XP: ${profile.xp}
- Badges Earned: ${profile.badgesEarned}
- Skills Unlocked: ${profile.skillsUnlocked}
- In‑Progress Courses: ${profile.inProgressCourses.join(', ') || 'None'}
- Completed Courses: ${profile.completedCourses.join(', ') || 'None'}
- Skill Levels: ${profile.skillLevels.join(', ') || 'None'}

**Platform Features:**
- Courses with lessons (video, PDF, text), chapters, and assessments (quizzes & final exams)
- Onboarding placement test to determine student level (beginner, intermediate, advanced)
- Enroll in courses from the Explore Catalog page; enrolled courses appear in My Courses
- Skill Tree showing progress in technologies like HTML, CSS, JavaScript, Node.js, and more
- Badges earned by completing courses, passing quizzes, and hitting milestones (view on Badges page)
- XP and Levels — earn XP from lessons and assessments; level determines rank title
- Leaderboard ranking students by total XP
- Notifications via bell icon when earning badges, unlocking skills, or completing courses
- Profile page to change avatar, bio, specialization, and password
- Assessments page shows all quiz scores and pass/fail status

**Navigation:**
- Sidebar links: Dashboard, My Learning Path, Explore Catalog, My Courses, Quests, Skill Tree, Assessments, Leaderboard, Badges, My Profile, Settings

**Rules:**
- Answer questions about the platform, courses, quizzes, badges, skills, progress, etc.
- Use the student's personal stats above to give accurate, personalised answers.
- If the student asks what to study next, analyse their progress and suggest the next logical course inside Dzire or a high-quality free external resource (like FreeCodeCamp, MDN Web Docs, or official documentation).
- Keep answers friendly, encouraging, and under 150 words.
- If you don't know, tell them to check the platform or ask their instructor.
- Always respond in English.`;
}

/**
 * Ask the AI model, using the student’s real profile for context
 */
async function askAI(studentId, message) {
  const profile = await getStudentProfile(studentId);
  const systemPrompt = buildSystemPrompt(profile);

  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GITHUB_MODELS_TOKEN}`,
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI service error:', error.response?.data || error.message);
    return "I'm having trouble thinking right now. Please try again later or ask your instructor.";
  }
}

module.exports = { askAI };