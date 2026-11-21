const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let app;
let author;
let reader;
before(async () => {
  app = await startServer();
  author = await app.signUp('author');
  reader = await app.signUp('reader');
});
after(() => app.stop());

const publish = async (fields = {}) => {
  const { body } = await app.request('POST', '/api/posts', {
    token: author.token,
    body: { title: 'Looking for a study group', description: 'Anyone preparing for the algorithms exam?', ...fields },
  });
  return body.postId;
};

test('a post needs a title and a long enough text', async () => {
  const { status } = await app.request('POST', '/api/posts', {
    token: author.token,
    body: { title: 'Hi', description: 'short' },
  });
  assert.equal(status, 400);
});

test('only the author can edit a post, and an edit changes only what is sent', async () => {
  const postId = await publish();

  const stranger = await app.request('PUT', `/api/posts/${postId}`, { token: reader.token, body: { title: 'Taken over' } });
  assert.equal(stranger.status, 403);

  const edited = await app.request('PUT', `/api/posts/${postId}`, { token: author.token, body: { title: 'Study group, week 2' } });
  assert.equal(edited.status, 200);

  const { body } = await app.request('GET', `/api/posts/${postId}`, { token: reader.token });
  assert.equal(body.title, 'Study group, week 2');
  assert.equal(body.description, 'Anyone preparing for the algorithms exam?');
});

test('only the author can delete a post', async () => {
  const postId = await publish();
  assert.equal((await app.request('DELETE', `/api/posts/${postId}`, { token: reader.token })).status, 403);
  assert.equal((await app.request('DELETE', `/api/posts/${postId}`, { token: author.token })).status, 200);
  assert.equal((await app.request('GET', `/api/posts/${postId}`, { token: author.token })).status, 404);
});

test('likes count once per person', async () => {
  const postId = await publish();
  assert.equal((await app.request('POST', `/api/posts/${postId}/like`, { token: reader.token })).status, 200);
  assert.equal((await app.request('POST', `/api/posts/${postId}/like`, { token: reader.token })).status, 400);

  const { body } = await app.request('GET', `/api/posts/${postId}`, { token: reader.token });
  assert.equal(body.like_count, 1);
});

test('replies can be added and deleted only by their writer', async () => {
  const postId = await publish();
  const added = await app.request('POST', `/api/posts/${postId}/comments`, {
    token: reader.token,
    body: { content: 'Count me in.' },
  });
  assert.equal(added.status, 201);
  const commentId = added.body.id;

  assert.equal((await app.request('DELETE', `/api/posts/comments/${commentId}`, { token: author.token })).status, 403);
  assert.equal((await app.request('DELETE', `/api/posts/comments/${commentId}`, { token: reader.token })).status, 200);
});

test('a post picture is stored as a file, not in the database', async () => {
  // The smallest valid PNG: one transparent pixel.
  const pixel =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const postId = await publish({ image: pixel });
  const { body } = await app.request('GET', `/api/posts/${postId}`, { token: author.token });
  assert.match(body.image, /^uploads\/posts\/.+\.png$/);

  const served = await fetch(`${app.base}/${body.image}`);
  assert.equal(served.status, 200);

  const notAnImage = await app.request('POST', '/api/posts', {
    token: author.token,
    body: { title: 'Bad file', description: 'This is not a picture at all.', image: 'data:text/html;base64,PGgxPg==' },
  });
  assert.equal(notAnImage.status, 400);
});
