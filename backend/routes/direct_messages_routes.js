const express = require('express');
const router = express.Router();
const directMessagesController = require('../controllers/direct_messages');
const { authenticate } = require('../middleware/mid');

router.post('/send', authenticate, directMessagesController.sendDirectMessage);
router.get('/:friendId', authenticate, directMessagesController.getConversation);

module.exports = router;
