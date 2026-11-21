const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { authenticate } = require('../middleware/mid');
const { validate } = require('../middleware/validation');

// Profile update
router.put('/update', authenticate, validate('updateProfile'), profileController.updateProfile);
router.put('/interests', authenticate, validate('setInterests'), profileController.updateInterests);
router.get('/:userId', authenticate, profileController.getUserProfile);

module.exports = router;

