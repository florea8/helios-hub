const db = require('../config/db');
const notificationsController = require('./notifications');

// Get socket.io instance (will be set by socket/index.js)
let ioInstance = null;

exports.setSocketInstance = (io) => {
  ioInstance = io;
};

// Get all tasks for a room
exports.getTasks = (req, res) => {
  try {
    const { roomId } = req.params;
    const stmt = db.prepare(`
      SELECT rt.*, u.username
      FROM room_tasks rt
      JOIN users u ON rt.created_by = u.id
      WHERE rt.room_id = ?
      ORDER BY rt.start_date ASC, rt.priority DESC
    `);
    const tasks = stmt.all(roomId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new task
exports.createTask = (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, description, start_date, end_date, priority } = req.body;
    const created_by = req.user.id;

    const stmt = db.prepare(`
      INSERT INTO room_tasks (room_id, title, description, start_date, end_date, priority, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);
    const result = stmt.run(roomId, title, description, start_date, end_date, priority || 'NORMAL', created_by);

    const taskId = result.lastInsertRowid;

    // Get room members to notify
    const membersStmt = db.prepare(`
      SELECT DISTINCT rm.user_id, u.username
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ? AND rm.user_id != ?
    `);
    const members = membersStmt.all(roomId, created_by);

    // Get room name
    const roomStmt = db.prepare('SELECT name FROM rooms WHERE id = ?');
    const room = roomStmt.get(roomId);

    // Create notifications for all room members
    members.forEach(member => {
      const notifId = notificationsController.createNotification(
        member.user_id,
        'TASK_NEW',
        'New Task Created',
        `${req.user.username} created task "${title}" in ${room?.name || 'room'}`,
        `/rooms?roomId=${roomId}`,
        created_by,
        taskId
      );

      // Send real-time notification
      if (ioInstance && notifId) {
        ioInstance.to(`user-${member.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'TASK_NEW',
          title: 'New Task Created',
          message: `${req.user.username} created task "${title}" in ${room?.name || 'room'}`,
          link: `/rooms?roomId=${roomId}`,
          related_username: req.user.username,
          created_at: new Date().toISOString()
        });
      }
    });

    res.json({
      id: taskId,
      room_id: roomId,
      title,
      description,
      start_date,
      end_date,
      priority: priority || 'NORMAL',
      status: 'PENDING',
      created_by,
      username: req.user.username,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a task
exports.updateTask = (req, res) => {
  try {
    const { roomId, taskId } = req.params;
    const { title, description, start_date, end_date, priority, status } = req.body;

    // Get current task info
    const currentTask = db.prepare('SELECT * FROM room_tasks WHERE id = ? AND room_id = ?').get(taskId, roomId);
    
    const stmt = db.prepare(`
      UPDATE room_tasks
      SET title = ?, description = ?, start_date = ?, end_date = ?, priority = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND room_id = ?
    `);
    stmt.run(title, description, start_date, end_date, priority, status, taskId, roomId);

    // Get room members to notify (except the updater)
    const membersStmt = db.prepare(`
      SELECT DISTINCT rm.user_id, u.username
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ? AND rm.user_id != ?
    `);
    const members = membersStmt.all(roomId, req.user.id);

    // Get room name
    const roomStmt = db.prepare('SELECT name FROM rooms WHERE id = ?');
    const room = roomStmt.get(roomId);

    // Determine what changed
    let changeMsg = '';
    if (currentTask.status !== status && status === 'DONE') {
      changeMsg = `marked task "${title}" as done`;
    } else if (currentTask.status !== status && status === 'PENDING') {
      changeMsg = `reopened task "${title}"`;
    } else {
      changeMsg = `updated task "${title}"`;
    }

    // Create notifications
    members.forEach(member => {
      const notifId = notificationsController.createNotification(
        member.user_id,
        'TASK_UPDATE',
        'Task Updated',
        `${req.user.username} ${changeMsg} in ${room?.name || 'room'}`,
        `/rooms?roomId=${roomId}`,
        req.user.id,
        taskId
      );

      // Send real-time notification
      if (ioInstance && notifId) {
        ioInstance.to(`user-${member.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'TASK_UPDATE',
          title: 'Task Updated',
          message: `${req.user.username} ${changeMsg} in ${room?.name || 'room'}`,
          link: `/rooms?roomId=${roomId}`,
          related_username: req.user.username,
          created_at: new Date().toISOString()
        });
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle task done/pending
exports.toggleTask = (req, res) => {
  try {
    const { roomId, taskId } = req.params;
    const { status } = req.body;

    const stmt = db.prepare(`
      UPDATE room_tasks
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND room_id = ?
    `);
    stmt.run(status, taskId, roomId);

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a task
exports.deleteTask = (req, res) => {
  try {
    const { roomId, taskId } = req.params;

    const stmt = db.prepare('DELETE FROM room_tasks WHERE id = ? AND room_id = ?');
    stmt.run(taskId, roomId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
