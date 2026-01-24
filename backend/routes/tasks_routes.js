const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks');
const { authenticate } = require('../middleware/mid');

// Get all tasks for a room
router.get('/:roomId', authenticate, tasksController.getTasks);

// Create a new task
router.post('/:roomId', authenticate, tasksController.createTask);

// Update a task
router.put('/:roomId/:taskId', authenticate, tasksController.updateTask);

// Toggle task status (done/pending)
router.patch('/:roomId/:taskId/toggle', authenticate, tasksController.toggleTask);

// Delete a task
router.delete('/:roomId/:taskId', authenticate, tasksController.deleteTask);

module.exports = router;
