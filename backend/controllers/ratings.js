const db = require('../config/db');

// CREATE RATING
exports.createRating = async (req, res) => {
  const { postId, ratedUserId, score, comment } = req.body;
  const userId = req.user.id;

  if (!postId || !ratedUserId || !score || score < 1 || score > 5) {
    return res.status(400).json({ message: 'Post ID, rated user ID, and score (1-5) required' });
  }

  try {
    // Check if post exists and is closed
    const stmtPost = db.prepare('SELECT * FROM posts WHERE id = ? AND status = "CLOSED"');
    const post = stmtPost.get(postId);

    if (!post) {
      return res.status(400).json({ message: 'Post not found or not closed' });
    }

    // Check if user is involved in the post (owner or rated)
    if (post.user_id !== userId && ratedUserId !== userId) {
      return res.status(403).json({ message: 'Not authorized to rate' });
    }

    const stmt = db.prepare('INSERT INTO ratings (post_id, rated_user_id, score, comment) VALUES (?, ?, ?, ?)');
    const result = stmt.run(postId, ratedUserId, score, comment || null);

    res.status(201).json({ message: 'Rating created', ratingId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// GET RATINGS FOR POST
exports.getRatingsForPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const stmt = db.prepare('SELECT r.*, u.username AS rated_username FROM ratings r JOIN users u ON r.rated_user_id = u.id WHERE r.post_id = ?');
    const rows = stmt.all(postId);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};