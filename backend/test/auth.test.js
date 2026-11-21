const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let app;
before(async () => (app = await startServer()));
after(() => app.stop());

test('a new account can sign in and load its profile', async () => {
  const person = await app.signUp('ana');
  const { status, body } = await app.request('GET', '/api/auth/profile', { token: person.token });
  assert.equal(status, 200);
  assert.equal(body.username, person.username);
});

test('the same email cannot register twice', async () => {
  const body = { username: 'twice1', email: 'twice@example.com', password: 'sunrise1' };
  assert.equal((await app.request('POST', '/api/auth/register', { body })).status, 201);
  const again = await app.request('POST', '/api/auth/register', { body: { ...body, username: 'twice2' } });
  assert.equal(again.status, 409);
});

test('a wrong password is refused', async () => {
  const person = await app.signUp('wrong');
  const { status } = await app.request('POST', '/api/auth/login', {
    body: { email: `${person.username}@example.com`, password: 'not-the-password' },
  });
  assert.equal(status, 401);
});

test('registration checks its input', async () => {
  const { status } = await app.request('POST', '/api/auth/register', {
    body: { username: 'has spaces', email: 'not-an-email', password: '123' },
  });
  assert.equal(status, 400);
});

test('signed-in routes need a valid token', async () => {
  assert.equal((await app.request('GET', '/api/posts')).status, 401);
  assert.equal((await app.request('GET', '/api/posts', { token: 'forged.token.value' })).status, 401);
});
