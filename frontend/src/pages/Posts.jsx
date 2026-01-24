import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/Posts.css';

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [postTags, setPostTags] = useState({});
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchPostsAndTags = async () => {
      try {
        setLoading(true);
        const [postsRes, tagsRes] = await Promise.all([
          api.get('/api/posts'),
          api.get('/api/tags')
        ]);
        
        setPosts(postsRes.data);
        setAllTags(tagsRes.data);
        setError('');

        // Fetch tags for each post
        const tagsMap = {};
        for (const post of postsRes.data) {
          try {
            const tagRes = await api.get(`/api/tags/post/${post.id}`);
            tagsMap[post.id] = tagRes.data;
          // eslint-disable-next-line no-unused-vars
          } catch (err) {
            tagsMap[post.id] = [];
          }
        }
        setPostTags(tagsMap);
      } catch (err) {
        console.error(err);
        setError('Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPostsAndTags();
  }, []);

  const handleLike = async (postId, currentlyLiked) => {
    if (!user) return;
    
    try {
      if (currentlyLiked) {
        await api.delete(`/api/posts/${postId}/like`);
      } else {
        await api.post(`/api/posts/${postId}/like`);
      }

      // Update post in state
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            user_liked: currentlyLiked ? 0 : 1,
            like_count: currentlyLiked ? post.like_count - 1 : post.like_count + 1
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setLoading(true);
      const postData = { 
        description, 
        post_type: 'standard',
        image: image 
      };
      
      await api.post('/api/posts', postData);
      setDescription('');
      setImage(null);
      setImagePreview(null);
      setError('');

      // Refresh posts
      const res = await api.get('/api/posts');
      setPosts(res.data);

      // Fetch tags for new posts
      const tagsMap = {};
      for (const post of res.data) {
        try {
          const tagRes = await api.get(`/api/tags/post/${post.id}`);
          tagsMap[post.id] = tagRes.data;
        // eslint-disable-next-line no-unused-vars
        } catch (err) {
          tagsMap[post.id] = [];
        }
      }
      setPostTags(tagsMap);
    } catch (err) {
      console.error(err);
      setError('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result;
      setImage(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const filteredPosts = selectedTagId
    ? posts.filter(post => postTags[post.id]?.some(tag => tag.id === selectedTagId))
    : posts;

  return (
    <div className="posts-container">
      {/* Atmospheric Background */}
      <div className="posts-atmosphere-bg">
        <div className="posts-gradient-mesh"></div>
        <div className="posts-grid-pattern"></div>
      </div>

      {/* Header */}
      <header className={`posts-header ${scrollY > 50 ? 'posts-header-scrolled' : ''}`}>
        <div className="posts-header-inner">
          <Link to="/" className="posts-brand-logo">
            <svg className="posts-logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#posts-logo-grad)"/>
              <path d="M20 35L15 25H25L20 35Z" fill="url(#posts-logo-grad)"/>
              <circle cx="20" cy="20" r="3" fill="url(#posts-logo-grad)"/>
              <defs>
                <linearGradient id="posts-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff"/>
                  <stop offset="100%" stopColor="#41d1ff"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="posts-brand-name">Helios</span>
          </Link>
          <nav className="posts-nav">
            <Link to="/dashboard" className="posts-nav-item">Dashboard</Link>
            <Link to="/posts" className="posts-nav-item posts-nav-active">Posts</Link>
            <Link to="/rooms" className="posts-nav-item">Rooms</Link>
            <Link to="/friends" className="posts-nav-item">Friends</Link>
            <Link to="/profile" className="posts-nav-item">Profile</Link>
            <Link to="/settings" className="posts-nav-item">Settings</Link>
            <button onClick={logout} className="posts-nav-item posts-nav-logout">Logout</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="posts-main">
        {/* Hero Section */}
        <section className="posts-hero-section">
          <div className="posts-hero-content">
            <div className="posts-section-badge">
              <span className="posts-badge-pulse"></span>
              <span>Share Your Ideas</span>
            </div>
            <h1 className="posts-hero-title">
              Community
              <span className="posts-title-gradient"> Posts</span>
            </h1>
            <p className="posts-hero-description">
              Collaborate with your community by sharing ideas, projects, and insights
            </p>
          </div>
        </section>

        {/* Create Post Section */}
        {user && (
          <section className="posts-create-section">
            <div className="posts-create-container">
              <h2 className="posts-section-title">Create New Post</h2>
              
              {error && <div className="posts-error-message">{error}</div>}
              
              <div className="posts-form-group">
                <textarea
                  placeholder="Share your description here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="posts-form-textarea"
                  rows="6"
                  disabled={loading}
                />
              </div>

              {/* Image Upload */}
              <div className="posts-form-group">
                <label className="posts-form-label">Add Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="posts-file-input"
                  disabled={loading}
                />
                {imagePreview && (
                  <div className="posts-image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                      className="posts-remove-image"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreatePost}
                disabled={loading}
                className="posts-create-btn"
              >
                {loading ? 'Creating...' : 'Create Post'}
              </button>
            </div>
          </section>
        )}

        {/* Tags Filter Section */}
        {allTags.length > 0 && (
          <section className="posts-tags-filter-section">
            <div className="posts-filter-container">
              <h3 className="posts-filter-title">Filter by Tags</h3>
              <div className="posts-tags-filter-list">
                <button
                  onClick={() => setSelectedTagId(null)}
                  className={`posts-filter-tag ${!selectedTagId ? 'posts-filter-tag-active' : ''}`}
                >
                  All Posts
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`posts-filter-tag ${selectedTagId === tag.id ? 'posts-filter-tag-active' : ''}`}
                    style={{ 
                      borderColor: selectedTagId === tag.id ? tag.color : 'rgba(100, 108, 255, 0.3)',
                      backgroundColor: selectedTagId === tag.id ? `${tag.color}20` : 'transparent'
                    }}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Posts List Section */}
        <section className="posts-list-section">
          <div className="posts-list-container">
            <h2 className="posts-section-title">
              {filteredPosts.length > 0 
                ? `${selectedTagId ? 'Filtered' : 'All'} Posts (${filteredPosts.length})` 
                : 'No Posts Yet'}
            </h2>

            {loading && !posts.length && (
              <div className="posts-loading">
                <p>Loading posts...</p>
              </div>
            )}

            {filteredPosts.length === 0 && !loading ? (
              <div className="posts-empty-state">
                <div className="posts-empty-icon">📝</div>
                <h3>{selectedTagId ? 'No posts with this tag' : 'No posts yet'}</h3>
                <p>{selectedTagId ? 'Try another tag' : 'Be the first to share something amazing!'}</p>
              </div>
            ) : (
              <div className="posts-grid">
                {filteredPosts.map((post) => (
                  <article key={post.id} className="posts-card">

                    <p className="posts-card-description">{post.description}</p>

                    {/* Image Display */}
                    {post.image && (
                      <div className="posts-card-image">
                        <img src={post.image} alt={post.title} />
                      </div>
                    )}

                    {/* Tags Display */}
                    {postTags[post.id] && postTags[post.id].length > 0 && (
                      <div className="posts-card-tags">
                        {postTags[post.id].map(tag => (
                          <span
                            key={tag.id}
                            className="posts-card-tag"
                            style={{ 
                              backgroundColor: `${tag.color}20`,
                              borderColor: tag.color,
                              color: '#e0e6ff'
                            }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="posts-card-meta">
                      <span className="posts-author">By {post.username}</span>
                      <span className="posts-meta-divider">•</span>
                      <span className="posts-time">
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

                    <div className="posts-card-actions">
                      <button 
                        onClick={() => handleLike(post.id, post.user_liked)}
                        className={`posts-action-btn ${post.user_liked ? 'liked' : ''}`}
                        disabled={!user}
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill={post.user_liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                          <path d="M10 17.5L8.825 16.45C4.7 12.725 2 10.275 2 7.25C2 4.8 3.8 3 6.25 3C7.575 3 8.85 3.6 10 4.55C11.15 3.6 12.425 3 13.75 3C16.2 3 18 4.8 18 7.25C18 10.275 15.3 12.725 11.175 16.45L10 17.5Z" />
                        </svg>
                        <span>{post.like_count || 0}</span>
                      </button>
                      
                      <button className="posts-action-btn">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 10C18 14.4183 14.4183 18 10 18C8.5 18 7.1 17.6 5.9 16.9L2 18L3.1 14.1C2.4 12.9 2 11.5 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" />
                        </svg>
                        <span>{post.comment_count || 0}</span>
                      </button>

                      <Link to={`/posts/${post.id}`} className="posts-card-link">
                        View Details
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
