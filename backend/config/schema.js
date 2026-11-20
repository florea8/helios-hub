// The database schema. createSchema runs on every start: it creates missing tables and brings an older
// database up to date, and it is safe to run again on one that already is.

const TABLES = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'NORMAL' CHECK (role IN ('NORMAL','PRO')),
  profile_picture TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  is_profile_public INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED')),
  post_type TEXT DEFAULT 'standard',
  image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  description TEXT,
  rules TEXT,
  music_url TEXT,
  music_title TEXT,
  music_added_by INTEGER,
  music_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin','moderator','member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE')),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH')),
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#646cff',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, tag_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','BLOCKED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS post_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('TASK_NEW','TASK_UPDATE','TASK_DEADLINE','MENTION','ROOM_INVITE','COMMENT_REPLY','FRIEND_REQUEST','FRIEND_ACCEPT','POST_LIKE')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read INTEGER DEFAULT 0,
  related_user_id INTEGER,
  related_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL
);
`;

// Columns added after the first release. CREATE TABLE IF NOT EXISTS leaves an existing table as it is,
// so a database made before a column existed gets it here. ALTER TABLE can only add a column whose
// default is a constant, which is why the later timestamps have none.
const ADDED_COLUMNS = {
  users: [
    'profile_picture TEXT', 'bio TEXT', 'location TEXT', 'website TEXT', 'github_url TEXT',
    'linkedin_url TEXT', 'twitter_url TEXT', 'is_profile_public INTEGER DEFAULT 1', 'points INTEGER DEFAULT 0',
    'last_seen DATETIME',
  ],
  posts: ["post_type TEXT DEFAULT 'standard'", 'image TEXT'],
  rooms: ['description TEXT', 'rules TEXT', 'music_url TEXT', 'music_title TEXT', 'music_added_by INTEGER', 'music_updated_at DATETIME', 'updated_at DATETIME'],
  room_members: ["role TEXT DEFAULT 'member' CHECK (role IN ('admin','moderator','member'))"],
  messages: ['file_name TEXT', 'file_path TEXT', 'file_size INTEGER', 'file_type TEXT'],
  direct_messages: ['read_at DATETIME'],
};

const addMissingColumns = (db) => {
  for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
    const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    for (const column of columns) {
      if (!existing.has(column.split(' ')[0])) db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column}`).run();
    }
  }
};

// The notifications CHECK once lacked POST_LIKE. SQLite cannot alter a CHECK, so such a table is rebuilt.
const allowLikeNotifications = (db) => {
  const { sql } = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'").get();
  if (sql.includes('POST_LIKE')) return;
  db.transaction(() => {
    db.prepare('ALTER TABLE notifications RENAME TO notifications_old').run();
    db.exec(TABLES.slice(TABLES.indexOf('CREATE TABLE IF NOT EXISTS notifications')));
    db.prepare('INSERT INTO notifications SELECT * FROM notifications_old').run();
    db.prepare('DROP TABLE notifications_old').run();
  })();
};

const createSchema = (db) => {
  db.exec(TABLES);
  addMissingColumns(db);
  allowLikeNotifications(db);

  // Data fixes for databases made by older versions; each changes nothing once applied.
  // Room creators predate member roles.
  db.prepare(`
    UPDATE room_members SET role = 'admin'
    WHERE role != 'admin' AND user_id = (SELECT created_by FROM rooms WHERE rooms.id = room_members.room_id)
  `).run();
  // Rooms made before post_type passed validation left their post marked 'standard'.
  db.prepare("UPDATE posts SET post_type = 'room' WHERE id IN (SELECT post_id FROM rooms) AND COALESCE(post_type, 'standard') != 'room'").run();

  // The room assistant posts as user 0. Its name has a space and its address a reserved domain,
  // so nobody can register either one and pass for the assistant. An older install named it HeliosBot.
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash)
    VALUES (0, 'Helios assistant', 'assistant@helios.invalid', 'NO_PASSWORD')
    ON CONFLICT(id) DO UPDATE SET username = excluded.username, email = excluded.email
  `).run();
};

module.exports = { createSchema };
