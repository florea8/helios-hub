const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { allowedOrigins } = require('../config/settings');
const notificationsController = require('../controllers/notifications');
const { startDeadlineChecker } = require('../utils/deadlineChecker');

const JWT_SECRET = process.env.JWT_SECRET;

// userId -> ids of that user's open sockets. Someone with two tabs stays online until both close.
const onlineUsers = new Map();
let ioInstance = null;

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware pentru autentificare Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected via Socket.io`);

    const sockets = onlineUsers.get(userId) || new Set();
    const cameOnline = sockets.size === 0;
    sockets.add(socket.id);
    onlineUsers.set(userId, sockets);

    // Join a personal room for notifications
    socket.join(`user-${userId}`);

    // Update last_seen to now in database
    try {
      db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
    } catch (error) {
      console.error('Error updating last_seen on connect:', error);
    }

    if (cameOnline) socket.broadcast.emit('user_online', { userId });

    // Send current online users to the newly connected user
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // Handle sending direct messages
    socket.on('send_message', async (data) => {
      const recipientId = Number(data.recipientId);
      const { content } = data;
      
      try {
        // Verify friendship
        const friendship = db.prepare(`
          SELECT * FROM friends 
          WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
          AND status = 'ACCEPTED'
        `).get(userId, recipientId, recipientId, userId);

        if (!friendship) {
          socket.emit('error', { message: 'Not friends with this user' });
          return;
        }

        // Save message to database
        const stmt = db.prepare(`
          INSERT INTO direct_messages (sender_id, receiver_id, content)
          VALUES (?, ?, ?)
        `);
        const result = stmt.run(userId, recipientId, content);

        const sender = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        const message = {
          id: result.lastInsertRowid,
          sender_id: userId,
          sender_username: sender.username,
          receiver_id: recipientId,
          content,
          created_at: new Date().toISOString()
        };

        // Every tab the recipient has open gets it; the message waits in the database otherwise.
        io.to(`user-${recipientId}`).emit('receive_message', message);


      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Room events
    const isMember = (roomId) =>
      Boolean(db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId));

    // Only members hear a room's live messages.
    socket.on('join-room', (roomId) => {
      if (isMember(roomId)) socket.join(`room_${roomId}`);
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(`room_${roomId}`);
    });

    // Voice chat WebRTC signaling events
    socket.on('voice-join-room', (data) => {
      const { roomId } = data;
      if (!isMember(roomId)) return;
      socket.join(`voice_${roomId}`);

      // The name others see comes from the database, not from the client.
      const me = db.prepare('SELECT username, profile_picture FROM users WHERE id = ?').get(userId);
      socket.to(`voice_${roomId}`).emit('voice-user-joined', {
        userId,
        username: me.username,
        profilePicture: me.profile_picture
      });
    });

    socket.on('voice-leave-room', (data) => {
      const { roomId } = data;
      console.log(`User ${userId} leaving voice chat in room ${roomId}`);
      
      // Leave voice channel
      socket.leave(`voice_${roomId}`);
      
      // Notify others that user left voice
      socket.to(`voice_${roomId}`).emit('voice-user-left', { userId });
    });

    socket.on('voice-signal', (data) => {
      const { targetUserId, signal } = data;
      io.to(`user-${Number(targetUserId)}`).emit('voice-signal', { fromUserId: userId, signal });
    });

    socket.on('voice-mute-toggle', (data) => {
      const { roomId, isMuted } = data;
      
      // Broadcast mute status to others in voice room
      socket.to(`voice_${roomId}`).emit('voice-user-muted', {
        userId,
        isMuted
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      
      const remaining = onlineUsers.get(userId);
      remaining?.delete(socket.id);
      if (remaining?.size) return; // another tab is still open

      onlineUsers.delete(userId);
      try {
        db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
      } catch (error) {
        console.error('Error updating last_seen on disconnect:', error);
      }
      socket.broadcast.emit('user_offline', { userId });
    });
  });

  ioInstance = io;
  
  // Pass io instance to controllers that need it
  const tasksController = require('../controllers/tasks');
  tasksController.setSocketInstance(io);

  const postsController = require('../controllers/posts');
  postsController.setSocketInstance(io);

  // Start deadline checker
  startDeadlineChecker(io);

  return io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
}

module.exports = initializeSocket;
module.exports.getIO = getIO;
