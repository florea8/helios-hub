const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'unsecretfoarteputernic123!';

// Map pentru tracking users online: userId -> socketId
const onlineUsers = new Map();
let ioInstance = null;

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
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

    // Add user to online users map
    onlineUsers.set(userId, socket.id);

    // Update last_seen to now in database
    try {
      db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
    } catch (error) {
      console.error('Error updating last_seen on connect:', error);
    }

    // Notify friends that user is online
    socket.broadcast.emit('user_online', { userId });

    // Send current online users to the newly connected user
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // Handle sending direct messages
    socket.on('send_message', async (data) => {
      const { recipientId, content } = data;
      
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

        const message = {
          id: result.lastInsertRowid,
          sender_id: userId,
          receiver_id: recipientId,
          content,
          created_at: new Date().toISOString()
        };

        // Send to recipient if online
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_message', message);
        }

        // Confirm to sender
        socket.emit('message_sent', message);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { recipientId } = data;
      const recipientSocketId = onlineUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', { userId });
      }
    });

    socket.on('stop_typing', (data) => {
      const { recipientId } = data;
      const recipientSocketId = onlineUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_stop_typing', { userId });
      }
    });

    // Room events
    socket.on('join-room', (roomId) => {
      socket.join(`room_${roomId}`);
      console.log(`User ${userId} joined room ${roomId}`);
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(`room_${roomId}`);
      console.log(`User ${userId} left room ${roomId}`);
    });

    socket.on('room-message', (message) => {
      // Broadcast message to all users in the room except sender
      socket.to(`room_${message.room_id}`).emit('room-message', message);
    });

    socket.on('room-typing', (data) => {
      const { roomId } = data;
      socket.to(`room_${roomId}`).emit('room-typing', { userId, username: data.username });
    });

    socket.on('room-stop-typing', (data) => {
      const { roomId } = data;
      socket.to(`room_${roomId}`).emit('room-stop-typing', { userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      
      // Remove from online users
      onlineUsers.delete(userId);

      // Update last_seen in database
      try {
        db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(userId);
      } catch (error) {
        console.error('Error updating last_seen on disconnect:', error);
      }

      // Notify friends that user is offline
      socket.broadcast.emit('user_offline', { userId });
    });
  });

  ioInstance = io;
  return io;
}

// Export getters for io and onlineUsers
function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
}

function getOnlineUsers() {
  return onlineUsers;
}

module.exports = initializeSocket;
module.exports.getIO = getIO;
module.exports.getOnlineUsers = getOnlineUsers;
