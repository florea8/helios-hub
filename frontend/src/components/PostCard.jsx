import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage, fileUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import Dialog from './Dialog';
import InterestTag from './InterestTag';
import CommentThread from './CommentThread';
import { formatDate } from '../utils/time';
import '../styles/Post.css';

// onChange gets the edited post and onDelete its id, so the list showing the post can update.
const PostCard = ({ post, onLike = null, onChange, onDelete, openReplies = false }) => {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(openReplies);
  const [replies, setReplies] = useState(post.comment_count || 0);
  const [form, setForm] = useState(null); // the edit form, null while closed
  const [error, setError] = useState('');
  const mine = user?.id === post.user_id;

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/posts/${post.id}`, form);
      onChange({ ...post, ...form });
      setForm(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not save the post.'));
    }
  };

  const remove = async () => {
    const warning =
      post.post_type === 'room'
        ? 'Delete this post? Its room goes with it, with every message, file and task.'
        : 'Delete this post?';
    if (!window.confirm(warning)) return;
    try {
      await api.delete(`/api/posts/${post.id}`);
      onDelete(post.id);
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the post.'));
    }
  };

  return (
    <article className="post">
      <Link to={`/profile/${post.user_id}`}>
        <Avatar user={post} size={44} />
      </Link>
      <div>
        <p className="label">
          <Link to={`/profile/${post.user_id}`}>{post.username}</Link> ·{' '}
          <Link to={`/posts/${post.id}`} title="Open this post">
            {formatDate(post.created_at)}
          </Link>
        </p>
        {post.title && <h3>{post.title}</h3>}
        <p>{post.description}</p>
        {post.image && <img src={fileUrl(post.image)} alt="" />}
        {post.tags?.length > 0 && (
          <div className="post-tags">
            {post.tags.map((tag) => (
              <InterestTag key={tag.id} interest={tag} />
            ))}
          </div>
        )}
        <div className="post-actions">
          <button
            type="button"
            className="post-like"
            aria-pressed={Boolean(post.user_liked)}
            onClick={() => onLike?.(post.id)}
          >
            {/* The key replays the pop each time the count changes. */}
            Like <b key={post.like_count}>{post.like_count || 0}</b>
          </button>
          <button
            type="button"
            className="post-like"
            aria-expanded={showReplies}
            onClick={() => setShowReplies(!showReplies)}
          >
            {replies === 1 ? 'Reply' : 'Replies'} <b key={replies}>{replies}</b>
          </button>
          {post.post_type === 'room' && (
            <Link to={`/rooms?postId=${post.id}`} className="link">
              Join room
            </Link>
          )}
          {mine && (
            <span className="post-own">
              <button
                type="button"
                className="link"
                onClick={() => {
                  setError('');
                  setForm({ title: post.title || '', description: post.description });
                }}
              >
                Edit
              </button>
              <button type="button" className="link" onClick={remove}>
                Delete
              </button>
            </span>
          )}
        </div>
        {error && !form && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        {showReplies && <CommentThread postId={post.id} onCountChange={(change) => setReplies((n) => n + change)} />}
      </div>

      <Dialog open={Boolean(form)} title="Edit post" onClose={() => setForm(null)}>
        {form && (
          <form className="form" onSubmit={save}>
            {error && (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            )}
            <label className="field">
              <span className="label">Title</span>
              <input
                className="field-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                minLength={3}
                maxLength={200}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span className="label">Text</span>
              <textarea
                className="field-input"
                rows={6}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                minLength={10}
                maxLength={5000}
                required
              />
            </label>
            <button type="submit" className="button button-primary">
              Save
            </button>
          </form>
        )}
      </Dialog>
    </article>
  );
};

export default PostCard;
