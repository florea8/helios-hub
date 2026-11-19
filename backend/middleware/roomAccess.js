const db = require('../config/db');

// Lets the request through only for a member of the room named by req.params[param].
const requireRoomMember = (param = 'roomId') => (req, res, next) => {
  const member = db
    .prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?')
    .get(req.params[param], req.user.id);
  if (!member) {
    return res.status(403).json({ message: 'Join the room to see and change what is inside it.' });
  }
  next();
};

module.exports = { requireRoomMember };
