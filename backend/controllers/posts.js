const db = require('../config/db');

// CREATE POST
exports.createPost = async (req, res) => {
  const { title, description, post_type, image } = req.body;
  const userId = req.user.id;

  // For room posts, title is required; for standard posts, only description is required
  const type = post_type || 'standard'; // 'standard' or 'room'
  
  if (type === 'room' && !title) {
    return res.status(400).json({ message: 'Title required for room posts' });
  }
  
  if (!description) {
    return res.status(400).json({ message: 'Description required' });
  }
  
  if (!['standard', 'room'].includes(type)) {
    return res.status(400).json({ message: 'Invalid post type' });
  }

  try {
    // Check if posts table has post_type and image columns
    const tableInfo = db.prepare("PRAGMA table_info(posts)").all();
    const hasPostType = tableInfo.some(col => col.name === 'post_type');
    const hasImage = tableInfo.some(col => col.name === 'image');

    // Add columns if they don't exist
    if (!hasPostType) {
      db.prepare("ALTER TABLE posts ADD COLUMN post_type TEXT DEFAULT 'standard'").run();
    }
    if (!hasImage) {
      db.prepare("ALTER TABLE posts ADD COLUMN image TEXT").run();
    }

    const stmt = db.prepare('INSERT INTO posts (user_id, title, description, post_type, image) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(userId, title || '', description, type, image || null);

    res.status(201).json({ message: 'Post created', postId: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// GET ALL POSTS
exports.getPosts = async (req, res) => {
  const userId = req.user?.id; // Optional if not authenticated

  try {
    const stmt = db.prepare(`
      SELECT 
        p.*, 
        u.username, 
        u.profile_picture,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
        ${userId ? `(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_liked` : '0 as user_liked'}
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);
    const rows = userId ? stmt.all(userId) : stmt.all();

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// GET POST BY ID
exports.getPostById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const stmt = db.prepare(`
      SELECT 
        p.*, 
        u.username, 
        u.profile_picture,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
        ${userId ? `(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_liked` : '0 as user_liked'}
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `);
    const row = userId ? stmt.get(userId, id) : stmt.get(id);

    if (!row) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// UPDATE POST STATUS
exports.updatePostStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const stmtCheck = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?');
    const post = stmtCheck.get(id, userId);

    if (!post) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const stmtUpdate = db.prepare('UPDATE posts SET status = ? WHERE id = ?');
    stmtUpdate.run(status, id);

    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// UPDATE POST
exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, description, status, image } = req.body;
  const userId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description required' });
  }

  try {
    const stmtCheck = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?');
    const post = stmtCheck.get(id, userId);

    if (!post) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const stmtUpdate = db.prepare('UPDATE posts SET title = ?, description = ?, status = ?, image = ? WHERE id = ?');
    stmtUpdate.run(title, description, status || 'OPEN', image || null, id);

    res.json({ message: 'Post updated' });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// DELETE POST
exports.deletePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const stmtCheck = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?');
    const post = stmtCheck.get(id, userId);

    if (!post) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const stmtDelete = db.prepare('DELETE FROM posts WHERE id = ?');
    stmtDelete.run(id);

    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
};

// LIKE POST
exports.likePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if post exists
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already liked
    const existing = db.prepare('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?').get(id, userId);
    if (existing) {
      return res.status(400).json({ message: 'Already liked' });
    }

    // Add like
    db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(id, userId);
    
    // Get updated like count
    const likeCount = db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?').get(id).count;

    res.json({ message: 'Post liked', like_count: likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// UNLIKE POST
exports.unlikePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(id, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Like not found' });
    }

    // Get updated like count
    const likeCount = db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?').get(id).count;

    res.json({ message: 'Post unliked', like_count: likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// GET COMMENTS FOR POST
exports.getComments = async (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT 
        c.*, 
        u.username, 
        u.profile_picture 
      FROM post_comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = ? 
      ORDER BY c.created_at DESC
    `);
    const rows = stmt.all(id);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// ADD COMMENT TO POST
exports.addComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Content required' });
  }

  try {
    // Check if post exists
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add comment
    const result = db.prepare('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)').run(id, userId, content.trim());
    
    // Get the created comment with user info
    const comment = db.prepare(`
      SELECT 
        c.*, 
        u.username, 
        u.profile_picture 
      FROM post_comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// DELETE COMMENT
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    // Check if comment exists and user owns it
    const comment = db.prepare('SELECT * FROM post_comments WHERE id = ?').get(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId);

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};
