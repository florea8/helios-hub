const fs = require('fs');
const path = require('path');
const { uploadDir, uploadPath } = require('../config/settings');

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;

// Saves an image sent as a base64 data URL under uploads/<folder>.
// Returns { path } with the stored path ("uploads/<folder>/<name>"), or { error } with a message for the person.
const saveImage = (dataUrl, folder, prefix) => {
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl || '');
  const ext = match && EXTENSIONS[match[1]];
  if (!ext) return { error: 'Use a JPEG, PNG, GIF or WebP image.' };

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) return { error: 'Images can be at most 5 MB.' };

  const name = `${prefix}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, folder, name), buffer);
  return { path: `uploads/${folder}/${name}` };
};

// Deletes a stored upload. Older posts kept their image inline as a data URL; those have no file.
const removeUpload = (stored) => {
  if (stored?.startsWith('uploads/')) fs.rmSync(uploadPath(stored), { force: true });
};

module.exports = { saveImage, removeUpload };
