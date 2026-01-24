const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { authenticate } = require('../middleware/mid');

// Work Experience routes
router.get('/work-experience', authenticate, profileController.getWorkExperience);
router.post('/work-experience', authenticate, profileController.addWorkExperience);
router.put('/work-experience/:id', authenticate, profileController.updateWorkExperience);
router.delete('/work-experience/:id', authenticate, profileController.deleteWorkExperience);

// Skills routes
router.get('/skills', authenticate, profileController.getSkills);
router.post('/skills', authenticate, profileController.addSkill);
router.put('/skills/:id', authenticate, profileController.updateSkill);
router.delete('/skills/:id', authenticate, profileController.deleteSkill);

module.exports = router;
