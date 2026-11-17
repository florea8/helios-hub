import { Link } from 'react-router-dom';
import { fileUrl } from '../services/api';
import Avatar from './Avatar';
import InterestTag from './InterestTag';
import { formatDate } from '../utils/time';
import '../styles/Post.css';

const PostCard = ({ post, onLike = null }) => (
  <article className="post">
    <Link to={`/profile/${post.user_id}`}>
      <Avatar user={post} size={44} />
    </Link>
    <div>
      <p className="label">
        <Link to={`/profile/${post.user_id}`}>{post.username}</Link> · {formatDate(post.created_at)}
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
        <span className="label">{post.comment_count || 0} replies</span>
        {post.post_type === 'room' && (
          <Link to={`/rooms?postId=${post.id}`} className="link">
            Join room
          </Link>
        )}
      </div>
    </div>
  </article>
);

export default PostCard;
