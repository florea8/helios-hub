const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friends');
const { authenticate } = require('../middleware/mid');

// All routes require authentication
router.use(authenticate);

// Search users
router.get('/search', friendsController.searchUsers);

// People with shared interests
router.get('/suggestions', friendsController.getSuggestions);

// Get friends list
router.get('/list', friendsController.getFriendsList);

// Get pending requests (received)
router.get('/requests/pending', friendsController.getPendingRequests);

// Send friend request
router.post('/request', friendsController.sendFriendRequest);

// Accept friend request
router.post('/accept/:requestId', friendsController.acceptFriendRequest);

// Reject friend request
router.delete('/reject/:requestId', friendsController.rejectFriendRequest);

// Remove friend
router.delete('/:friendId', friendsController.removeFriend);

module.exports = router;
