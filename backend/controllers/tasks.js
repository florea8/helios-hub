const db = require('../config/db');

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

    res.json({
      id: result.lastID,
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

    const stmt = db.prepare(`
      UPDATE room_tasks
      SET title = ?, description = ?, start_date = ?, end_date = ?, priority = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND room_id = ?
    `);
    stmt.run(title, description, start_date, end_date, priority, status, taskId, roomId);

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
