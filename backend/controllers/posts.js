const db = require('../config/db');
const notificationsController = require('./notifications');

// Get socket instance - will be set by socket/index.js
let ioInstance = null;

exports.setSocketInstance = (io) => {
  ioInstance = io;
};

// CREATE POST
exports.createPost = async (req, res) => {
  const { title, description, post_type, image, tags } = req.body;
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

    // Check if users table has points column
    const usersTableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasPoints = usersTableInfo.some(col => col.name === 'points');
    if (!hasPoints) {
      db.prepare("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0").run();
    }

    // The post and its tags are saved together or not at all. Unknown tag ids are skipped.
    const postId = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO posts (user_id, title, description, post_type, image) VALUES (?, ?, ?, ?, ?)')
        .run(userId, title || '', description, type, image || null);
      const tag = db.prepare('INSERT INTO post_tags (post_id, tag_id) SELECT ?, id FROM tags WHERE id = ?');
      for (const tagId of tags || []) tag.run(lastInsertRowid, tagId);
      return lastInsertRowid;
    })();

    res.status(201).json({ message: 'Post created', postId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// GET ALL POSTS
exports.getPosts = async (req, res) => {
  const userId = req.user?.id; // Optional if not authenticated
  const { limit = 10, offset = 0 } = req.query;
  const author = parseInt(req.query.author) || null;
  const tag = parseInt(req.query.tag) || null;
  const search = String(req.query.q || '').trim();

  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  // Optional filters: one person's posts, one tag, and text in the title, body or author name.
  const conditions = [];
  const filter = [];
  if (author) {
    conditions.push('p.user_id = ?');
    filter.push(author);
  }
  if (tag) {
    conditions.push('p.id IN (SELECT post_id FROM post_tags WHERE tag_id = ?)');
    filter.push(tag);
  }
  if (search) {
    conditions.push("(p.title LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\')");
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    filter.push(like, like, like);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Get total count
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM posts p JOIN users u ON p.user_id = u.id ${where}`).get(...filter);

    // Get paginated posts
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
      ${where}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...(userId ? [userId] : []), ...filter, limitNum, offsetNum);

    // One query for the tags of every post on the page, instead of one request per post.
    const tagsByPost = new Map(rows.map((row) => [row.id, []]));
    if (rows.length) {
      const tagRows = db.prepare(`
        SELECT pt.post_id, t.id, t.name, t.color
        FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
        WHERE pt.post_id IN (${rows.map(() => '?').join(',')})
      `).all(...rows.map((row) => row.id));
      for (const { post_id, ...tag } of tagRows) tagsByPost.get(post_id).push(tag);
    }
    for (const row of rows) row.tags = tagsByPost.get(row.id);

    res.json({
      posts: rows,
      total,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + rows.length < total
    });
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
    
    // Award 1 point to post author
    if (post.user_id !== userId) {
      db.prepare('UPDATE users SET points = points + 1 WHERE id = ?').run(post.user_id);
    }
    
    // Get updated like count
    const likeCount = db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?').get(id).count;

    // Create notification for post author (if not liking own post)
    if (post.user_id !== userId) {
      const liker = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
      
      const notifId = notificationsController.createNotification(
        post.user_id,
        'POST_LIKE',
        'New Like',
        `${liker?.username || 'Someone'} liked your post`,
        `/posts/${id}`,
        userId,
        id
      );

      // Send real-time notification
      if (ioInstance && notifId) {
        ioInstance.to(`user-${post.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'POST_LIKE',
          title: 'New Like',
          message: `${liker?.username || 'Someone'} liked your post`,
          link: `/posts/${id}`,
          related_username: liker?.username,
          created_at: new Date().toISOString()
        });
      }
    }

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
    // Get post info before deleting like
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id);
    
    const result = db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(id, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Like not found' });
    }

    // Remove 1 point from post author (if not unliking own post)
    if (post && post.user_id !== userId) {
      db.prepare('UPDATE users SET points = MAX(points - 1, 0) WHERE id = ?').run(post.user_id);
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
    
    // Award 2 points to post author for receiving a comment
    if (post.user_id !== userId) {
      db.prepare('UPDATE users SET points = points + 2 WHERE id = ?').run(post.user_id);
    }
    
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

    // Get commenter info
    const commenterStmt = db.prepare('SELECT username FROM users WHERE id = ?');
    const commenter = commenterStmt.get(userId);

    // Notify post author (if not commenting on own post)
    if (post.user_id !== userId) {
      const notifId = notificationsController.createNotification(
        post.user_id,
        'COMMENT_REPLY',
        'New Comment',
        `${commenter?.username || 'Someone'} commented on your post`,
        `/posts/${id}`,
        userId,
        result.lastInsertRowid
      );

      // Send real-time notification
      if (ioInstance && notifId) {
        ioInstance.to(`user-${post.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'COMMENT_REPLY',
          title: 'New Comment',
          message: `${commenter?.username || 'Someone'} commented on your post`,
          link: `/posts/${id}`,
          related_username: commenter?.username,
          created_at: new Date().toISOString()
        });
      }
    }

    // Also notify other commenters (excluding current user and post author)
    const otherCommentersStmt = db.prepare(`
      SELECT DISTINCT user_id 
      FROM post_comments 
      WHERE post_id = ? AND user_id != ? AND user_id != ?
    `);
    const otherCommenters = otherCommentersStmt.all(id, userId, post.user_id);

    otherCommenters.forEach(commenter => {
      const notifId = notificationsController.createNotification(
        commenter.user_id,
        'COMMENT_REPLY',
        'New Reply',
        `${commenter?.username || 'Someone'} also commented on a post you commented on`,
        `/posts/${id}`,
        userId,
        result.lastInsertRowid
      );

      // Send real-time notification
      if (ioInstance && notifId) {
        ioInstance.to(`user-${commenter.user_id}`).emit('new_notification', {
          id: notifId,
          type: 'COMMENT_REPLY',
          title: 'New Reply',
          message: `${commenter?.username || 'Someone'} also commented on a post you commented on`,
          link: `/posts/${id}`,
          related_username: commenter?.username,
          created_at: new Date().toISOString()
        });
      }
    });

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

    // Get post author to remove points
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(comment.post_id);
    
    db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId);

    // Remove 2 points from post author (if comment was not on own post)
    if (post && post.user_id !== userId) {
      db.prepare('UPDATE users SET points = MAX(points - 2, 0) WHERE id = ?').run(post.user_id);
    }

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};
