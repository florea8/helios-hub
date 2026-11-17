import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { timeAgo } from '../utils/time';

// The replies under one post, oldest first, with a box to add one.
const CommentThread = ({ postId, onCountChange }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState(null); // null while loading
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/posts/${postId}/comments`)
      .then(({ data }) => setComments(data))
      .catch((err) => setError(errorMessage(err, 'Could not load the replies.')));
  }, [postId]);

  const reply = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/api/posts/${postId}/comments`, { content: text.trim() });
      setComments((prev) => [...prev, data]);
      onCountChange(1);
      setText('');
    } catch (err) {
      setError(errorMessage(err, 'Could not post the reply.'));
    }
    setSending(false);
  };

  const remove = async (comment) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await api.delete(`/api/posts/comments/${comment.id}`);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      onCountChange(-1);
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the reply.'));
    }
  };

  return (
    <section className="thread" aria-label="Replies">
      {comments === null && !error && <p className="label thread-quiet">Loading replies…</p>}
      {comments?.length === 0 && <p className="label thread-quiet">No replies yet. Be the first.</p>}
      {comments?.length > 0 && (
        <ol className="thread-list">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Link to={`/profile/${comment.user_id}`}>
                <Avatar user={comment} size={32} />
              </Link>
              <div>
                <p className="label">
                  <Link to={`/profile/${comment.user_id}`}>{comment.username}</Link> · {timeAgo(comment.created_at)}
                  {comment.user_id === user.id && (
                    <>
                      {' · '}
                      <button type="button" onClick={() => remove(comment)}>
                        delete
                      </button>
                    </>
                  )}
                </p>
                <p>{comment.content}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <form className="thread-form" onSubmit={reply}>
        <textarea
          className="field-input"
          aria-label="Your reply"
          placeholder="Write a reply"
          rows={1}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter starts a new line, as in the chats.
            if (e.key === 'Enter' && !e.shiftKey) reply(e);
          }}
        />
        <button type="submit" className="button button-primary" disabled={sending || !text.trim()}>
          Reply
        </button>
      </form>
    </section>
  );
};

export default CommentThread;
