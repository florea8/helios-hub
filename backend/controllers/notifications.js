const db = require('../config/db');

// Helper function to create notification
exports.createNotification = (userId, type, title, message, link = null, relatedUserId = null, relatedId = null) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link, related_user_id, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, type, title, message, link, relatedUserId, relatedId);
    return result.lastInsertRowid;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};

// Get all notifications for a user
exports.getNotifications = (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    let query = `
      SELECT 
        n.*,
        u.username as related_username,
        u.profile_picture as related_user_picture
      FROM notifications n
      LEFT JOIN users u ON n.related_user_id = u.id
      WHERE n.user_id = ?
    `;

    if (unreadOnly) {
      query += ' AND n.read = 0';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ?';

    const stmt = db.prepare(query);
    const notifications = stmt.all(userId, limit);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get unread notification count
exports.getUnreadCount = (req, res) => {
  try {
    const userId = req.user.id;
    const stmt = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0');
    const result = stmt.get(userId);
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark notification as read
exports.markAsRead = (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?');
    stmt.run(notificationId, userId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = (req, res) => {
  try {
    const userId = req.user.id;

    const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0');
    const result = stmt.run(userId);

    res.json({ success: true, updated: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a notification
exports.deleteNotification = (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const stmt = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
    stmt.run(notificationId, userId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete all read notifications
exports.deleteAllRead = (req, res) => {
  try {
    const userId = req.user.id;

    const stmt = db.prepare('DELETE FROM notifications WHERE user_id = ? AND read = 1');
    const result = stmt.run(userId);

    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper: Send notification via Socket.io
exports.sendSocketNotification = (io, userId, notification) => {
  if (!io) return;
  
  // Emit to specific user
  io.to(`user-${userId}`).emit('new_notification', notification);
};
