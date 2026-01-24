const db = require('../config/db');
const { getIO } = require('../socket');

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
    
    // Auto-join creator
    const joinStmt = db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)');
    joinStmt.run(result.lastInsertRowid, userId);

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
      ORDER BY r.created_at DESC
    `);
    const rows = stmt.all();

    res.json(rows);
  } catch (err) {
    console.error('Error in getAllRooms:', err);
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

// GET ROOMS FOR POST
exports.getRoomsForPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT 
        r.*,
        u.username as creator_username,
        u.profile_picture as creator_profile_picture,
        mu.username as music_added_by_username,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
      FROM rooms r
      JOIN users u ON r.created_by = u.id
      LEFT JOIN users mu ON r.music_added_by = mu.id
      WHERE r.post_id = ?
      ORDER BY r.created_at ASC
    `);
    const rows = stmt.all(postId);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
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

    // Leave room
    const stmt = db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?');
    stmt.run(id, userId);

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
        u.email,
        u.profile_picture,
        rm.joined_at
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
      ORDER BY rm.joined_at ASC
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
    const stmt = db.prepare('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?');
    const member = stmt.get(id, userId);

    res.json({ isMember: !!member });
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

    if (room.created_by !== userId && req.user.role !== 'PRO') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    stmt.run(id);

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