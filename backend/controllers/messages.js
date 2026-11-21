const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../config/settings');
const { announceRoomMessage } = require('../utils/roomMessages');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(uploadDir, 'room-files'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept all file types but you can add restrictions here
    cb(null, true);
  }
});

exports.uploadMiddleware = upload.single('file');

// SEND MESSAGE
exports.sendMessage = async (req, res) => {
  const { roomId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const file = req.file;

  if (!roomId || (!content && !file)) {
    return res.status(400).json({ message: 'Room ID and content or file required' });
  }
  if (content && content.length > 1000) {
    return res.status(400).json({ message: 'Messages can be at most 1000 characters.' });
  }

  try {
    // Check if room exists
    const stmtRoom = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const room = stmtRoom.get(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    let stmt, result;
    
    if (file) {
      // Insert message with file
      stmt = db.prepare(`
        INSERT INTO messages (room_id, user_id, content, file_name, file_path, file_size, file_type) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      result = stmt.run(
        roomId, 
        userId, 
        content || "",
        file.originalname,
        'uploads/room-files/' + file.filename,
        file.size,
        file.mimetype
      );
    } else {
      // Insert regular message
      stmt = db.prepare('INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)');
      result = stmt.run(roomId, userId, content);
    }

    // Get the complete message with user info
    const msgStmt = db.prepare(`
      SELECT m.*, u.username, u.profile_picture 
      FROM messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.id = ?
    `);
    const message = msgStmt.get(result.lastInsertRowid);

    announceRoomMessage(message);
    res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'DB error' });
  }
};

// GET MESSAGES FOR ROOM
exports.getMessagesForRoom = async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  try {
    // Get total count
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM messages WHERE room_id = ?');
    const { total } = countStmt.get(roomId);

    // The newest messages, oldest first; offset steps back through older ones.
    const stmt = db.prepare(`
      SELECT * FROM (
        SELECT m.*, u.username, u.profile_picture
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = ?
        ORDER BY m.id DESC
        LIMIT ? OFFSET ?
      ) ORDER BY id ASC
    `);
    const rows = stmt.all(roomId, limitNum, offsetNum);

    res.json({
      messages: rows,
      total,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + rows.length < total
    });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// DOWNLOAD FILE
exports.downloadFile = async (req, res) => {
  // basename drops any folders in the name, so a request like ../../.env cannot leave the upload folder.
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, 'room-files', filename);

  try {
    // Only files that were sent in a room can be downloaded.
    const message = db.prepare('SELECT file_name FROM messages WHERE file_path = ?').get('uploads/room-files/' + filename);
    if (!message || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(filePath, message.file_name);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Download error' });
  }
};