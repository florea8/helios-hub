const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages');
const { authenticate } = require('../middleware/mid');

router.post('/:roomId', authenticate, messagesController.uploadMiddleware, messagesController.sendMessage);
router.get('/room/:roomId', messagesController.getMessagesForRoom);
router.get('/download/:filename', messagesController.downloadFile);

module.exports = router;