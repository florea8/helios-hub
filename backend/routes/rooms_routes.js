const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/rooms');
const { authenticate } = require('../middleware/mid');
const { validate, validateId } = require('../middleware/validation');

router.get('/', roomsController.getAllRooms);
router.post('/', authenticate, validate('createRoom'), roomsController.createRoom);
router.get('/post/:postId', validateId('postId'), roomsController.getRoomsForPost);
router.get('/:id', validateId(), roomsController.getRoomById);
router.post('/:id/join', authenticate, validateId(), roomsController.joinRoom);
router.post('/:id/leave', authenticate, validateId(), roomsController.leaveRoom);
router.get('/:id/members', validateId(), roomsController.getRoomMembers);
router.get('/:id/check-membership', authenticate, validateId(), roomsController.checkMembership);
router.put('/:id/music', authenticate, validateId(), roomsController.updateMusic);
router.put('/:id/settings', authenticate, validateId(), roomsController.updateRoomSettings);
router.put('/:id/members/:memberId/role', authenticate, roomsController.updateMemberRole);
router.delete('/:id/members/:memberId', authenticate, roomsController.removeMember);
router.post('/:id/transfer-ownership', authenticate, roomsController.transferOwnership);
router.delete('/:id', authenticate, roomsController.deleteRoom);

module.exports = router;