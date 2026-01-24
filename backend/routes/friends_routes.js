const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friends');
const { authenticateToken } = require('../middleware/mid');

// All routes require authentication
router.use(authenticateToken);

// Search users
router.get('/search', friendsController.searchUsers);

// Get friends list
router.get('/list', friendsController.getFriendsList);

// Get pending requests (received)
router.get('/requests/pending', friendsController.getPendingRequests);

// Get sent requests
router.get('/requests/sent', friendsController.getSentRequests);

// Send friend request
router.post('/request', friendsController.sendFriendRequest);

// Accept friend request
router.post('/accept/:requestId', friendsController.acceptFriendRequest);

// Reject friend request
router.delete('/reject/:requestId', friendsController.rejectFriendRequest);

// Remove friend
router.delete('/:friendId', friendsController.removeFriend);

module.exports = router;
