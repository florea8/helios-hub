import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../hooks/useNotifications';
import '../styles/Home.css';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [scrollY, setScrollY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { getSocket, isUserOnline, sendMessage, connected } = useSocket();
  const { getTotalUnreadMessages, pendingFriendRequests, markMessagesAsRead } = useNotifications();

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get('/api/posts');
      setPosts(res.data || []);
      setFilteredPosts(res.data || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
      setFilteredPosts([]);
    }
  }, []);

  const handleSearchPosts = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredPosts(posts);
    } else {
      const lowerQuery = query.toLowerCase();
      const filtered = posts.filter((post) =>
        post.title?.toLowerCase().includes(lowerQuery) ||
        post.description?.toLowerCase().includes(lowerQuery) ||
        post.username?.toLowerCase().includes(lowerQuery)
      );
      setFilteredPosts(filtered);
    }
  };

  const fetchFriends = useCallback(async () => {
    try {
      const res = await api.get('/api/friends/list');
      setFriends(res.data || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setFriends([]);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/api/rooms');
      // Show all rooms for now - could filter by membership later
      setRooms(res.data || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const loadData = async () => {
      await fetchPosts();
      await fetchFriends();
      await fetchRooms();
    };
    loadData();
  }, [user, navigate, fetchPosts, fetchFriends, fetchRooms]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (selectedFriend && (message.sender_id === selectedFriend.id || message.receiver_id === selectedFriend.id)) {
        setChatMessages((prev) => [
          ...prev,
          {
            ...message,
            isOwn: message.sender_id === user?.id,
          },
        ]);
      }
    };

    const handleMessageSent = (message) => {
      setChatMessages((prev) => prev.map((msg) => (msg.id === 'temp' ? { ...message, isOwn: true } : msg)));
    };

    const handlePresenceChange = () => {
      fetchFriends();
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_online', handlePresenceChange);
    socket.on('user_offline', handlePresenceChange);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_online', handlePresenceChange);
      socket.off('user_offline', handlePresenceChange);
    };
  }, [getSocket, selectedFriend, user, connected, fetchFriends]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isOnline = (friendId) => isUserOnline(friendId);

  const getTimeSince = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const isoString = lastSeen.endsWith('Z') ? lastSeen : `${lastSeen}Z`;
    const now = new Date();
    const seen = new Date(isoString);
    const diffMs = now - seen;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 2) return 'Online';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return seen.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleOpenChat = async (friend) => {
    setSelectedFriend(friend);
    setChatMessages([]);
    markMessagesAsRead(friend.id);
    try {
      const res = await api.get(`/api/direct-messages/${friend.id}`);
      const formatted = (res.data || []).map((msg) => ({
        ...msg,
        isOwn: Number(msg.sender_id) === Number(user?.id),
      }));
      setChatMessages(formatted);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = () => {
    if (!selectedFriend || !messageInput.trim()) return;
    const tempMessage = {
      id: 'temp',
      sender_id: user.id,
      receiver_id: selectedFriend.id,
      content: messageInput,
      created_at: new Date().toISOString(),
      isOwn: true,
    };
    setChatMessages((prev) => [...prev, tempMessage]);
    sendMessage(selectedFriend.id, messageInput);
    setMessageInput('');
  };

  const onlineCount = friends.filter((f) => isOnline(f.id)).length;

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
            {user ? (
              <>
                <Link to="/dashboard" className="nav-item nav-active">Dashboard</Link>
                <Link to="/posts" className="nav-item">Posts</Link>
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
                <button onClick={logout} className="nav-item nav-logout">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-item">Login</Link>
                <Link to="/register" className="nav-cta">Get Started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="dashboard-wrapper">
        <div className="dashboard-layout">
          <aside className="sidebar-left">
            <div className="sidebar-section">
              <div className="user-profile-card">
                <div className="user-avatar-large">
                  {user?.profile_picture ? (
                    <img src={`http://localhost:5000/${user.profile_picture}`} alt={user?.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    user?.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <h4 className="user-name">{user?.username || 'User'}</h4>
                <p className="user-email">{user?.email || ''}</p>
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-heading">Quick Actions</h3>
              <nav className="quick-nav">
                <Link to="/posts" className="quick-link">
                  <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>New Post</span>
                </Link>
                <Link to="/rooms" className="quick-link">
                  <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Join Room</span>
                </Link>
                <Link to="/settings" className="quick-link">
                  <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 1v6m0 6v6M6 12H1m6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20.5 7.5l-4.24 4.24M8.74 12.76L4.5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Settings</span>
                </Link>
              </nav>
            </div>

            <div className="sidebar-section">
              <h4 className="sidebar-subheading">Recent Activity</h4>
              <div className="activity-feed">
                <div className="activity-row">
                  <span className="activity-indicator"></span>
                  <span>Welcome to Helios!</span>
                </div>
                <div className="activity-row">
                  <span className="activity-indicator"></span>
                  <span>Start by creating your first post</span>
                </div>
                <div className="activity-row">
                  <span className="activity-indicator"></span>
                  <span>Connect with friends</span>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="community-top">
                <h3 className="sidebar-heading">My Rooms</h3>
                <Link to="/rooms" className="view-link-small">
                  View All
                </Link>
              </div>
              <div className="rooms-container-dashboard">
                {rooms.length === 0 ? (
                  <div className="empty-rooms-dashboard">
                    <div className="empty-icon-wrapper-small">
                      <svg className="empty-svg-small" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="7" height="7" stroke="url(#rooms-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="14" y="3" width="7" height="7" stroke="url(#rooms-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="14" y="14" width="7" height="7" stroke="url(#rooms-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="3" y="14" width="7" height="7" stroke="url(#rooms-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                          <linearGradient id="rooms-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#646cff" />
                            <stop offset="100%" stopColor="#41d1ff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <p>No rooms yet</p>
                    <span>Create or join a room</span>
                  </div>
                ) : (
                  <div className="rooms-list-dashboard">
                    {rooms.slice(0, 5).map((room) => (
                      <Link key={room.id} to={`/rooms`} className="room-item-dashboard">
                        <div className="room-icon-dashboard">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                          </svg>
                        </div>
                        <div className="room-info-dashboard">
                          <span className="room-name-dashboard">{room.name}</span>
                          <span className="room-members-dashboard">{room.member_count} members</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="content-main">
            <div className="content-top">
              <h2>Recent Posts</h2>
              <Link to="/posts" className="view-link">
                View All
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" />
                </svg>
              </Link>
            </div>

            <div className="posts-search-section">
              <input
                type="text"
                placeholder="Search posts by title, content, or author..."
                value={searchQuery}
                onChange={(e) => handleSearchPosts(e.target.value)}
                className="posts-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchPosts('')}
                  className="posts-search-clear"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            <div className="posts-layout">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post, index) => (
                  <article key={post.id} className={`post-item ${post.post_type === 'room' ? 'post-item-room' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="post-top">
                      <div className="post-author-info">
                        <div className="author-pic">
                          {post.profile_picture ? (
                            <img src={`http://localhost:5000/${post.profile_picture}`} alt={post.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            post.username?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="author-details">
                          <span className="author-name">{post.username || 'Unknown'}</span>
                          <span className="post-time">
                            {new Date(post.created_at).toLocaleDateString('ro-RO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      {post.post_type === 'room' && (
                        <span className="room-badge-dashboard">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                            <rect x="3" y="3" width="6" height="6" rx="1" />
                            <rect x="11" y="3" width="6" height="6" rx="1" />
                            <rect x="3" y="11" width="6" height="6" rx="1" />
                            <rect x="11" y="11" width="6" height="6" rx="1" />
                          </svg>
                          Room
                        </span>
                      )}
                    </div>
                    
                    {/* Show title only for room posts */}
                    {post.post_type === 'room' && <h3 className="post-heading">{post.title}</h3>}
                    
                    <p className="post-excerpt">{post.description}</p>
                    
                    {/* Display image below description - like Instagram/Facebook */}
                    {post.image && post.post_type !== 'room' && (
                      <div className="post-image-container">
                        <img src={post.image} alt="Post" className="post-image" />
                      </div>
                    )}

                    <div className="post-actions">
                      {post.post_type === 'room' ? (
                        <Link to={`/rooms?postId=${post.id}`} className="join-room-button">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 10v7H5v-7M10 3v11M6 7l4-4 4 4" />
                          </svg>
                          Join Room
                        </Link>
                      ) : (
                        <>
                          <button className="action-button">
                            <svg className="action-icon" viewBox="0 0 24 24" fill="none">
                              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>{post.like_count || 0}</span>
                          </button>
                          <button className="action-button">
                            <svg className="action-icon" viewBox="0 0 24 24" fill="none">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>{post.comment_count || 0}</span>
                          </button>
                          <button className="action-button">
                            <svg className="action-icon" viewBox="0 0 24 24" fill="none">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-placeholder">
                  <div className="empty-icon-wrapper">
                    <svg className="empty-svg" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#empty-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="14,2 14,8 20,8" stroke="url(#empty-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="16" y1="13" x2="8" y2="13" stroke="url(#empty-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="16" y1="17" x2="8" y2="17" stroke="url(#empty-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="10,9 9,9 8,9" stroke="url(#empty-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="empty-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#646cff" />
                          <stop offset="100%" stopColor="#41d1ff" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <h3>{searchQuery ? 'No posts found' : 'No posts yet'}</h3>
                  <p>{searchQuery ? 'Try different keywords' : 'Be the first to share something amazing!'}</p>
                  {!searchQuery && (
                    <Link to="/posts" className="btn-primary">
                      <span>Create Post</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </main>

          <aside className="sidebar-right">
            <div className="sidebar-section">
              <div className="community-top">
                <h3 className="sidebar-heading">Friends</h3>
                <span className="online-status">
                  <span className="status-dot"></span>
                  {onlineCount} online
                </span>
              </div>
              <div className="friends-container">
                {friends.length === 0 ? (
                  <div className="empty-friends">
                    <div className="empty-icon-wrapper-small">
                      <svg className="empty-svg-small" viewBox="0 0 24 24" fill="none">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="url(#friends-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="9" cy="7" r="4" stroke="url(#friends-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="url(#friends-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                          <linearGradient id="friends-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#646cff" />
                            <stop offset="100%" stopColor="#41d1ff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <p>No friends yet</p>
                    <span>Connect with people to see them here</span>
                  </div>
                ) : (
                  <div className="friends-list-home">
                    {friends.map((friend) => (
                      <div key={friend.id} className="friend-item-home" onClick={() => handleOpenChat(friend)}>
                        <div className="friend-avatar-home">
                          {friend.profile_picture ? (
                            <img src={`http://localhost:5000/${friend.profile_picture}`} alt={friend.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            friend.username[0].toUpperCase()
                          )}
                          {isOnline(friend.id) && <span className="online-indicator"></span>}
                        </div>
                        <div className="friend-info-home">
                          <span className="friend-name-home">{friend.username}</span>
                          <span className="friend-status-home">{isOnline(friend.id) ? 'Online' : getTimeSince(friend.last_seen)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {selectedFriend && (
        <div className="mini-chat-popup">
          <div className="mini-chat-header">
            <div className="mini-chat-title">
              <div className="mini-avatar">
                {selectedFriend.profile_picture ? (
                  <img src={`http://localhost:5000/${selectedFriend.profile_picture}`} alt={selectedFriend.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  selectedFriend.username[0].toUpperCase()
                )}
              </div>
              <span>{selectedFriend.username}</span>
            </div>
            <button onClick={() => setSelectedFriend(null)} className="mini-close-btn">✕</button>
          </div>
          <div className="mini-chat-messages">
            {chatMessages.length === 0 ? (
              <div className="mini-chat-empty">
                <p>Start a conversation with {selectedFriend.username}</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isOwn = msg.isOwn || Number(msg.sender_id) === Number(user?.id);
                return (
                  <div key={msg.id} className={`mini-message ${isOwn ? 'own' : 'other'}`}>
                    <p>{msg.content}</p>
                  </div>
                );
              })
            )}
          </div>
          <div className="mini-chat-input">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
