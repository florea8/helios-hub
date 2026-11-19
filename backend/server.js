const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/db');
const { allowedOrigins, uploadDir } = require('./config/settings');
const initializeSocket = require('./socket');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'NORMAL' CHECK (role IN ('NORMAL','PRO')),
  profile_picture TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
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
`);

// Migration: Add last_seen column if it doesn't exist
try {
  db.prepare('ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP').run();
} catch (error) {
  // Column already exists, ignore error
}

// Migration: Add profile_picture column if it doesn't exist
try {
  db.prepare('ALTER TABLE users ADD COLUMN profile_picture TEXT').run();
} catch (error) {
  // Column already exists, ignore error
}

// Migration: Add music metadata columns to rooms if they don't exist
try {
  db.prepare('ALTER TABLE rooms ADD COLUMN music_url TEXT').run();
} catch (error) {
  // Column already exists, ignore error
}

try {
  db.prepare('ALTER TABLE rooms ADD COLUMN music_title TEXT').run();
} catch (error) {
  // Column already exists, ignore error
}

try {
  db.prepare('ALTER TABLE rooms ADD COLUMN music_added_by INTEGER').run();
} catch (error) {
  // Column already exists, ignore error
}

try {
  db.prepare('ALTER TABLE rooms ADD COLUMN music_updated_at DATETIME').run();
} catch (error) {
  // Column already exists, ignore error
}

// Migration: Add room tasks table
try {
  db.prepare(`CREATE TABLE IF NOT EXISTS room_tasks (
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
  )`).run();
} catch (error) {
  // Error creating table
  console.error('Error creating room_tasks table:', error.message);
}

// Migration: Add file attachment columns to messages
try {
  db.prepare('ALTER TABLE messages ADD COLUMN file_name TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE messages ADD COLUMN file_path TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE messages ADD COLUMN file_size INTEGER').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE messages ADD COLUMN file_type TEXT').run();
} catch (error) {
  // Column already exists
}

// The room assistant posts as user 0. Its name has a space and its address a reserved domain,
// so nobody can register either one and pass for the assistant. An older install named it HeliosBot.
db.prepare(`
  INSERT INTO users (id, username, email, password_hash)
  VALUES (0, 'Helios assistant', 'assistant@helios.invalid', 'NO_PASSWORD')
  ON CONFLICT(id) DO UPDATE SET username = excluded.username, email = excluded.email
`).run();

// Migration: posts carry a type and an optional image. These were once added on the first post,
// so a new database had neither column until someone posted.
for (const column of ["post_type TEXT DEFAULT 'standard'", 'image TEXT']) {
  try {
    db.prepare(`ALTER TABLE posts ADD COLUMN ${column}`).run();
  } catch (error) {
    // Column already exists
  }
}

// Repair: rooms made before post_type passed validation left their post marked 'standard'.
try {
  db.prepare("UPDATE posts SET post_type = 'room' WHERE id IN (SELECT post_id FROM rooms) AND COALESCE(post_type, 'standard') != 'room'").run();
} catch (error) {
  console.error('Error marking room posts:', error.message);
}

// Migration: direct messages remember when they were read, so unread counts survive a reload
try {
  db.prepare('ALTER TABLE direct_messages ADD COLUMN read_at DATETIME').run();
} catch (error) {
  // Column already exists
}

// Migration: Update notifications table to support POST_LIKE type
try {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'").get();
  
  if (tableInfo && !tableInfo.sql.includes('POST_LIKE')) {
    console.log('Migrating notifications table to add POST_LIKE type...');
    
    // Create backup
    db.prepare('CREATE TABLE notifications_backup AS SELECT * FROM notifications').run();
    
    // Drop old table
    db.prepare('DROP TABLE notifications').run();
    
    // Recreate with new constraint
    db.prepare(`CREATE TABLE notifications (
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
    )`).run();
    
    // Restore data
    db.prepare('INSERT INTO notifications SELECT * FROM notifications_backup').run();
    
    // Drop backup
    db.prepare('DROP TABLE notifications_backup').run();
    
    console.log('Notifications table migration completed successfully!');
  }
} catch (error) {
  console.error('Error migrating notifications table:', error.message);
  try {
    const backupExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications_backup'").get();
    if (backupExists) {
      db.prepare('DROP TABLE IF EXISTS notifications').run();
      db.prepare('ALTER TABLE notifications_backup RENAME TO notifications').run();
      console.log('Restored notifications from backup');
    }
  } catch (restoreError) {
    console.error('Error restoring backup:', restoreError.message);
  }
}

// Migration: Add role to room_members table
try {
  db.prepare('ALTER TABLE room_members ADD COLUMN role TEXT DEFAULT "member" CHECK (role IN ("admin","moderator","member"))').run();
  console.log('Added role column to room_members');
} catch (error) {
  // Column already exists
}

// Migration: Add extended fields to rooms table
try {
  db.prepare('ALTER TABLE rooms ADD COLUMN description TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE rooms ADD COLUMN rules TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE rooms ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP').run();
} catch (error) {
  // Column already exists
}

// Update existing room creators to have admin role
try {
  db.prepare(`
    UPDATE room_members 
    SET role = 'admin' 
    WHERE user_id IN (
      SELECT created_by FROM rooms WHERE rooms.id = room_members.room_id
    )
  `).run();
  console.log('Updated room creators to admin role');
} catch (error) {
  console.error('Error updating admin roles:', error.message);
}

// Migration: Add profile enhancements to users table
try {
  db.prepare('ALTER TABLE users ADD COLUMN bio TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN location TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN website TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN github_url TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN linkedin_url TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN twitter_url TEXT').run();
} catch (error) {
  // Column already exists
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN is_profile_public INTEGER DEFAULT 1').run();
} catch (error) {
  // Column already exists
}

// Add points column to users table
try {
  db.prepare('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0').run();
  console.log('Points column added to users table');
} catch (error) {
  if (!error.message.includes('duplicate column')) {
    console.error('Error adding points column:', error.message);
  }
}

const authRoutes = require('./routes/auth_routes');
const postsRoutes = require('./routes/posts_routes');
const roomsRoutes = require('./routes/rooms_routes');
const messagesRoutes = require('./routes/messages_routes');
const tasksRoutes = require('./routes/tasks_routes');
const tagsRoutes = require('./routes/tags_routes');
const friendsRoutes = require('./routes/friends_routes');
const directMessagesRoutes = require('./routes/direct_messages_routes');
const profileRoutes = require('./routes/profile_routes');
const chatbotRoutes = require('./routes/chatbot_routes');
const notificationsRoutes = require('./routes/notifications_routes');

const app = express();

// Behind a hosting proxy the visitor's address is in X-Forwarded-For. Trusting that one hop lets the
// rate limiter tell visitors apart; without it everyone shares the proxy's address and one limit.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

app.use(express.json({ limit: '50mb' }));

for (const folder of ['profiles', 'room-files']) {
  fs.mkdirSync(path.join(uploadDir, folder), { recursive: true });
}

app.use('/uploads', cors(), express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Import rate limiters
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Apply global API rate limiter
app.use('/api/', apiLimiter);

// Apply specific rate limiters to routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/direct-messages', directMessagesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/', (req, res) => res.send('Hello from backend!'));

app.get('/test-db', (req, res) => {
  try {
    const stmt = db.prepare('SELECT 1 as test');
    const row = stmt.get();
    res.json({ ok: true, test: row.test });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
const { notFound, errorHandler } = require('./middleware/errorHandler');
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

const server = http.createServer(app);
initializeSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
