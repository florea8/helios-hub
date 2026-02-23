import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from '../components/NotificationPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';
import '../styles/Profile.css';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const { getTotalUnreadMessages, pendingFriendRequests } = useNotifications();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('posts');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    return `${API_URL}/${imagePath}`;
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If user is viewing their own profile, redirect to /profile
  useEffect(() => {
    if (currentUser && userId && parseInt(userId) === currentUser.id) {
      navigate('/profile');
    }
  }, [currentUser, userId, navigate]);

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/profile/${userId}`);
      setUser(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err.response?.data?.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await api.get('/api/posts');
      const userPosts = response.data.filter(post => post.user_id === parseInt(userId));
      setPosts(userPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, [userId]);

  const fetchRooms = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await api.get('/api/rooms');
      const allRooms = response.data;
      
      // Filter rooms where this user is the creator
      const userRooms = allRooms.filter(room => room.created_by === parseInt(userId));
      setRooms(userRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchPosts();
      fetchRooms();
    }
  }, [userId, fetchUserProfile, fetchPosts, fetchRooms]);

  if (loading) {
    return (
      <div className="home-container">
        <div className="atmosphere-bg">
          <div className="gradient-mesh"></div>
          <div className="grid-pattern"></div>
        </div>
        <header className="main-header">
          <div className="header-inner">
            <Link to="/" className="brand-logo">
              <span className="brand-name">Helios</span>
            </Link>
          </div>
        </header>
        <div style={{ padding: '100px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <LoadingSkeleton type="post" count={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="atmosphere-bg">
          <div className="gradient-mesh"></div>
          <div className="grid-pattern"></div>
        </div>
        <header className="main-header">
          <div className="header-inner">
            <Link to="/" className="brand-logo">
              <span className="brand-name">Helios</span>
            </Link>
          </div>
        </header>
        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'white' }}>
          <h2>{error}</h2>
          <Link to="/dashboard" className="btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="home-container">
      <div className="atmosphere-bg">
        <div className="gradient-mesh"></div>
        <div className="grid-pattern"></div>
      </div>

      <header className={`main-header ${scrollY > 50 ? 'header-scrolled' : ''}`}>
        <div className="header-inner">
          <Link to="/" className="brand-logo">
            <svg className="logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#logo-grad)" />
              <path d="M20 35L15 25H25L20 35Z" fill="url(#logo-grad)" />
              <circle cx="20" cy="20" r="3" fill="url(#logo-grad)" />
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff" />
                  <stop offset="100%" stopColor="#41d1ff" />
                </linearGradient>
              </defs>
            </svg>
            <span className="brand-name">Helios</span>
          </Link>
          <nav className="main-nav">
            <Link to="/dashboard" className="nav-item">Dashboard</Link>
            <Link to="/rooms" className="nav-item">Rooms</Link>
            <Link to="/friends" className="nav-item nav-item-with-badge">
              Friends
              {(getTotalUnreadMessages() > 0 || pendingFriendRequests > 0) && (
                <span className="notification-badge">
                  {getTotalUnreadMessages() + pendingFriendRequests}
                </span>
              )}
            </Link>
            <Link to="/profile" className="nav-item">Profile</Link>
            <Link to="/settings" className="nav-item">Settings</Link>
            <NotificationPanel />
            <button onClick={logout} className="nav-item nav-logout">Logout</button>
          </nav>
        </div>
      </header>

      <section className="dashboard-wrapper">
        <div className="dashboard-layout">
          {/* Sidebar */}
          <aside className="sidebar-left">
            <div className="sidebar-section">
              <div className="profile-card">
                <div className="profile-picture-container">
                  <img
                    src={getImageUrl(user.profile_picture) || `https://ui-avatars.com/api/?name=${user.username}&background=646cff&color=fff&size=150`}
                    alt={user.username}
                    className="profile-picture"
                  />
                </div>

                <h2 className="profile-username">{user.username}</h2>
                {!user.is_profile_public && (
                  <p className="profile-email" style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Private Profile</p>
                )}

                {/* Points Display */}
                <div className="profile-points-section">
                  <div className="points-badge">
                    <span className="points-value">{user.points || 0}</span>
                    <span className="points-label">Points</span>
                  </div>
                </div>

                {/* Bio Section */}
                {user.bio && (
                  <div className="profile-bio-section">
                    <p className="profile-bio">{user.bio}</p>
                  </div>
                )}

                {/* Social Links */}
                {(user.location || user.website || user.github_url || user.linkedin_url || user.twitter_url) && (
                  <div className="social-links">
                    {user.location && (
                      <div className="social-link">
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.website && (
                      <a href={user.website} target="_blank" rel="noopener noreferrer" className="social-link">
                        Website
                      </a>
                    )}
                    {user.github_url && (
                      <a href={user.github_url} target="_blank" rel="noopener noreferrer" className="social-link">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                    )}
                    {user.linkedin_url && (
                      <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer" className="social-link">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {user.twitter_url && (
                      <a href={user.twitter_url} target="_blank" rel="noopener noreferrer" className="social-link">
                        Twitter
                      </a>
                    )}
                  </div>
                )}

                {/* Experience Section */}
                {user.experience && (
                  <div className="sidebar-experience-section">
                    <h3 className="sidebar-section-title">Experience</h3>
                    <p className="sidebar-text-content">{user.experience}</p>
                  </div>
                )}

                {/* Skills Section */}
                {user.skills && (
                  <div className="sidebar-skills-section">
                    <h3 className="sidebar-section-title">Skills</h3>
                    <p className="sidebar-text-content">{user.skills}</p>
                  </div>
                )}

                {/* Member Since */}
                <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(100, 108, 255, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <section className="main-content">
            {/* Tab Navigation */}
            <div className="profile-tabs">
              <button
                className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                Posts
              </button>
              <button
                className={`tab-button ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                Rooms Created
              </button>
            </div>

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="tab-content">
                <h3 className="section-subtitle">{user.username}'s Posts ({posts.length})</h3>
                <div className="activity-grid">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <Link to={`/posts/${post.id}`} key={post.id} className="activity-card">
                        <div className="activity-card-header">
                          <h4 className="activity-card-title">{post.title || 'Untitled Post'}</h4>
                          <span className="activity-card-date">
                            {new Date(post.created_at).toLocaleDateString('en-US')}
                          </span>
                        </div>
                        {post.image && (
                          <img 
                            src={getImageUrl(post.image)} 
                            alt={post.title || 'Post image'} 
                            className="activity-card-image"
                            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}
                          />
                        )}
                        <p className="activity-card-content">{post.description?.substring(0, 150)}...</p>
                        <div className="activity-card-meta">
                          <span>{post.like_count || 0} likes</span>
                          <span>{post.comment_count || 0} comments</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="empty-message">No posts yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div className="tab-content">
                <h3 className="section-subtitle">{user.username}'s Rooms ({rooms.length})</h3>
                <div className="activity-grid">
                  {rooms.length > 0 ? (
                    rooms.map((room) => (
                      <Link to="/rooms" key={room.id} className="activity-card">
                        <div className="activity-card-header">
                          <h4 className="activity-card-title">{room.name}</h4>
                          <span className="activity-card-date">
                            {new Date(room.created_at).toLocaleDateString('en-US')}
                          </span>
                        </div>
                        {room.description && (
                          <p className="activity-card-content">{room.description?.substring(0, 150)}...</p>
                        )}
                        <div className="activity-card-meta">
                          <span>{room.member_count || 0} members</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="empty-message">No rooms created yet</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};

export default UserProfile;
