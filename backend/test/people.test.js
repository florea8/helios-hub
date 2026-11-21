// Friends, direct messages and profiles.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let app;
before(async () => (app = await startServer()));
after(() => app.stop());

// Sends a friend request from one person and accepts it as the other.
const befriend = async (from, to) => {
  await app.request('POST', '/api/friends/request', { token: from.token, body: { friendId: to.id } });
  const { body } = await app.request('GET', '/api/friends/requests/pending', { token: to.token });
  const request = body.find((item) => item.user_id === from.id);
  return app.request('POST', `/api/friends/accept/${request.request_id}`, { token: to.token });
};

test('nobody can send a friend request to themselves, even with the id as text', async () => {
  const me = await app.signUp('self');
  for (const friendId of [me.id, String(me.id)]) {
    const { status } = await app.request('POST', '/api/friends/request', { token: me.token, body: { friendId } });
    assert.equal(status, 400);
  }
});

test('a friend request can be accepted once', async () => {
  const ana = await app.signUp('ana');
  const ben = await app.signUp('ben');
  assert.equal((await befriend(ana, ben)).status, 200);

  const again = await app.request('POST', '/api/friends/request', { token: ben.token, body: { friendId: ana.id } });
  assert.equal(again.status, 400);

  const { body } = await app.request('GET', '/api/friends/list', { token: ana.token });
  assert.deepEqual(body.map((friend) => friend.id), [ben.id]);
});

test('direct messages are only between friends', async () => {
  const ana = await app.signUp('ana');
  const ben = await app.signUp('ben');
  const url = `/api/direct-messages/${ben.id}`;

  assert.equal((await app.request('GET', url, { token: ana.token })).status, 403);
  await befriend(ana, ben);
  assert.equal((await app.request('GET', url, { token: ana.token })).status, 200);
});

test('search finds people by name, never the assistant and never by email', async () => {
  const me = await app.signUp('searcher');
  const target = await app.signUp('findme');

  const byName = await app.request('GET', '/api/friends/search?query=findme', { token: me.token });
  assert.deepEqual(byName.body.map((person) => person.id), [target.id]);

  const byEmail = await app.request('GET', '/api/friends/search?query=example.com', { token: me.token });
  assert.equal(byEmail.body.length, 0);

  const assistant = await app.request('GET', '/api/friends/search?query=assistant', { token: me.token });
  assert.equal(assistant.body.length, 0);
});

test('profile links must be web addresses', async () => {
  const me = await app.signUp('links');
  const save = (fields) => app.request('PUT', '/api/profile/update', { token: me.token, body: { bio: 'Hi', ...fields } });

  assert.equal((await save({ website: 'https://example.com' })).status, 200);
  assert.equal((await save({ website: 'javascript:alert(1)' })).status, 400);
  assert.equal((await save({ github_url: 'my github' })).status, 400);
  assert.equal((await save({ bio: 'x'.repeat(301) })).status, 400);
});

test('a private profile is hidden, and nobody else sees your email', async () => {
  const owner = await app.signUp('private');
  const visitor = await app.signUp('visitor');
  const url = `/api/profile/${owner.id}`;

  const shown = await app.request('GET', url, { token: visitor.token });
  assert.equal(shown.status, 200);
  assert.ok(!('email' in shown.body));
  assert.ok('email' in (await app.request('GET', url, { token: owner.token })).body);

  await app.request('PUT', '/api/profile/update', { token: owner.token, body: { is_profile_public: false } });
  assert.equal((await app.request('GET', url, { token: visitor.token })).status, 403);
  assert.equal((await app.request('GET', url, { token: owner.token })).status, 200);
});
