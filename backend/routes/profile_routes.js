const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');
const { authenticate } = require('../middleware/mid');

// Profile update
router.put('/update', authenticate, profileController.updateProfile);
router.get('/user/:userId', authenticate, profileController.getUserProfile);
router.get('/:userId', authenticate, profileController.getUserProfile);

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

// Projects routes
router.get('/projects', authenticate, profileController.getProjects);
router.get('/projects/:userId', authenticate, profileController.getProjects);
router.post('/projects', authenticate, profileController.addProject);
router.put('/projects/:id', authenticate, profileController.updateProject);
router.delete('/projects/:id', authenticate, profileController.deleteProject);

// Achievements routes
router.get('/achievements', authenticate, profileController.getUserAchievements);
router.get('/achievements/:userId', authenticate, profileController.getUserAchievements);
router.get('/achievements/all/list', authenticate, profileController.getAllAchievements);

// Activity feed routes
router.get('/activity', authenticate, profileController.getUserActivity);
router.get('/activity/:userId', authenticate, profileController.getUserActivity);

module.exports = router;

