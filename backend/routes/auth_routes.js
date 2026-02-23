const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/mid');
const { validate } = require('../middleware/validation');

router.post('/register', validate('register'), authController.register);
router.post('/login', validate('login'), authController.login);
router.post('/upload-profile-picture', authenticate, authController.uploadProfilePicture);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
