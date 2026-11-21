const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Starts the real server on a free port, with its own empty database and upload folder,
// so every test file runs against a fresh app and leaves nothing behind.
async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-test-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: '0',
      NODE_ENV: 'test',
      DATABASE_URL: path.join(dir, 'test.sqlite'),
      UPLOAD_DIR: path.join(dir, 'uploads'),
      JWT_SECRET: 'test-only-secret',
      // An empty key keeps the assistant on its built-in answers instead of calling the AI service.
      GROQ_API_KEY: '',
      // Values set here win over backend/.env, so a low local limit cannot fail the tests.
      RATE_LIMIT_MAX_REQUESTS: '10000',
      RATE_LIMIT_MESSAGE_MAX: '10000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let errors = '';
  child.stderr.on('data', (chunk) => (errors += chunk));
  const base = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/Backend running on (http:\/\/localhost:\d+)/);
      if (match) resolve(match[1]);
    });
    child.on('exit', (code) => reject(new Error(`Server exited with code ${code}\n${errors}`)));
  });

  const request = async (method, url, { token, body, form } = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: form || (body && JSON.stringify(body)),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  let count = 0;
  // Registers a new person and signs them in. Returns { id, username, token }.
  const signUp = async (name = 'person') => {
    const username = `${name}${++count}`;
    const credentials = { email: `${username}@example.com`, password: 'sunrise1' };
    const created = await request('POST', '/api/auth/register', { body: { username, ...credentials } });
    if (created.status !== 201) throw new Error(`Could not register ${username}: ${JSON.stringify(created.body)}`);
    const { body } = await request('POST', '/api/auth/login', { body: credentials });
    return { id: body.user.id, username, token: body.token };
  };

  // Opens a room the way the app does: a room post first, then the room on it.
  const openRoom = async (owner, name = 'Test room') => {
    const post = await request('POST', '/api/posts', {
      token: owner.token,
      body: { title: name, description: 'A room opened by a test.', post_type: 'room' },
    });
    const room = await request('POST', '/api/rooms', { token: owner.token, body: { postId: post.body.postId, name } });
    return { roomId: room.body.roomId, postId: post.body.postId };
  };

  const stop = async () => {
    // Wait for the exit: on Windows the database file stays locked until then.
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await exited;
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };

  return { base, dir, request, signUp, openRoom, stop };
}

module.exports = { startServer };
