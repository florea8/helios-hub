const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

exports.authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError('Token lipsă', 401));
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    
    // Update last_seen timestamp
    try {
      db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(decoded.id);
    } catch (error) {
      console.error('Error updating last_seen:', error);
    }
    
    next();
  } catch (err) {
    return next(new AppError('Token invalid sau expirat', 401));
  }
};
