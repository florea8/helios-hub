const db = require('../config/db');
const { getIO } = require('../socket');
const notificationsController = require('./notifications');
const { removePost } = require('./posts');

// CREATE ROOM
exports.createRoom = async (req, res) => {
  const { postId, name } = req.body;
  const userId = req.user.id;

  if (!postId || !name) {
    return res.status(400).json({ message: 'Post ID and name required' });
  }

  try {
    // Check if post exists
    const stmtPost = db.prepare('SELECT * FROM posts WHERE id = ?');
    const post = stmtPost.get(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create room
    const stmt = db.prepare('INSERT INTO rooms (post_id, name, created_by) VALUES (?, ?, ?)');
    const result = stmt.run(postId, name, userId);
    
    // Auto-join creator as admin
    const joinStmt = db.prepare('INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)');
    joinStmt.run(result.lastInsertRowid, userId, 'admin');

    res.status(201).json({ 
      message: 'Room created', 
      roomId: result.lastInsertRowid,
      room: {
        id: result.lastInsertRowid,
        post_id: postId,
        name,
        created_by: userId,
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// GET ALL ROOMS
exports.getAllRooms = async (req, res) => {
  const member = parseInt(req.query.member) || null;

  try {
    const stmt = db.prepare(`
      SELECT 
        r.*,
        COALESCE(p.title, '') as post_title,
        COALESCE(p.description, '') as post_description,
        u.username as creator_username,
        u.profile_picture as creator_profile_picture,
        mu.username as music_added_by_username,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      LEFT JOIN posts p ON r.post_id = p.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN users mu ON r.music_added_by = mu.id
      ${member ? 'WHERE r.id IN (SELECT room_id FROM room_members WHERE user_id = ?)' : ''}
      ORDER BY r.created_at DESC
    `);
    const rows = member ? stmt.all(member) : stmt.all();

    res.json(rows);
  } catch (err) {
    console.error('Error in getAllRooms:', err);
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

// GET ROOM BY ID
exports.getRoomById = async (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT 
        r.*,
        p.title as post_title,
        p.description as post_description,
        u.username as creator_username,
        u.profile_picture as creator_profile_picture,
        mu.username as music_added_by_username,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      JOIN posts p ON r.post_id = p.id
      JOIN users u ON r.created_by = u.id
      LEFT JOIN users mu ON r.music_added_by = mu.id
      WHERE r.id = ?
    `);
    const room = stmt.get(id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// JOIN ROOM
exports.joinRoom = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if room exists
    const roomStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const room = roomStmt.get(id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if already member
    const memberStmt = db.prepare('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?');
    const existingMember = memberStmt.get(id, userId);

    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this room' });
    }

    // Join room
    const stmt = db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)');
    stmt.run(id, userId);

    // Get user info
    const userStmt = db.prepare('SELECT username FROM users WHERE id = ?');
    const userInfo = userStmt.get(userId);

    // Notify room creator about new member
    if (room.created_by !== userId) {
      const notifId = notificationsController.createNotification(
        room.created_by,
        'ROOM_INVITE',
        'New Room Member',
        `${userInfo?.username || 'Someone'} joined room "${room.name}"`,
        `/rooms?roomId=${id}`,
        userId,
        id
      );

      // Send real-time notification
      if (notifId) {
        try {
          const io = getIO();
          io.to(`user-${room.created_by}`).emit('new_notification', {
            id: notifId,
            type: 'ROOM_INVITE',
            title: 'New Room Member',
            message: `${userInfo?.username || 'Someone'} joined room "${room.name}"`,
            link: `/rooms?roomId=${id}`,
            related_username: userInfo?.username,
            created_at: new Date().toISOString()
          });
        } catch (err) {
          console.error('Error sending socket notification:', err);
        }
      }
    }

    res.json({ message: 'Joined room successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// LEAVE ROOM
exports.leaveRoom = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if member
    const memberStmt = db.prepare('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?');
    const member = memberStmt.get(id, userId);

    if (!member) {
      return res.status(400).json({ message: 'Not a member of this room' });
    }

    // A room always keeps an owner.
    const room = db.prepare('SELECT created_by FROM rooms WHERE id = ?').get(id);
    if (room.created_by === userId) {
      return res.status(400).json({ message: 'Make someone else the owner, or delete the room, before you leave.' });
    }

    // Leave room
    const stmt = db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?');
    stmt.run(id, userId);
    getIO().in(`user-${userId}`).socketsLeave([`room_${id}`, `voice_${id}`]);

    res.json({ message: 'Left room successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// GET ROOM MEMBERS
exports.getRoomMembers = async (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.profile_picture,
        rm.joined_at,
        rm.role
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
      ORDER BY 
        CASE rm.role 
          WHEN 'admin' THEN 1 
          WHEN 'moderator' THEN 2 
          ELSE 3 
        END,
        rm.joined_at ASC
    `);
    const members = stmt.all(id);

    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// CHECK IF USER IS MEMBER
exports.checkMembership = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const stmt = db.prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?');
    const member = stmt.get(id, userId);

    res.json({ 
      isMember: !!member,
      role: member ? member.role : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// DELETE ROOM (only creator or PRO)
exports.deleteRoom = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const roomStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const room = roomStmt.get(id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.created_by !== userId) {
      return res.status(403).json({ message: 'Only the owner can delete the room.' });
    }

    // The room lives on its post, so deleting the post deletes the room and leaves nothing behind in the feed.
    removePost(db.prepare('SELECT id, image FROM posts WHERE id = ?').get(room.post_id));

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// UPDATE ROOM MUSIC (only members)
exports.updateMusic = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { url, title } = req.body;

  try {
    const roomStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const room = roomStmt.get(id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const memberStmt = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?');
    const member = memberStmt.get(id, userId);
    if (!member) {
      return res.status(403).json({ message: 'You must be a member to update room music' });
    }

    const updateStmt = db.prepare(`
      UPDATE rooms
      SET music_url = ?,
          music_title = ?,
          music_added_by = ?,
          music_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(url || null, title || null, url ? userId : null, id);

    const selectStmt = db.prepare(`
      SELECT 
        r.*,
        COALESCE(p.title, '') as post_title,
        COALESCE(p.description, '') as post_description,
        u.username as creator_username,
        u.profile_picture as creator_profile_picture,
        mu.username as music_added_by_username,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      LEFT JOIN posts p ON r.post_id = p.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN users mu ON r.music_added_by = mu.id
      WHERE r.id = ?
    `);

    const updatedRoom = selectStmt.get(id);

    try {
      const io = getIO();
      io.to(`room_${id}`).emit('room-music-update', {
        roomId: Number(id),
        music_url: updatedRoom.music_url,
        music_title: updatedRoom.music_title,
        music_added_by: updatedRoom.music_added_by,
        music_added_by_username: updatedRoom.music_added_by_username,
        music_updated_at: updatedRoom.music_updated_at
      });
    } catch (socketErr) {
      console.error('Error emitting room-music-update:', socketErr.message);
    }

    res.json({ message: 'Room music updated', room: updatedRoom });
  } catch (err) {
    console.error('Error updating room music:', err);
    res.status(500).json({ message: 'DB error' });
  }
};

// UPDATE ROOM SETTINGS (description, rules)
exports.updateRoomSettings = async (req, res) => {
  const { id } = req.params;
  const { description, rules } = req.body;
  const userId = req.user.id;

  try {
    // Check if user is admin
    const memberStmt = db.prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?');
    const member = memberStmt.get(id, userId);
    
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update room settings' });
    }

    // Update room
    const updateStmt = db.prepare('UPDATE rooms SET description = ?, rules = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updateStmt.run(description, rules, id);

    // Get updated room
    const roomStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const updatedRoom = roomStmt.get(id);

    // Broadcast update
    try {
      const io = getIO();
      io.to(`room_${id}`).emit('room-settings-update', {
        roomId: Number(id),
        description,
        rules
      });
    } catch (socketErr) {
      console.error('Error emitting room-settings-update:', socketErr.message);
    }

    res.json({ message: 'Room settings updated', room: updatedRoom });
  } catch (err) {
    console.error('Error updating room settings:', err);
    res.status(500).json({ message: 'DB error' });
  }
};

// UPDATE MEMBER ROLE
exports.updateMemberRole = async (req, res) => {
  const { id, memberId } = req.params;
  const { role } = req.body;
  const userId = req.user.id;

  if (!['admin', 'moderator', 'member'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    // Check if user is admin
    const adminStmt = db.prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?');
    const admin = adminStmt.get(id, userId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can change roles' });
    }

    // Don't allow changing creator's role
    const roomStmt = db.prepare('SELECT created_by FROM rooms WHERE id = ?');
    const room = roomStmt.get(id);
    
    if (room.created_by === parseInt(memberId)) {
      return res.status(403).json({ message: 'Cannot change room creator role' });
    }

    // Update role
    const updateStmt = db.prepare('UPDATE room_members SET role = ? WHERE room_id = ? AND user_id = ?');
    updateStmt.run(role, id, memberId);

    // Get updated member info
    const memberStmt = db.prepare(`
      SELECT rm.*, u.username, u.profile_picture 
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ? AND rm.user_id = ?
    `);
    const updatedMember = memberStmt.get(id, memberId);

    res.json({ message: 'Member role updated', member: updatedMember });
  } catch (err) {
    console.error('Error updating member role:', err);
    res.status(500).json({ message: 'DB error' });
  }
};

// REMOVE MEMBER FROM ROOM
exports.removeMember = async (req, res) => {
  const { id, memberId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is admin or moderator
    const userRoleStmt = db.prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?');
    const userRole = userRoleStmt.get(id, userId);
    
    if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'moderator')) {
      return res.status(403).json({ message: 'Only admins and moderators can remove members' });
    }

    // Get target member's role
    const targetRoleStmt = db.prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?');
    const targetRole = targetRoleStmt.get(id, memberId);

    if (!targetRole) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Moderators cannot remove admins or other moderators
    if (userRole.role === 'moderator' && (targetRole.role === 'admin' || targetRole.role === 'moderator')) {
      return res.status(403).json({ message: 'Moderators cannot remove admins or other moderators' });
    }

    // Cannot remove room creator
    const roomStmt = db.prepare('SELECT created_by FROM rooms WHERE id = ?');
    const room = roomStmt.get(id);
    
    if (room.created_by === parseInt(memberId)) {
      return res.status(403).json({ message: 'Cannot remove room creator' });
    }

    // Remove member
    const deleteStmt = db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?');
    deleteStmt.run(id, memberId);

    // Their open pages stop getting the room's messages and voice, and are told why.
    try {
      const io = getIO();
      io.in(`user-${memberId}`).socketsLeave([`room_${id}`, `voice_${id}`]);
      io.to(`user-${memberId}`).emit('removed-from-room', {
        roomId: Number(id)
      });
    } catch (socketErr) {
      console.error('Error emitting removed-from-room:', socketErr.message);
    }

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ message: 'DB error' });
  }
};

// TRANSFER ROOM OWNERSHIP
exports.transferOwnership = async (req, res) => {
  const { id } = req.params;
  const { newOwnerId } = req.body;
  const userId = req.user.id;

  try {
    // Check if user is the creator
    const roomStmt = db.prepare('SELECT created_by FROM rooms WHERE id = ?');
    const room = roomStmt.get(id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.created_by !== userId) {
      return res.status(403).json({ message: 'Only room creator can transfer ownership' });
    }

    // Check if new owner is a member
    const memberStmt = db.prepare('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?');
    const newOwner = memberStmt.get(id, newOwnerId);
    
    if (!newOwner) {
      return res.status(400).json({ message: 'New owner must be a room member' });
    }

    // Update room creator
    const updateRoomStmt = db.prepare('UPDATE rooms SET created_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updateRoomStmt.run(newOwnerId, id);

    // Update roles: old owner becomes moderator, new owner becomes admin
    const updateOldOwner = db.prepare('UPDATE room_members SET role = ? WHERE room_id = ? AND user_id = ?');
    updateOldOwner.run('moderator', id, userId);

    const updateNewOwner = db.prepare('UPDATE room_members SET role = ? WHERE room_id = ? AND user_id = ?');
    updateNewOwner.run('admin', id, newOwnerId);

    res.json({ message: 'Ownership transferred successfully' });
  } catch (err) {
    console.error('Error transferring ownership:', err);
    res.status(500).json({ message: 'DB error' });
  }
};