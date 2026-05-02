const fs = require('fs');
const path = require('path');
const aiService = require('./aiService');

// Load intents once when the server starts
const intentsPath = path.join(__dirname, '..', '..', 'data', 'faq-intents.json');
let intents = [];

try {
  const raw = fs.readFileSync(intentsPath, 'utf8');
  const data = JSON.parse(raw);
  intents = data.intents || [];
} catch (err) {
  console.error('Failed to load FAQ intents:', err.message);
}

/**
 * Find the best response for a user message
 * @param {string} message - The student's message
 * @returns {string} - The bot's response
 */
async function getAnswer(message, studentId) {
  if (!message) return "I didn't quite catch that. Could you rephrase?";

  let msg = message.toLowerCase().trim();

  // ── Normalisation (same as before) ─────────────────────
  const fixes = {
    " m ":       " my ",
    " ur ":      " your ",
    " u ":       " you ",
    " r ":       " are ",
    " dont ":    " don't ",
    " cant ":    " can't ",
    " wont ":    " won't ",
    " im ":      " i'm ",
    " wht ":     " what ",
    " whr ":     " where ",
    " hw ":      " how ",
    " plz ":     " please ",
    " pls ":     " please ",
    " thx ":     " thanks ",
  };

  msg = " " + msg + " ";
  for (const [short, long] of Object.entries(fixes)) {
    msg = msg.split(short).join(long);
  }
  msg = msg.trim();

  // ── Keyword matching ──────────────────────────────────
  // let bestMatch = null;

  // for (const intent of intents) {
  //   const matched = intent.patterns.some(pattern => msg.includes(pattern.toLowerCase()));
  //   if (matched) {
  //     bestMatch = intent.response;
  //     break;
  //   }
  // }

  // // If keyword matched, return immediately (fast & free)
  // if (bestMatch) return bestMatch;

  // No match – fall back to personalised AI
  return await aiService.askAI(studentId, message);
}

module.exports = { getAnswer };