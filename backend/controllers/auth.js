const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const stmt = db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)');
    stmt.run(username, email, passwordHash, 'NORMAL');

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
    const fileData = req.body.file; // base64 string

    if (!fileData) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Parse base64 string
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ message: 'Invalid file format' });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    // Allowed MIME types
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    // File size limit (5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'File too large' });
    }

    // Get file extension
    const ext = mimeType.split('/')[1].split(';')[0];
    const filename = `${userId}-${Date.now()}.${ext}`;
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Delete old profile picture if exists
    const oldUser = db.prepare('SELECT profile_picture FROM users WHERE id = ?').get(userId);
    if (oldUser && oldUser.profile_picture) {
      const oldPath = path.join(__dirname, '..', oldUser.profile_picture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new file
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Update user profile picture path in database
    const relativePath = `uploads/profiles/${filename}`;
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

    res.json(user);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};
