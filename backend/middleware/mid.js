const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'unsecretfoarteputernic123!';

exports.authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: 'Token lipsă' });

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
    res.status(401).json({ message: 'Token invalid' });
  }
};

// Alias for compatibility
exports.authenticateToken = exports.authenticate;
