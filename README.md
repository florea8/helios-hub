# Helios

A collaborative platform for students — featuring real-time messaging, study rooms, posts, task management, a friend system, and an AI-powered chatbot.

## Tech Stack

**Backend**
- Node.js + Express 5
- SQLite (better-sqlite3)
- Socket.IO — real-time events
- JWT authentication
- Multer — file uploads
- express-rate-limit — rate limiting

**Frontend**
- React 19 + Vite
- React Router v7
- Socket.IO client
- Axios

## Features

- Authentication (register, login, JWT)
- User profiles with avatar upload
- Posts with tags and likes
- Study rooms with real-time chat and file sharing
- Direct messages
- Friend requests
- Task management with deadline tracking
- Notification system
- AI chatbot (Groq)
- Light / dark theme

## Project Structure

```
helios/
├── backend/          # Express API + Socket.IO server
│   ├── config/       # Database connection
│   ├── controllers/  # Route handlers
│   ├── middleware/   # Auth, validation, rate limiting, error handling
│   ├── routes/       # API routes
│   ├── socket/       # Real-time event handlers
│   ├── uploads/      # User-uploaded files (gitignored)
│   └── utils/        # Deadline checker, logger
└── frontend/         # React SPA
    └── src/
        ├── components/
        ├── context/
        ├── hooks/
        ├── pages/
        ├── services/
        └── styles/
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Install all dependencies (root + backend + frontend)
npm run install:all
```

### Environment Variables

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key variables in `backend/.env`:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `5000`) |
| `DATABASE_URL` | SQLite file path |
| `JWT_SECRET` | Secret key for JWT signing |
| `GROQ_API_KEY` | Groq API key for the chatbot |
| `CORS_ORIGINS` | Comma-separated CORS allowed origins (default `http://localhost:5173`) |

### Running in Development

```bash
npm run dev
```

This starts both the backend (port 5000) and frontend (port 5173) concurrently.

### Building for Production

```bash
npm run build
```

The compiled frontend assets will be in `frontend/dist/`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend in watch mode |
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |
| `npm run build` | Build frontend for production |
| `npm run install:all` | Install all dependencies |
| `npm run format` | Format code with Prettier |

## License

MIT
