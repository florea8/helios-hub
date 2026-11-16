const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts');
const { authenticate } = require('../middleware/mid');
const { createLimiter } = require('../middleware/rateLimiter');
const { validate, validateId } = require('../middleware/validation');

router.post('/', authenticate, createLimiter, validate('createPost'), postsController.createPost);
router.get('/', authenticate, postsController.getPosts);
router.get('/:id', validateId(), postsController.getPostById);
router.put('/:id', authenticate, validateId(), validate('updatePost'), postsController.updatePost);
router.delete('/:id', authenticate, validateId(), postsController.deletePost);

// Likes
router.post('/:id/like', authenticate, validateId(), postsController.likePost);
router.delete('/:id/like', authenticate, validateId(), postsController.unlikePost);

// Comments
router.get('/:id/comments', validateId(), postsController.getComments);
router.post('/:id/comments', authenticate, validateId(), validate('addComment'), postsController.addComment);
router.delete('/comments/:commentId', authenticate, validateId('commentId'), postsController.deleteComment);

module.exports = router;