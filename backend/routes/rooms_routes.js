const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/rooms');
const { authenticate } = require('../middleware/mid');

router.get('/', roomsController.getAllRooms);
router.post('/', authenticate, roomsController.createRoom);
router.get('/post/:postId', roomsController.getRoomsForPost);
router.get('/:id', roomsController.getRoomById);
router.post('/:id/join', authenticate, roomsController.joinRoom);
router.post('/:id/leave', authenticate, roomsController.leaveRoom);
router.get('/:id/members', roomsController.getRoomMembers);
router.get('/:id/check-membership', authenticate, roomsController.checkMembership);
router.put('/:id/music', authenticate, roomsController.updateMusic);
router.delete('/:id', authenticate, roomsController.deleteRoom);

module.exports = router;