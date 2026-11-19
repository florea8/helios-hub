const db = require('../config/db');
const { getIO } = require('../socket');
const notificationsController = require('../controllers/notifications');

// Sends a saved room message to everyone in the room, and notifies anyone it @mentions.
// The message comes from the database, so its author and text cannot be forged by a client.
const announceRoomMessage = (message) => {
  const io = getIO();
  io.to(`room_${message.room_id}`).emit('room-message', message);

  const names = [...new Set([...(message.content || '').matchAll(/@(\w+)/g)].map((match) => match[1]))];
  if (!names.length) return;

  const room = db.prepare('SELECT name FROM rooms WHERE id = ?').get(message.room_id);
  const link = `/rooms?roomId=${message.room_id}`;
  const text = `${message.username} mentioned you in ${room?.name || 'a room'}`;
  // Only members of the room are notified, so a mention cannot reach strangers.
  const findMember = db.prepare(`
    SELECT u.id FROM users u JOIN room_members rm ON rm.user_id = u.id
    WHERE u.username = ? AND rm.room_id = ?
  `);

  for (const name of names) {
    const mentioned = findMember.get(name, message.room_id);
    if (!mentioned || mentioned.id === message.user_id) continue;
    const notifId = notificationsController.createNotification(
      mentioned.id, 'MENTION', 'You were mentioned', text, link, message.user_id, message.id
    );
    if (notifId) {
      io.to(`user-${mentioned.id}`).emit('new_notification', {
        id: notifId,
        type: 'MENTION',
        title: 'You were mentioned',
        message: text,
        link,
        related_username: message.username,
        created_at: new Date().toISOString(),
      });
    }
  }
};

module.exports = { announceRoomMessage };
