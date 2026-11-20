const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/db');
const { createSchema } = require('./config/schema');
const { allowedOrigins, uploadDir } = require('./config/settings');
const initializeSocket = require('./socket');

createSchema(db);

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

// Big enough for a 5 MB image sent as base64, which is about a third larger.
app.use(express.json({ limit: '8mb' }));

for (const folder of ['profiles', 'posts', 'room-files']) {
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
