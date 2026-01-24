const db = require('../config/db');
const { getIO, getOnlineUsers } = require('../socket');

// Send friend request
exports.sendFriendRequest = (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;

  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID required' });
  }

  if (userId === friendId) {
    return res.status(400).json({ error: 'Cannot send friend request to yourself' });
  }

  try {
    // Check if friend exists
    const friendExists = db.prepare('SELECT id FROM users WHERE id = ?').get(friendId);
    if (!friendExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const existing = db.prepare(`
      SELECT * FROM friends 
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(userId, friendId, friendId, userId);

    if (existing) {
      if (existing.status === 'PENDING') {
        return res.status(400).json({ error: 'Friend request already pending' });
      } else if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'Already friends' });
      } else if (existing.status === 'BLOCKED') {
        return res.status(400).json({ error: 'Cannot send friend request' });
      }
    }

    // Create friend request
    const stmt = db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)');
    const result = stmt.run(userId, friendId, 'PENDING');

    // Notify recipient via socket if online
    try {
      const io = getIO();
      const onlineUsers = getOnlineUsers();
      const recipientSocketId = onlineUsers.get(friendId);
      
      if (recipientSocketId) {
        const sender = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        io.to(recipientSocketId).emit('friend_request_received', {
          userId: userId,
          username: sender?.username,
          requestId: result.lastInsertRowid
        });
      }
    } catch (err) {
      console.error('Error emitting friend request event:', err);
    }

    res.json({ 
      message: 'Friend request sent',
      requestId: result.lastInsertRowid
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Accept friend request
exports.acceptFriendRequest = (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.id;

  try {
    // Check if request exists and is for current user
    const request = db.prepare('SELECT * FROM friends WHERE id = ? AND friend_id = ? AND status = ?')
      .get(requestId, userId, 'PENDING');

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update status to ACCEPTED
    db.prepare('UPDATE friends SET status = ? WHERE id = ?').run('ACCEPTED', requestId);

    // Notify sender via socket if online
    try {
      const io = getIO();
      const onlineUsers = getOnlineUsers();
      const senderSocketId = onlineUsers.get(request.user_id);
      
      if (senderSocketId) {
        const accepter = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        io.to(senderSocketId).emit('friend_request_accepted', {
          userId: userId,
          username: accepter?.username
        });
      }
    } catch (err) {
      console.error('Error emitting friend accepted event:', err);
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reject friend request
exports.rejectFriendRequest = (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.id;

  try {
    const request = db.prepare('SELECT * FROM friends WHERE id = ? AND friend_id = ? AND status = ?')
      .get(requestId, userId, 'PENDING');

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Delete the request
    db.prepare('DELETE FROM friends WHERE id = ?').run(requestId);

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove friend
exports.removeFriend = (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;

  try {
    const result = db.prepare(`
      DELETE FROM friends 
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = ?
    `).run(userId, friendId, friendId, userId, 'ACCEPTED');

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get friends list
exports.getFriendsList = (req, res) => {
  const userId = req.user.id;

  try {
    console.log(`Getting friends list for user ${userId}`);
    
    // First, get all friends where current user is user_id
    const friends1 = db.prepare(`
      SELECT 
        f.friend_id as id,
        u.username,
        u.email,
        u.profile_picture,
        u.last_seen,
        f.created_at as friends_since
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'ACCEPTED'
    `).all(userId);
    
    // Then, get all friends where current user is friend_id
    const friends2 = db.prepare(`
      SELECT 
        f.user_id as id,
        u.username,
        u.email,
        u.profile_picture,
        u.last_seen,
        f.created_at as friends_since
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'ACCEPTED'
    `).all(userId);
    
    // Combine both results and filter out current user (in case of invalid data)
    const allFriends = [...friends1, ...friends2]
      .filter(friend => friend.id !== userId)
      .sort((a, b) => 
        new Date(b.last_seen || 0) - new Date(a.last_seen || 0)
      );
    
    console.log(`Found ${allFriends.length} friends`);
    res.json(allFriends);
  } catch (error) {
    console.error('getFriendsList error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Get pending friend requests (received)
exports.getPendingRequests = (req, res) => {
  const userId = req.user.id;

  try {
    const requests = db.prepare(`
      SELECT 
        f.id as request_id,
        u.id as user_id,
        u.username,
        u.email,
        u.profile_picture,
        f.created_at
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = ?
      ORDER BY f.created_at DESC
    `).all(userId, 'PENDING');

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get sent friend requests
exports.getSentRequests = (req, res) => {
  const userId = req.user.id;

  try {
    const requests = db.prepare(`
      SELECT 
        f.id as request_id,
        u.id as user_id,
        u.username,
        u.email,
        u.profile_picture,
        f.created_at
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = ?
      ORDER BY f.created_at DESC
    `).all(userId, 'PENDING');

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search users (to add as friends)
exports.searchUsers = (req, res) => {
  const { query } = req.query;
  const userId = req.user.id;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    console.log(`Searching for users: '${query}' by user ${userId}`);
    
    // Get all users matching the search query
    const users = db.prepare(`
      SELECT id, username, email, profile_picture, last_seen
      FROM users
      WHERE id != ? 
      AND (username LIKE ? OR email LIKE ?)
      ORDER BY username
      LIMIT 20
    `).all(userId, `%${query}%`, `%${query}%`);

    console.log(`Found ${users.length} users`);

    // For each user, determine friendship status
    const usersWithStatus = users.map(user => {
      // Check if there's any friendship connection
      const friendship = db.prepare(`
        SELECT status, user_id, friend_id FROM friends
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).get(userId, user.id, user.id, userId);

      let friendship_status = 'none';
      if (friendship) {
        if (friendship.status === 'ACCEPTED') {
          friendship_status = 'friend';
        } else if (friendship.status === 'PENDING') {
          friendship_status = friendship.user_id === userId ? 'request_sent' : 'request_received';
        }
      }

      return {
        ...user,
        friendship_status
      };
    });

    res.json(usersWithStatus);
  } catch (error) {
    console.error('searchUsers error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Update last seen (called on any authenticated request)
exports.updateLastSeen = (req, res, next) => {
  if (req.user) {
    try {
      db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id);
    } catch (error) {
      console.error('Error updating last_seen:', error);
    }
  }
  next();
};
