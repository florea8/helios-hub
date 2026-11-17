# Helios

[![CI](https://github.com/florea8/helios-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/florea8/helios-hub/actions/workflows/ci.yml)

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

- Node.js ≥ 20.19
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

## Deployment

The frontend is a static site and runs on Vercel. The backend keeps live Socket.IO connections, a SQLite file and uploaded files on disk, so it needs a long-running server with a persistent volume; it runs on Railway.

### Backend on Railway

1. Create a project from this GitHub repository and set the service's **root directory** to `backend`. Railway runs `npm start`.
2. Add a **volume** mounted at `/data`. The database and uploads live there, so they survive redeploys.
3. Set the variables:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | a long random string, e.g. from `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `DATABASE_URL` | `/data/helios.sqlite` |
   | `UPLOAD_DIR` | `/data/uploads` |
   | `CORS_ORIGINS` | the frontend's address, e.g. `https://helios.vercel.app` |
   | `GROQ_API_KEY` | optional, for the room assistant |

   Railway provides `PORT`.
4. Generate a public domain for the service. `/test-db` answers `{"ok":true}` when the server is up.

### Frontend on Vercel

1. Import the repository and set the **root directory** to `frontend`. Vercel detects Vite.
2. Set `VITE_API_URL` to the backend's Railway address, e.g. `https://helios-api.up.railway.app`.
3. Deploy. `frontend/vercel.json` sends every route to the app, so links like `/profile` work on reload.
4. Put the Vercel address in the backend's `CORS_ORIGINS`.

Pushes to `main` redeploy both. A new deployment starts with an empty database.

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
