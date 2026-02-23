import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/PostCard.css';

const PostCard = ({ 
  post, 
  onLike = null,
  showImage = true,
  compact = false 
}) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    return `${API_URL}/${imagePath}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (username) => {
    return username ? username[0].toUpperCase() : 'U';
  };

  return (
    <article className="post-item">
      <div className="post-top">
        <div className="post-author-info">
          <Link to={`/profile/${post.user_id}`}>
            {post.profile_picture ? (
              <img src={getImageUrl(post.profile_picture)} alt={post.username} className="author-pic" />
            ) : (
              <div className="author-pic">{getInitials(post.username)}</div>
            )}
          </Link>
          <div className="author-details">
            <Link to={`/profile/${post.user_id}`} className="author-name">{post.username}</Link>
            <span className="post-time">{formatDate(post.created_at)}</span>
          </div>
        </div>
      </div>

      {post.title && post.post_type === 'room' && (
        <h3 className="post-heading">{post.title}</h3>
      )}
      
      {!compact && post.description && (
        <p className="post-excerpt">{post.description}</p>
      )}

      {showImage && post.image && (
        <div className="post-image-container">
          <img 
            src={getImageUrl(post.image)} 
            alt={post.title || 'Post'} 
            className="post-image"
          />
        </div>
      )}

      <div className="post-actions">
        <button onClick={() => onLike && onLike(post.id)} className="action-button">
          <span>{post.user_liked ? 'Like' : 'Like'}</span>
          <span>{post.like_count || 0}</span>
        </button>
        <Link to={`/posts/${post.id}`} className="action-button">
          <span>Comments</span>
          <span>{post.comment_count || 0}</span>
        </Link>
        {post.post_type === 'room' && (
          <Link to={`/rooms?postId=${post.id}`} className="action-button">
            Join Room →
          </Link>
        )}
      </div>
    </article>
  );
};

export default PostCard;
