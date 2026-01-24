const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratings');
const { authenticate } = require('../middleware/mid');

router.post('/', authenticate, ratingsController.createRating);
router.get('/post/:postId', ratingsController.getRatingsForPost);

module.exports = router;