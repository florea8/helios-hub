const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('./helpers');

let app;
let owner;
let member;
let outsider;
before(async () => {
  app = await startServer();
  owner = await app.signUp('owner');
  member = await app.signUp('member');
  outsider = await app.signUp('outsider');
});
after(() => app.stop());

const join = (person, roomId) => app.request('POST', `/api/rooms/${roomId}/join`, { token: person.token });
const say = (person, roomId, content) =>
  app.request('POST', `/api/messages/${roomId}`, { token: person.token, body: { content } });

test('a room can only be opened on your own room post, once', async () => {
  const { roomId, postId } = await app.openRoom(owner);
  assert.ok(roomId);

  // Otherwise deleting the room would delete someone else's post.
  const hijack = await app.request('POST', '/api/rooms', { token: outsider.token, body: { postId, name: 'Not mine' } });
  assert.equal(hijack.status, 403);

  const second = await app.request('POST', '/api/rooms', { token: owner.token, body: { postId, name: 'Second room' } });
  assert.equal(second.status, 400);

  const plain = await app.request('POST', '/api/posts', {
    token: owner.token,
    body: { title: 'Just a post', description: 'This post is not meant to hold a room.' },
  });
  const onPlain = await app.request('POST', '/api/rooms', {
    token: owner.token,
    body: { postId: plain.body.postId, name: 'Wrong post' },
  });
  assert.equal(onPlain.status, 400);
});

test('handing a room over hands over its post too', async () => {
  const { roomId, postId } = await app.openRoom(owner);
  await join(member, roomId);
  const moved = await app.request('POST', `/api/rooms/${roomId}/transfer-ownership`, {
    token: owner.token,
    body: { newOwnerId: member.id },
  });
  assert.equal(moved.status, 200);

  // The old owner can no longer delete the room by deleting its post.
  assert.equal((await app.request('DELETE', `/api/posts/${postId}`, { token: owner.token })).status, 403);
  assert.equal((await app.request('GET', `/api/rooms/${roomId}`)).status, 200);
  assert.equal((await app.request('POST', `/api/rooms/${roomId}/leave`, { token: owner.token })).status, 200);
  assert.equal((await app.request('DELETE', `/api/rooms/${roomId}`, { token: member.token })).status, 200);
});

test('only members can read or write inside a room', async () => {
  const { roomId } = await app.openRoom(owner);
  const token = outsider.token;

  assert.equal((await app.request('GET', `/api/messages/room/${roomId}`, { token })).status, 403);
  assert.equal((await app.request('GET', `/api/rooms/${roomId}/members`, { token })).status, 403);
  assert.equal((await app.request('GET', `/api/tasks/${roomId}`, { token })).status, 403);
  assert.equal((await say(outsider, roomId, 'let me in')).status, 403);
  assert.equal(
    (await app.request('POST', `/api/tasks/${roomId}`, {
      token,
      body: { title: 'Sneaky', start_date: '2026-01-01', end_date: '2026-01-02' },
    })).status,
    403
  );

  await join(member, roomId);
  assert.equal((await say(member, roomId, 'hello')).status, 201);
});

test('the member list does not show emails', async () => {
  const { roomId } = await app.openRoom(owner);
  const { body } = await app.request('GET', `/api/rooms/${roomId}/members`, { token: owner.token });
  assert.ok(body.length > 0);
  assert.ok(body.every((person) => !('email' in person)));
});

test('opening a room returns its newest messages, oldest first', async () => {
  const { roomId } = await app.openRoom(owner);
  for (let i = 1; i <= 55; i++) await say(owner, roomId, `message ${i}`);

  const { body } = await app.request('GET', `/api/messages/room/${roomId}`, { token: owner.token });
  const contents = body.messages.map((message) => message.content);
  assert.equal(contents.length, 50);
  assert.equal(contents[0], 'message 6');
  assert.equal(contents.at(-1), 'message 55');
  assert.equal(body.hasMore, true);
});

test('messages must be 1 to 1000 characters', async () => {
  const { roomId } = await app.openRoom(owner);
  assert.equal((await say(owner, roomId, 'a'.repeat(1000))).status, 201);
  assert.equal((await say(owner, roomId, 'a'.repeat(1001))).status, 400);
  assert.equal((await say(owner, roomId, '')).status, 400);
});

