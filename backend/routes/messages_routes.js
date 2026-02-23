const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages');
const { authenticate } = require('../middleware/mid');
const { messageLimiter } = require('../middleware/rateLimiter');
const { validateId } = require('../middleware/validation');

router.post('/:roomId', authenticate, messageLimiter, validateId('roomId'), messagesController.uploadMiddleware, messagesController.sendMessage);
router.get('/room/:roomId', validateId('roomId'), messagesController.getMessagesForRoom);
router.get('/download/:filename', messagesController.downloadFile);

module.exports = router;