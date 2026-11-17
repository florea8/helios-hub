const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { authenticate } = require('../middleware/mid');
const { validate } = require('../middleware/validation');

// Profile update
router.put('/update', authenticate, profileController.updateProfile);
router.put('/interests', authenticate, validate('setInterests'), profileController.updateInterests);
router.get('/user/:userId', authenticate, profileController.getUserProfile);
router.get('/:userId', authenticate, profileController.getUserProfile);

module.exports = router;

