const db = require('../config/db');
const notificationsController = require('../controllers/notifications');

let ioInstance = null;

// Set socket.io instance
const setSocketInstance = (io) => {
  ioInstance = io;
};

// Check for upcoming task deadlines.
// end_date is a day (YYYY-MM-DD), so a task is due at the end of that day: datetime(end_date, '+1 day').
const checkTaskDeadlines = () => {
  try {
    // Find tasks due in 24 hours
    const tasks24h = db.prepare(`
      SELECT 
        rt.*,
        r.name as room_name,
        rm.user_id as member_id,
        u.username as member_username
      FROM room_tasks rt
      JOIN rooms r ON rt.room_id = r.id
      JOIN room_members rm ON r.id = rm.room_id
      JOIN users u ON rm.user_id = u.id
      WHERE rt.status = 'PENDING'
      AND datetime(rt.end_date, '+1 day') > datetime('now')
      AND datetime(rt.end_date, '+1 day') <= datetime('now', '+24 hours')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = rm.user_id
        AND n.type = 'TASK_DEADLINE'
        AND n.related_id = rt.id
        AND datetime(n.created_at) > datetime('now', '-23 hours')
      )
    `).all();

    // Send notifications for 24-hour deadlines
    tasks24h.forEach(task => {
      const notifId = notificationsController.createNotification(
        task.member_id,
        'TASK_DEADLINE',
        'Task Deadline Approaching',
        `Task "${task.title}" in ${task.room_name} is due in less than 24 hours`,
        `/rooms?roomId=${task.room_id}`,
        task.created_by,
        task.id
      );

      // Send real-time notification
      if (ioInstance && notifId) {
        ioInstance.to(`user-${task.member_id}`).emit('new_notification', {
          id: notifId,
          type: 'TASK_DEADLINE',
          title: 'Task Deadline Approaching',
          message: `Task "${task.title}" in ${task.room_name} is due in less than 24 hours`,
          link: `/rooms?roomId=${task.room_id}`,
          created_at: new Date().toISOString()
        });
      }
    });

    // Find tasks due in 1 hour
    const tasks1h = db.prepare(`
      SELECT 
        rt.*,
        r.name as room_name,
        rm.user_id as member_id,
        u.username as member_username
      FROM room_tasks rt
      JOIN rooms r ON rt.room_id = r.id
      JOIN room_members rm ON r.id = rm.room_id
      JOIN users u ON rm.user_id = u.id
      WHERE rt.status = 'PENDING'
      AND datetime(rt.end_date, '+1 day') > datetime('now')
      AND datetime(rt.end_date, '+1 day') <= datetime('now', '+1 hour')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = rm.user_id
        AND n.type = 'TASK_DEADLINE'
        AND n.related_id = rt.id
        AND datetime(n.created_at) > datetime('now', '-55 minutes')
      )
    `).all();

    // Send notifications for 1-hour deadlines
    tasks1h.forEach(task => {
      const notifId = notificationsController.createNotification(
        task.member_id,
        'TASK_DEADLINE',
        '⏰ URGENT: Task Deadline',
        `Task "${task.title}" in ${task.room_name} is due in less than 1 hour!`,
        `/rooms?roomId=${task.room_id}`,
        task.created_by,
        task.id
      );

      // Send real-time notification
      if (ioInstance && notifId) {
        ioInstance.to(`user-${task.member_id}`).emit('new_notification', {
          id: notifId,
          type: 'TASK_DEADLINE',
          title: '⏰ URGENT: Task Deadline',
          message: `Task "${task.title}" in ${task.room_name} is due in less than 1 hour!`,
          link: `/rooms?roomId=${task.room_id}`,
          created_at: new Date().toISOString()
        });
      }
    });

    if (tasks24h.length > 0 || tasks1h.length > 0) {
      console.log(`[Deadline Checker] Sent ${tasks24h.length} 24h and ${tasks1h.length} 1h deadline notifications`);
    }

  } catch (error) {
    console.error('[Deadline Checker] Error checking task deadlines:', error);
  }
};

// Start the deadline checker (runs every 15 minutes)
const startDeadlineChecker = (io) => {
  setSocketInstance(io);
  
  // Run immediately on startup
  checkTaskDeadlines();
  
  // Then run every 15 minutes
  const interval = setInterval(checkTaskDeadlines, 15 * 60 * 1000);
  
  console.log('[Deadline Checker] Started - checking every 15 minutes');
  
  return interval;
};

module.exports = { startDeadlineChecker };
