import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from '../components/NotificationPanel';
import '../styles/Profile.css';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const { getTotalUnreadMessages, pendingFriendRequests } = useNotifications();
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || null);
  const [posts, setPosts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // If it's already a complete URL or base64 data
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    // If it's a relative path, prepend the API URL
    return `${API_URL}/${imagePath}`;
  };

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    github_url: user?.github_url || '',
    linkedin_url: user?.linkedin_url || '',
    twitter_url: user?.twitter_url || '',
    is_profile_public: user?.is_profile_public !== undefined ? user.is_profile_public : true,
    experience: user?.experience || '',
    skills: user?.skills || ''
  });
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'rooms'

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await api.get('/api/posts');
      // Filter posts created by current user
      const allPosts = response.data.posts || [];
      const userPosts = allPosts.filter(post => post.user_id === user?.id);
      setPosts(userPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, [user?.id]);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await api.get('/api/rooms');
      // Get all room IDs to check membership
      const allRooms = response.data;
      
      // Filter rooms where user is a member (created_by or check via member_count)
      // We'll need to check each room for membership
      const membershipChecks = await Promise.all(
        allRooms.map(async (room) => {
          try {
            const memberCheck = await api.get(`/api/rooms/${room.id}/check-membership`);
            return { ...room, isMember: memberCheck.data.isMember };
          // eslint-disable-next-line no-unused-vars
          } catch (err) {
            return { ...room, isMember: false };
          }
        })
      );
      
      // Filter only rooms where user is a member
      const userRooms = membershipChecks.filter(room => room.isMember);
      setRooms(userRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchRooms();
      // Update profile form with user data
      setProfileForm({
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        github_url: user.github_url || '',
        linkedin_url: user.linkedin_url || '',
        twitter_url: user.twitter_url || '',
        is_profile_public: user.is_profile_public !== undefined ? user.is_profile_public : true,
        experience: user.experience || '',
        skills: user.skills || ''
      });
    }
  }, [user, fetchPosts, fetchRooms]);

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_picture', file);

    setLoading(true);
    try {
      const response = await api.post('/api/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePicture(response.data.profile_picture);
      updateUser({ ...user, profile_picture: response.data.profile_picture });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await api.put('/api/profile/update', profileForm);
      updateUser({ ...user, ...profileForm });
      setShowProfileForm(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

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
            <Link to="/profile" className="nav-item nav-active">Profile</Link>
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
                  src={getImageUrl(profilePicture) || `https://ui-avatars.com/api/?name=${user?.username}&background=646cff&color=fff&size=150`}
                  alt={user?.username}
                  className="profile-picture"
                  onClick={handleProfilePictureClick}
                  style={{ cursor: 'pointer' }}
                />
                <div className="picture-overlay" onClick={handleProfilePictureClick}>
                  Change Photo
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              <h2 className="profile-username">{user?.username}</h2>
              <p className="profile-email">{user?.email}</p>

              {/* Points Display */}
              <div className="profile-points-section">
                <div className="points-badge">
                  <span className="points-value">{user?.points || 0}</span>
                  <span className="points-label">Points</span>
                </div>
              </div>

              {/* Bio Section */}
              <div className="profile-bio-section">
                {profileForm.bio ? (
                  <p className="profile-bio">{profileForm.bio}</p>
                ) : (
                  <p className="profile-bio-empty">No bio yet</p>
                )}
              </div>

              {/* Social Links */}
              {(profileForm.location || profileForm.website || profileForm.github_url || profileForm.linkedin_url || profileForm.twitter_url) && (
                <div className="social-links">
                  {profileForm.location && (
                    <div className="social-link">
                      <span>{profileForm.location}</span>
                    </div>
                  )}
                  {profileForm.website && (
                    <a href={profileForm.website} target="_blank" rel="noopener noreferrer" className="social-link">
                      Website
                    </a>
                  )}
                  {profileForm.github_url && (
                    <a href={profileForm.github_url} target="_blank" rel="noopener noreferrer" className="social-link">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      GitHub
                    </a>
                  )}
                  {profileForm.linkedin_url && (
                    <a href={profileForm.linkedin_url} target="_blank" rel="noopener noreferrer" className="social-link">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {profileForm.twitter_url && (
                    <a href={profileForm.twitter_url} target="_blank" rel="noopener noreferrer" className="social-link">
                      Twitter
                    </a>
                  )}
                </div>
              )}

              {/* Experience Section */}
              <div className="sidebar-experience-section">
                <h3 className="sidebar-section-title">Experience</h3>
                {profileForm.experience ? (
                  <p className="sidebar-text-content">{profileForm.experience}</p>
                ) : (
                  <p className="profile-bio-empty">No experience added yet</p>
                )}
              </div>

              {/* Skills Section */}
              <div className="sidebar-skills-section">
                <h3 className="sidebar-section-title">Skills</h3>
                {profileForm.skills ? (
                  <p className="sidebar-text-content">{profileForm.skills}</p>
                ) : (
                  <p className="profile-bio-empty">No skills added yet</p>
                )}
              </div>

              {/* Privacy Toggle */}
              <div className="privacy-toggle">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={profileForm.is_profile_public}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setProfileForm({ ...profileForm, is_profile_public: newValue });
                      api.put('/api/profile/update', { ...profileForm, is_profile_public: newValue });
                    }}
                  />
                  <span>{profileForm.is_profile_public ? 'Public Profile' : 'Private Profile'}</span>
                </label>
              </div>

              {/* Edit Profile Button */}
              <button
                className="btn-primary edit-profile-btn"
                onClick={() => setShowProfileForm(!showProfileForm)}
              >
                Edit Profile
              </button>

              {showProfileForm && (
                <div className="form-container profile-edit-form">
                  <textarea
                    placeholder="Bio / About"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="form-textarea"
                    rows="4"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="url"
                    placeholder="Website URL"
                    value={profileForm.website}
                    onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="url"
                    placeholder="GitHub URL"
                    value={profileForm.github_url}
                    onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="url"
                    placeholder="LinkedIn URL"
                    value={profileForm.linkedin_url}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                    className="form-input"
                  />
                  <input
                    type="url"
                    placeholder="Twitter/X URL"
                    value={profileForm.twitter_url}
                    onChange={(e) => setProfileForm({ ...profileForm, twitter_url: e.target.value })}
                    className="form-input"
                  />
                  <textarea
                    placeholder="Experiență (ex: 3 ani dezvoltator web, 2 ani designer UX)"
                    value={profileForm.experience}
                    onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })}
                    className="form-textarea"
                    rows="3"
                  />
                  <textarea
                    placeholder="Abilități (ex: React, Node.js, Python, Design)"
                    value={profileForm.skills}
                    onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                    className="form-textarea"
                    rows="3"
                  />
                  <div className="form-buttons">
                    <button
                      className="btn-primary"
                      onClick={handleUpdateProfile}
                      disabled={loading}
                    >
                      Save Changes
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowProfileForm(false)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
                My Posts
              </button>
              <button
                className={`tab-button ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                My Rooms
              </button>
            </div>

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="tab-content">
                <h3 className="section-subtitle">Your Posts ({posts.length})</h3>
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
                    <p className="empty-message">No posts created yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div className="tab-content">
                <h3 className="section-subtitle">Your Rooms ({rooms.length})</h3>
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
                    <p className="empty-message">Not a member of any room yet</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {error && (
          <div className="error-toast">
            {error}
            <button onClick={() => setError('')} className="toast-close">×</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
