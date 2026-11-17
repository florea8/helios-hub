const express = require('express');
const router = express.Router();
const directMessagesController = require('../controllers/direct_messages');
const { authenticate } = require('../middleware/mid');

router.post('/send', authenticate, directMessagesController.sendDirectMessage);
// /unread comes before /:friendId so it is not read as a friend id.
router.get('/unread', authenticate, directMessagesController.getUnreadCounts);
router.post('/:friendId/read', authenticate, directMessagesController.markRead);
router.get('/:friendId', authenticate, directMessagesController.getConversation);

module.exports = router;
