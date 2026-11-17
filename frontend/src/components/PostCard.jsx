import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fileUrl } from '../services/api';
import Avatar from './Avatar';
import InterestTag from './InterestTag';
import CommentThread from './CommentThread';
import { formatDate } from '../utils/time';
import '../styles/Post.css';

const PostCard = ({ post, onLike = null, openReplies = false }) => {
  const [showReplies, setShowReplies] = useState(openReplies);
  const [replies, setReplies] = useState(post.comment_count || 0);

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
        </div>
        {showReplies && <CommentThread postId={post.id} onCountChange={(change) => setReplies((n) => n + change)} />}
      </div>
    </article>
  );
};

export default PostCard;
