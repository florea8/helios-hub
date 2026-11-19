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
    // The token holds only id and role; the same write that records last_seen returns the name,
    // and returns nothing for an account that no longer exists.
    const account = db
      .prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ? RETURNING username")
      .get(decoded.id);
    if (!account) return next(new AppError('Token invalid sau expirat', 401));

    req.user = { ...decoded, username: account.username };
    next();
  } catch (err) {
    return next(new AppError('Token invalid sau expirat', 401));
  }
};
