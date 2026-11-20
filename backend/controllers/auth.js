const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { saveImage, removeUpload } = require('../utils/images');
const { interestsOf, setInterests } = require('../utils/interests');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, interests } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    // The account and its first interests are saved together.
    db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(username, email, passwordHash, 'NORMAL');
      setInterests(lastInsertRowid, interests);
    })();

    logger.info('User registered successfully', { email, username });
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('User already exists', 409);
    }
    throw err;
  }
});

// LOGIN
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email);

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  logger.info('User logged in successfully', { userId: user.id, email });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile_picture: user.profile_picture
    }
  });
});

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const saved = saveImage(req.body.file, 'profiles', userId);
    if (saved.error) {
      return res.status(400).json({ message: saved.error });
    }

    const old = db.prepare('SELECT profile_picture FROM users WHERE id = ?').get(userId);
    removeUpload(old?.profile_picture);

    const relativePath = saved.path;
    db.prepare('UPDATE users SET profile_picture = ? WHERE id = ?').run(relativePath, userId);

    res.json({
      message: 'Profile picture uploaded',
      profile_picture: relativePath
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = db.prepare('SELECT id, username, email, profile_picture, role, points, created_at FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ ...user, interests: interestsOf(userId) });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};
