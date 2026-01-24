const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/mid');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/upload-profile-picture', authenticate, authController.uploadProfilePicture);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
