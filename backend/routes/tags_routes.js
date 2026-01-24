const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tags');
const { authenticate } = require('../middleware/mid');

router.get('/', tagsController.getAllTags);
router.post('/', authenticate, tagsController.createTag);
router.post('/add-to-post', authenticate, tagsController.addTagToPost);
router.post('/remove-from-post', authenticate, tagsController.removeTagFromPost);
router.get('/post/:postId', tagsController.getTagsForPost);
router.get('/search/:tagId', tagsController.getPostsByTag);

module.exports = router;
