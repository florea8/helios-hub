const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { authenticate } = require('../middleware/mid');

// Profile update
router.put('/update', authenticate, profileController.updateProfile);
router.get('/user/:userId', authenticate, profileController.getUserProfile);
router.get('/:userId', authenticate, profileController.getUserProfile);

module.exports = router;

