const faqService = require('../services/faqService');

/**
 * POST /api/chat/faq
 * Handles the FAQ chatbot query
 */
const askFAQ = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, response: 'Please type a question.' });
    }

    const studentId = req.user.id;   // ← from auth middleware
    const answer = await faqService.getAnswer(message, studentId);   // ← pass both

    res.status(200).json({ success: true, response: answer });
  } catch (error) {
    next(error);
  }
};

module.exports = { askFAQ };