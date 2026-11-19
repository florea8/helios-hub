const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks');
const { authenticate } = require('../middleware/mid');
const { requireRoomMember } = require('../middleware/roomAccess');

// Get all tasks for a room
router.get('/:roomId', authenticate, requireRoomMember(), tasksController.getTasks);

// Create a new task
router.post('/:roomId', authenticate, requireRoomMember(), tasksController.createTask);

// Update a task
router.put('/:roomId/:taskId', authenticate, requireRoomMember(), tasksController.updateTask);

// Toggle task status (done/pending)
router.patch('/:roomId/:taskId/toggle', authenticate, requireRoomMember(), tasksController.toggleTask);

// Delete a task
router.delete('/:roomId/:taskId', authenticate, requireRoomMember(), tasksController.deleteTask);

module.exports = router;
