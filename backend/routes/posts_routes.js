const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts');
const { authenticate } = require('../middleware/mid');

router.post('/', authenticate, postsController.createPost);
router.get('/', postsController.getPosts);
router.get('/:id', postsController.getPostById);
router.put('/:id', authenticate, postsController.updatePost);
router.delete('/:id', authenticate, postsController.deletePost);

// Likes
router.post('/:id/like', authenticate, postsController.likePost);
router.delete('/:id/like', authenticate, postsController.unlikePost);

// Comments
router.get('/:id/comments', postsController.getComments);
router.post('/:id/comments', authenticate, postsController.addComment);
router.delete('/comments/:commentId', authenticate, postsController.deleteComment);

module.exports = router;