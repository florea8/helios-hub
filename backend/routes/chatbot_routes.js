const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot');
const { authenticate } = require('../middleware/mid');

router.post('/:roomId', authenticate, chatbotController.handleChatbotMessage);

module.exports = router;
