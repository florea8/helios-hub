import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from '../components/NotificationPanel';
import '../styles/PostDetail.css';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [ratingComment, setRatingComment] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [tagSubmitting, setTagSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setLoading(true);
        const [postRes, tagsRes, ratingsRes, allTagsRes] = await Promise.all([
          api.get(`/api/posts/${id}`),
          api.get(`/api/tags/post/${id}`),
          api.get(`/api/ratings/post/${id}`),
          api.get('/api/tags')
        ]);

        setPost(postRes.data);
        setTags(tagsRes.data);
        setRatings(ratingsRes.data);
        setAllTags(allTagsRes.data);
        setNewStatus(postRes.data.status);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Failed to load post details');
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
  }, [id]);

  const handleStatusChange = async () => {
    if (newStatus === post.status) {
      setError('Status is the same');
      return;
    }

    try {
      setStatusLoading(true);
      await api.put(`/api/posts/${id}`, {
        title: post.title,
        description: post.description,
        status: newStatus
      });

      setPost({ ...post, status: newStatus });
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCreateRating = async () => {
    if (!ratingScore || !ratingComment.trim()) {
      setError('Score and comment required');
      return;
    }

    try {
      setRatingSubmitting(true);
      await api.post('/api/ratings', {
        postId: id,
        ratedUserId: post.user_id,
        score: ratingScore,
        comment: ratingComment
      });

      setRatingComment('');
      setRatingScore(5);
      setShowRatingForm(false);

      // Refresh ratings
      const res = await api.get(`/api/ratings/post/${id}`);
      setRatings(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to create rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleAddTag = async () => {
    if (!selectedTag && !newTagName.trim()) {
      setError('Select or create a tag');
      return;
    }

    try {
      setTagSubmitting(true);
      let tagId = selectedTag;

      // If creating new tag
      if (!selectedTag && newTagName.trim()) {
        const tagRes = await api.post('/api/tags', { name: newTagName });
        tagId = tagRes.data.id;
      }

      await api.post('/api/tags/add-to-post', {
        postId: id,
        tagId: tagId
      });

      // Refresh tags
      const res = await api.get(`/api/tags/post/${id}`);
      setTags(res.data);
      setNewTagName('');
      setSelectedTag('');
      setShowTagForm(false);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to add tag');
    } finally {
      setTagSubmitting(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await api.post('/api/tags/remove-from-post', {
        postId: id,
        tagId: tagId
      });

      // Refresh tags
      const res = await api.get(`/api/tags/post/${id}`);
      setTags(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to remove tag');
    }
  };

  if (loading) {
    return (
      <div className="post-detail-container">
        <div className="post-detail-atmosphere-bg">
          <div className="post-detail-gradient-mesh"></div>
          <div className="post-detail-grid-pattern"></div>
        </div>
        <div className="post-detail-loading">Loading post details...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-container">
        <div className="post-detail-atmosphere-bg">
          <div className="post-detail-gradient-mesh"></div>
          <div className="post-detail-grid-pattern"></div>
        </div>
        <div className="post-detail-error">
          <h2>Post not found</h2>
          <Link to="/dashboard" className="post-detail-back-link">Back to Feed</Link>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === post.user_id;
  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
    : 0;
  const canRate = post.status === 'CLOSED' && user && !isOwner;
  const availableTags = allTags.filter(t => !tags.some(pt => pt.id === t.id));

  return (
    <div className="post-detail-container">
      {/* Atmospheric Background */}
      <div className="post-detail-atmosphere-bg">
        <div className="post-detail-gradient-mesh"></div>
        <div className="post-detail-grid-pattern"></div>
      </div>

      {/* Header */}
      <header className={`post-detail-header ${scrollY > 50 ? 'post-detail-header-scrolled' : ''}`}>
        <div className="post-detail-header-inner">
          <Link to="/" className="post-detail-brand-logo">
            <svg className="post-detail-logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#post-detail-logo-grad)"/>
              <path d="M20 35L15 25H25L20 35Z" fill="url(#post-detail-logo-grad)"/>
              <circle cx="20" cy="20" r="3" fill="url(#post-detail-logo-grad)"/>
              <defs>
                <linearGradient id="post-detail-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff"/>
                  <stop offset="100%" stopColor="#41d1ff"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="post-detail-brand-name">Helios</span>
          </Link>
          <Link to="/dashboard" className="post-detail-back-btn">← Back to Feed</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="post-detail-main">
        <div className="post-detail-wrapper">
          {/* Post Header */}
          <section className="post-detail-header-section">
            <div className="post-detail-title-group">
              <h1 className="post-detail-title">{post.title}</h1>
              <span className={`post-detail-status post-detail-status-${post.status?.toLowerCase() || 'open'}`}>
                {post.status || 'OPEN'}
              </span>
            </div>

            <div className="post-detail-meta">
              <div className="post-detail-meta-item">
                <span className="post-detail-meta-label">Author</span>
                <Link to={`/profile/${post.user_id}`} className="post-detail-meta-value" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                  {post.username}
                </Link>
              </div>
              <div className="post-detail-meta-item">
                <span className="post-detail-meta-label">Created</span>
                <span className="post-detail-meta-value">
                  {post.created_at 
                    ? new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Recently'
                  }
                </span>
              </div>
              {averageRating > 0 && (
                <div className="post-detail-meta-item">
                  <span className="post-detail-meta-label">Rating</span>
                  <span className="post-detail-meta-value post-detail-rating-stars">
                    {'⭐'.repeat(Math.round(averageRating))} ({averageRating})
                  </span>
                </div>
              )}
            </div>

            {/* Tags Section */}
            {(tags.length > 0 || isOwner) && (
              <div className="post-detail-tags-section">
                {tags.length > 0 && (
                  <div className="post-detail-tags">
                    {tags.map(tag => (
                      <div key={tag.id} className="post-detail-tag" style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}>
                        <span className="post-detail-tag-name">#{tag.name}</span>
                        {isOwner && (
                          <button
                            onClick={() => handleRemoveTag(tag.id)}
                            className="post-detail-tag-remove"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isOwner && (
                  <button
                    onClick={() => setShowTagForm(!showTagForm)}
                    className="post-detail-add-tag-btn"
                  >
                    + Add Tag
                  </button>
                )}
              </div>
            )}

            {/* Tag Form */}
            {isOwner && showTagForm && (
              <div className="post-detail-tag-form">
                <div className="post-detail-form-group">
                  {availableTags.length > 0 && (
                    <>
                      <label className="post-detail-form-label">Select Existing Tag</label>
                      <select
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                        className="post-detail-form-select"
                      >
                        <option value="">Choose a tag...</option>
                        {availableTags.map(tag => (
                          <option key={tag.id} value={tag.id}>
                            #{tag.name}
                          </option>
                        ))}
                      </select>
                      <p className="post-detail-form-divider">OR</p>
                    </>
                  )}

                  <label className="post-detail-form-label">Create New Tag</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., bug-fix, feature, urgent"
                    className="post-detail-form-input"
                  />
                </div>

                <div className="post-detail-form-actions">
                  <button
                    onClick={handleAddTag}
                    disabled={tagSubmitting || (!selectedTag && !newTagName.trim())}
                    className="post-detail-submit-btn"
                  >
                    {tagSubmitting ? 'Adding...' : 'Add Tag'}
                  </button>
                  <button
                    onClick={() => setShowTagForm(false)}
                    className="post-detail-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Description */}
          <section className="post-detail-content-section">
            <h2 className="post-detail-section-title">Description</h2>
            <p className="post-detail-description">{post.description}</p>
          </section>

          {/* Status Management (Owner Only) */}
          {isOwner && (
            <section className="post-detail-status-section">
              <h2 className="post-detail-section-title">Manage Status</h2>
              <div className="post-detail-status-control">
                <select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="post-detail-status-select"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
                <button
                  onClick={handleStatusChange}
                  disabled={statusLoading || newStatus === post.status}
                  className="post-detail-status-btn"
                >
                  {statusLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </section>
          )}

          {/* Ratings Section */}
          <section className="post-detail-ratings-section">
            <div className="post-detail-ratings-header">
              <h2 className="post-detail-section-title">Ratings & Feedback</h2>
              {ratings.length > 0 && (
                <div className="post-detail-rating-summary">
                  <span className="post-detail-rating-avg">{averageRating}</span>
                  <span className="post-detail-rating-count">({ratings.length} reviews)</span>
                </div>
              )}
            </div>

            {ratings.length === 0 ? (
              <div className="post-detail-no-ratings">
                <p>No ratings yet</p>
              </div>
            ) : (
              <div className="post-detail-ratings-list">
                {ratings.map((rating) => (
                  <div key={rating.id} className="post-detail-rating-card">
                    <div className="post-detail-rating-top">
                      <Link to={`/profile/${rating.rated_user_id}`} className="post-detail-rating-author" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                        {rating.rated_username}
                      </Link>
                      <div className="post-detail-rating-score">
                        {'⭐'.repeat(rating.score)} ({rating.score}/5)
                      </div>
                    </div>
                    <p className="post-detail-rating-comment">{rating.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Rating Form - Only for CLOSED posts, non-owners */}
            {canRate && (
              <div className="post-detail-rating-form-container">
                {!showRatingForm ? (
                  <button 
                    onClick={() => setShowRatingForm(true)}
                    className="post-detail-add-rating-btn"
                  >
                    + Add Your Rating
                  </button>
                ) : (
                  <div className="post-detail-rating-form">
                    <div className="post-detail-form-group">
                      <label className="post-detail-form-label">Score</label>
                      <select
                        value={ratingScore}
                        onChange={(e) => setRatingScore(Number(e.target.value))}
                        className="post-detail-form-select"
                      >
                        <option value={1}>1 - Poor</option>
                        <option value={2}>2 - Fair</option>
                        <option value={3}>3 - Good</option>
                        <option value={4}>4 - Very Good</option>
                        <option value={5}>5 - Excellent</option>
                      </select>
                    </div>

                    <div className="post-detail-form-group">
                      <label className="post-detail-form-label">Comment</label>
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Share your feedback..."
                        className="post-detail-form-textarea"
                        rows="4"
                      />
                    </div>

                    <div className="post-detail-form-actions">
                      <button
                        onClick={handleCreateRating}
                        disabled={ratingSubmitting}
                        className="post-detail-submit-btn"
                      >
                        {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                      </button>
                      <button
                        onClick={() => setShowRatingForm(false)}
                        className="post-detail-cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Error Message */}
          {error && (
            <div className="post-detail-error-banner">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <section className="post-detail-actions-section">
            {isOwner && (
              <>
                <button className="post-detail-action-btn post-detail-action-edit">
                  Edit Post
                </button>
                <button className="post-detail-action-btn post-detail-action-delete">
                  Delete Post
                </button>
              </>
            )}
            <Link to={`/posts`} className="post-detail-action-btn post-detail-action-back">
              ← Back to Posts
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
