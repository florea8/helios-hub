const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications');
const { authenticate } = require('../middleware/mid');

// Get all notifications for logged in user
router.get('/', authenticate, notificationsController.getNotifications);

// Get unread notification count
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', authenticate, notificationsController.markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', authenticate, notificationsController.markAllAsRead);

// Delete a notification
router.delete('/:notificationId', authenticate, notificationsController.deleteNotification);

// Delete all read notifications
router.delete('/read/all', authenticate, notificationsController.deleteAllRead);

module.exports = router;