test('the owner cannot leave, a member can', async () => {
  const { roomId } = await app.openRoom(owner);
  await join(member, roomId);

  assert.equal((await app.request('POST', `/api/rooms/${roomId}/leave`, { token: owner.token })).status, 400);
  assert.equal((await app.request('POST', `/api/rooms/${roomId}/leave`, { token: member.token })).status, 200);
  assert.equal((await app.request('GET', `/api/messages/room/${roomId}`, { token: member.token })).status, 403);
});

test('a removed member loses access', async () => {
  const { roomId } = await app.openRoom(owner);
  await join(member, roomId);
  const removed = await app.request('DELETE', `/api/rooms/${roomId}/members/${member.id}`, { token: owner.token });
  assert.equal(removed.status, 200);
  assert.equal((await say(member, roomId, 'still here?')).status, 403);
});

test('only the owner can delete a room, and its post and files go with it', async () => {
  const { roomId, postId } = await app.openRoom(owner);
  await join(member, roomId);

  const form = new FormData();
  form.append('file', new Blob(['meeting notes']), 'notes.txt');
  const sent = await app.request('POST', `/api/messages/${roomId}`, { token: member.token, form });
  assert.equal(sent.status, 201);
  const file = path.join(app.dir, 'uploads', 'room-files', path.basename(sent.body.file_path));
  assert.ok(fs.existsSync(file));

  assert.equal((await app.request('DELETE', `/api/rooms/${roomId}`, { token: member.token })).status, 403);
  assert.equal((await app.request('DELETE', `/api/rooms/${roomId}`, { token: owner.token })).status, 200);

  assert.equal((await app.request('GET', `/api/rooms/${roomId}`)).status, 404);
  assert.equal((await app.request('GET', `/api/posts/${postId}`, { token: owner.token })).status, 404);
  assert.ok(!fs.existsSync(file));
});

test('room files are for the room\'s members only', async () => {
  const { roomId } = await app.openRoom(owner);
  const form = new FormData();
  form.append('file', new Blob(['plan']), 'plan.txt');
  const sent = await app.request('POST', `/api/messages/${roomId}`, { token: owner.token, form });
  const name = path.basename(sent.body.file_path);
  const download = (token) =>
    fetch(`${app.base}/api/messages/download/${name}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  const ok = await download(owner.token);
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), 'plan');
  assert.equal((await download(outsider.token)).status, 403);
  assert.equal((await download()).status, 401);
  // The folder itself is not served, so the stored path is no way around the check.
  assert.equal((await fetch(`${app.base}/${sent.body.file_path}`)).status, 404);
  // An encoded ../ must not reach files outside the room folder.
  const escape = await fetch(`${app.base}/api/messages/download/..%2F..%2Fserver.js`, {
    headers: { Authorization: `Bearer ${owner.token}` },
  });
  assert.equal(escape.status, 404);
});

test('the assistant answers members in English', async () => {
  const { roomId } = await app.openRoom(owner);
  const { status, body } = await app.request('POST', `/api/chatbot/${roomId}`, {
    token: owner.token,
    body: { content: 'help' },
  });
  assert.equal(status, 201);
  assert.equal(body.botMessage.user_id, 0);
  assert.match(body.botMessage.content, /^I can help with/);

  const refused = await app.request('POST', `/api/chatbot/${roomId}`, { token: outsider.token, body: { content: 'help' } });
  assert.equal(refused.status, 403);
});

test('a task cannot be due before it starts', async () => {
  const { roomId } = await app.openRoom(owner);
  const bad = await app.request('POST', `/api/tasks/${roomId}`, {
    token: owner.token,
    body: { title: 'Backwards', start_date: '2026-05-10', end_date: '2026-05-01' },
  });
  assert.equal(bad.status, 400);

  const good = await app.request('POST', `/api/tasks/${roomId}`, {
    token: owner.token,
    body: { title: 'Write the plan', start_date: '2026-05-01', end_date: '2026-05-10' },
  });
  assert.equal(good.status, 200);
});

test('changing a task that is not in the room is a 404, not a crash', async () => {
  const { roomId } = await app.openRoom(owner);
  const { status } = await app.request('PUT', `/api/tasks/${roomId}/999999`, {
    token: owner.token,
    body: { title: 'Ghost', start_date: '2026-05-01', end_date: '2026-05-02', status: 'DONE' },
  });
  assert.equal(status, 404);
});
