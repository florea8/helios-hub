const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tags');
const { authenticate } = require('../middleware/mid');

// Tags are attached to a post when it is created; see POST /api/posts.
router.get('/', tagsController.getAllTags);
router.post('/', authenticate, tagsController.createTag);

module.exports = router;
