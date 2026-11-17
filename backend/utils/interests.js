const db = require('../config/db');

const MAX_INTERESTS = 8;

const interestsOf = (userId) =>
  db
    .prepare(
      `SELECT t.id, t.name, t.color FROM user_interests ui
       JOIN tags t ON t.id = ui.tag_id
       WHERE ui.user_id = ? ORDER BY t.name`
    )
    .all(userId);

// Replaces the whole set. Unknown tag ids are skipped.
const setInterests = db.transaction((userId, tagIds) => {
  db.prepare('DELETE FROM user_interests WHERE user_id = ?').run(userId);
  const add = db.prepare('INSERT INTO user_interests (user_id, tag_id) SELECT ?, id FROM tags WHERE id = ?');
  for (const tagId of tagIds) add.run(userId, tagId);
});

module.exports = { MAX_INTERESTS, interestsOf, setInterests };
