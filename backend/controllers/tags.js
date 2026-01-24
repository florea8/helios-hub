const db = require('../config/db');

// GET ALL TAGS
exports.getAllTags = async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC');
    const tags = stmt.all();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// CREATE TAG (if doesn't exist)
exports.createTag = async (req, res) => {
  const { name, color } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Tag name required' });
  }

  try {
    const stmtCheck = db.prepare('SELECT * FROM tags WHERE name = ?');
    const existingTag = stmtCheck.get(name);

    if (existingTag) {
      return res.json(existingTag);
    }

    const stmt = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
    const result = stmt.run(name, color || '#646cff');

    res.status(201).json({ id: result.lastInsertRowid, name, color: color || '#646cff' });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// ADD TAG TO POST
exports.addTagToPost = async (req, res) => {
  const { postId, tagId } = req.body;

  if (!postId || !tagId) {
    return res.status(400).json({ message: 'Post ID and tag ID required' });
  }

  try {
    // Check if post exists
    const stmtPost = db.prepare('SELECT * FROM posts WHERE id = ?');
    const post = stmtPost.get(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if tag already assigned
    const stmtCheck = db.prepare('SELECT * FROM post_tags WHERE post_id = ? AND tag_id = ?');
    const existing = stmtCheck.get(postId, tagId);

    if (existing) {
      return res.json({ message: 'Tag already assigned' });
    }

    const stmt = db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)');
    stmt.run(postId, tagId);

    res.status(201).json({ message: 'Tag added to post' });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// REMOVE TAG FROM POST
exports.removeTagFromPost = async (req, res) => {
  const { postId, tagId } = req.body;

  if (!postId || !tagId) {
    return res.status(400).json({ message: 'Post ID and tag ID required' });
  }

  try {
    const stmt = db.prepare('DELETE FROM post_tags WHERE post_id = ? AND tag_id = ?');
    stmt.run(postId, tagId);

    res.json({ message: 'Tag removed from post' });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// GET TAGS FOR POST
exports.getTagsForPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
      ORDER BY t.name ASC
    `);
    const tags = stmt.all(postId);
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// GET POSTS BY TAG
exports.getPostsByTag = async (req, res) => {
  const { tagId } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT DISTINCT p.*, u.username FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN post_tags pt ON p.id = pt.post_id
      WHERE pt.tag_id = ?
      ORDER BY p.created_at DESC
    `);
    const posts = stmt.all(tagId);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};
