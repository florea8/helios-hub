const path = require('path');

// Sites allowed to call the API and open live connections. CORS_ORIGINS is a comma-separated list.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Where uploads are kept on disk. On a host that replaces the disk on every deploy, point UPLOAD_DIR at a volume.
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '..', 'uploads');

// Stored paths look like "uploads/profiles/x.png", which is also the URL they are served at.
const uploadPath = (stored) => path.join(uploadDir, stored.replace(/^uploads[\\/]/, ''));

module.exports = { allowedOrigins, uploadDir, uploadPath };
