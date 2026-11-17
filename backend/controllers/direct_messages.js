const db = require('../config/db');

// helper to confirm friendship exists and is accepted
function isFriendshipAccepted(userId, friendId) {
  return db
    .prepare(
      `SELECT 1 FROM friends 
       WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
         AND status = 'ACCEPTED'`
    )
    .get(userId, friendId, friendId, userId);
}

// POST /api/direct-messages/send
exports.sendDirectMessage = (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user.id;

  if (!receiverId || !content || !String(content).trim()) {
    return res.status(400).json({ error: 'Receiver ID and content required' });
  }

  if (senderId === Number(receiverId)) {
    return res.status(400).json({ error: 'Cannot send message to yourself' });
  }

  const friendship = isFriendshipAccepted(senderId, receiverId);
  if (!friendship) {
    return res.status(403).json({ error: 'You can only message accepted friends' });
  }

  try {
    const stmt = db.prepare(
      'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
    );
    const result = stmt.run(senderId, receiverId, String(content).trim());

    const row = db
      .prepare('SELECT * FROM direct_messages WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(row);
  } catch (error) {
    console.error('sendDirectMessage error:', error);
    res.status(500).json({ error: 'DB error' });
  }
};

// GET /api/direct-messages/unread: how many unread messages each friend has sent you
exports.getUnreadCounts = (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT sender_id, COUNT(*) AS count FROM direct_messages
         WHERE receiver_id = ? AND read_at IS NULL
         GROUP BY sender_id`
      )
      .all(req.user.id);
    res.json(Object.fromEntries(rows.map((row) => [row.sender_id, row.count])));
  } catch (error) {
    console.error('getUnreadCounts error:', error);
    res.status(500).json({ error: 'DB error' });
  }
};

// POST /api/direct-messages/:friendId/read: marks everything that friend sent you as read
exports.markRead = (req, res) => {
  try {
    db.prepare(
      "UPDATE direct_messages SET read_at = datetime('now') WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL"
    ).run(Number(req.params.friendId), req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('markRead error:', error);
    res.status(500).json({ error: 'DB error' });
  }
};

// GET /api/direct-messages/:friendId
exports.getConversation = (req, res) => {
  const friendId = Number(req.params.friendId);
  const userId = req.user.id;

  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID required' });
  }

  const friendship = isFriendshipAccepted(userId, friendId);
  if (!friendship) {
    return res.status(403).json({ error: 'You can only load messages with accepted friends' });
  }

  try {
    const rows = db
      .prepare(
        `SELECT * FROM direct_messages 
         WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?) 
         ORDER BY created_at ASC`
      )
      .all(userId, friendId, friendId, userId);

    res.json(rows);
  } catch (error) {
    console.error('getConversation error:', error);
    res.status(500).json({ error: 'DB error' });
  }
};
