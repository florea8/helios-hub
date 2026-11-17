const db = require('../config/db');

// Light colours that keep the dark tag text readable; new tags take the next one in turn.
const PALETTE = ['#2fd39a', '#ffd60a', '#ff8a7d', '#9db0ff', '#ffb3e6', '#ffc078', '#7fe0e0', '#c3f584'];

// GET ALL TAGS
exports.getAllTags = (req, res) => {
  try {
    res.json(db.prepare('SELECT id, name, color FROM tags ORDER BY name ASC').all());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

// CREATE TAG, or return the existing one with the same name
exports.createTag = (req, res) => {
  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ');

  if (name.length < 2 || name.length > 30) {
    return res.status(400).json({ message: 'A tag needs 2 to 30 characters.' });
  }

  try {
    const existing = db.prepare('SELECT id, name, color FROM tags WHERE name = ? COLLATE NOCASE').get(name);
    if (existing) return res.json(existing);

    const { count } = db.prepare('SELECT COUNT(*) as count FROM tags').get();
    const color = PALETTE[count % PALETTE.length];
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color);
    res.status(201).json({ id: result.lastInsertRowid, name, color });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
};

