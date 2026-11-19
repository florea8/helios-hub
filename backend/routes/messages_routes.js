const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages');
const { authenticate } = require('../middleware/mid');
const { messageLimiter } = require('../middleware/rateLimiter');
const { validateId } = require('../middleware/validation');
const { requireRoomMember } = require('../middleware/roomAccess');

// Membership is checked before the upload, so outsiders cannot store files.
router.post('/:roomId', authenticate, messageLimiter, validateId('roomId'), requireRoomMember(), messagesController.uploadMiddleware, messagesController.sendMessage);
router.get('/room/:roomId', authenticate, validateId('roomId'), requireRoomMember(), messagesController.getMessagesForRoom);
router.get('/download/:filename', messagesController.downloadFile);

module.exports = router;