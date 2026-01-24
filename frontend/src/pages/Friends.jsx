import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../hooks/useNotifications';
import '../styles/Friends.css';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, search
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const { user, logout } = useAuth();
  const { getSocket, isUserOnline, sendMessage, connected } = useSocket();
  const { getTotalUnreadMessages, pendingFriendRequests, markMessagesAsRead, decrementFriendRequests, unreadMessages } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [user]);

  // Socket.io listeners for real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (selectedFriend && (message.sender_id === selectedFriend.id || message.receiver_id === selectedFriend.id)) {
        setChatMessages(prev => [...prev, {
          ...message,
          isOwn: message.sender_id === user?.id
        }]);
      }
    };

    const handleMessageSent = (message) => {
      setChatMessages(prev => prev.map(msg => 
        msg.id === 'temp' ? { ...message, isOwn: true } : msg
      ));
    };

    const handleUserOnline = () => {
      fetchFriends();
    };

    const handleUserOffline = () => {
      fetchFriends();
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [getSocket, selectedFriend, user, connected]);

  const fetchFriends = async () => {
    try {
      const res = await api.get('/api/friends/list');
      setFriends(res.data);
    } catch (err) {
      console.error('fetchFriends error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to load friends');
    }
  };

  const fetchPendingRequests = async () => {
    try {
      console.log('Fetching pending requests...');
      const res = await api.get('/api/friends/requests/pending');
      console.log('Pending requests loaded:', res.data);
      setPendingRequests(res.data);
    } catch (err) {
      console.error('fetchPendingRequests error:', err);
      console.error('Error response:', err.response?.data);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      console.log('Searching for:', searchQuery);
      const res = await api.get(`/api/friends/search?query=${encodeURIComponent(searchQuery)}`);
      console.log('Search results:', res.data);
      setSearchResults(res.data);
      setError('');
    } catch (err) {
      console.error('Search error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (friendId) => {
    try {
      console.log('Sending friend request to:', friendId);
      const res = await api.post('/api/friends/request', { friendId });
      console.log('Request sent successfully:', res.data);
      setError('');
      
      // Update search results
      setSearchResults(searchResults.map(user => 
        user.id === friendId ? { ...user, friendship_status: 'request_sent' } : user
      ));
    } catch (err) {
      console.error('Send request error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/api/friends/accept/${requestId}`);
      fetchFriends();
      fetchPendingRequests();
      decrementFriendRequests();
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.delete(`/api/friends/reject/${requestId}`);
      fetchPendingRequests();
      decrementFriendRequests();
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to reject request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;

    try {
      await api.delete(`/api/friends/${friendId}`);
      fetchFriends();
      if (selectedFriend?.id === friendId) {
        setSelectedFriend(null);
        setChatMessages([]);
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to remove friend');
    }
  };

  const getTimeSince = (lastSeen) => {
    if (!lastSeen) return 'Never';
    
    // SQLite stores in UTC without Z, add it if missing
    const isoString = lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z';
    
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

  const isOnline = (friendId) => {
    // Use Socket.io real-time online status
    return isUserOnline(friendId);
  };

  const handleSelectFriend = async (friend) => {
    setSelectedFriend(friend);
    setChatMessages([]);

    // Mark messages from this friend as read
    markMessagesAsRead(friend.id);

    try {
      const res = await api.get(`/api/direct-messages/${friend.id}`);
      const formatted = (res.data || []).map((msg) => ({
        ...msg,
        isOwn: Number(msg.sender_id) === Number(user?.id)
      }));
      setChatMessages(formatted);
      setError('');
    } catch (err) {
      console.error('fetchConversation error:', err);
      setError(err.response?.data?.error || 'Failed to load messages');
    }
  };

  const handleSendMessage = () => {
    if (!selectedFriend || !messageInput.trim()) return;

    // Add message optimistically to UI
    const tempMessage = {
      id: 'temp',
      sender_id: user.id,
      receiver_id: selectedFriend.id,
      content: messageInput,
      created_at: new Date().toISOString(),
      isOwn: true
    };

    setChatMessages(prev => [...prev, tempMessage]);
    
    // Send via Socket.io
    sendMessage(selectedFriend.id, messageInput);
    
    setMessageInput('');
  };

  return (
    <div className="friends-container">
      {/* Atmospheric Background */}
      <div className="friends-atmosphere-bg">
        <div className="friends-gradient-mesh"></div>
        <div className="friends-grid-pattern"></div>
      </div>

      {/* Header */}
      <header className={`friends-header ${scrollY > 50 ? 'friends-header-scrolled' : ''}`}>
        <div className="friends-header-inner">
          <Link to="/" className="friends-brand-logo">
            <svg className="friends-logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#friends-logo-grad)"/>
              <path d="M20 35L15 25H25L20 35Z" fill="url(#friends-logo-grad)"/>
              <circle cx="20" cy="20" r="3" fill="url(#friends-logo-grad)"/>
              <defs>
                <linearGradient id="friends-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff"/>
                  <stop offset="100%" stopColor="#41d1ff"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="friends-brand-name">Helios</span>
          </Link>
          <nav className="friends-nav">
            <Link to="/dashboard" className="friends-nav-item">Dashboard</Link>
            <Link to="/posts" className="friends-nav-item">Posts</Link>
            <Link to="/rooms" className="friends-nav-item">Rooms</Link>
            <Link to="/friends" className="friends-nav-item friends-nav-active">Friends</Link>
            <Link to="/profile" className="friends-nav-item">Profile</Link>
            <Link to="/settings" className="friends-nav-item">Settings</Link>
            <button onClick={logout} className="friends-nav-item friends-nav-logout">Logout</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="friends-main">
        <section className="friends-chat-section">
          <div className="friends-chat-container">
            {/* Friends List Sidebar */}
            <div className="friends-sidebar">
              <div className="friends-sidebar-header">
                <div className="friends-tabs">
                  <button 
                    className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                  >
                    Friends
                    {getTotalUnreadMessages() > 0 && (
                      <span className="notification-badge">{getTotalUnreadMessages()}</span>
                    )}
                  </button>
                  <button 
                    className={`friends-tab ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                  >
                    Requests
                    {pendingFriendRequests > 0 && (
                      <span className="notification-badge">{pendingFriendRequests}</span>
                    )}
                  </button>
                  <button 
                    className={`friends-tab ${activeTab === 'search' ? 'active' : ''}`}
                    onClick={() => setActiveTab('search')}
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="friends-list-scroll">
                {/* Friends Tab */}
                {activeTab === 'friends' && (
                  <>
                    {friends.length === 0 ? (
                      <div className="friends-empty">
                        <p>No friends yet</p>
                      </div>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          className={`friends-list-item ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                          onClick={() => handleSelectFriend(friend)}
                        >
                          <div className="friends-list-avatar">
                            {friend.profile_picture ? (
                              <img src={`http://localhost:5000/${friend.profile_picture}`} alt={friend.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              friend.username[0].toUpperCase()
                            )}
                            {isOnline(friend.id) && <span className="online-dot"></span>}
                          </div>
                          <div className="friends-list-info">
                            <h4>{friend.username}</h4>
                            <p>{isOnline(friend.id) ? 'Online' : getTimeSince(friend.last_seen)}</p>
                          </div>
                          {unreadMessages[friend.id] > 0 && (
                            <span className="notification-badge">{unreadMessages[friend.id]}</span>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                  <>
                    {pendingRequests.length === 0 ? (
                      <div className="friends-empty">
                        <p>No pending requests</p>
                      </div>
                    ) : (
                      pendingRequests.map((request) => (
                        <div key={request.request_id} className="friends-list-item">
                          <div className="friends-list-avatar">
                            {request.profile_picture ? (
                              <img src={`http://localhost:5000/${request.profile_picture}`} alt={request.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              request.username[0].toUpperCase()
                            )}
                          </div>
                          <div className="friends-list-info">
                            <h4>{request.username}</h4>
                            <p>{request.email}</p>
                          </div>
                          <div className="request-actions">
                            <button onClick={() => handleAcceptRequest(request.request_id)} className="accept-btn">✓</button>
                            <button onClick={() => handleRejectRequest(request.request_id)} className="reject-btn">✗</button>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Search Tab */}
                {activeTab === 'search' && (
                  <>
                    <div className="friends-search-box">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="friends-search-input"
                      />
                      <button onClick={handleSearch} className="friends-search-btn">Search</button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="search-results">
                        {searchResults.map((user) => (
                          <div key={user.id} className="friends-list-item">
                            <div className="friends-list-avatar">
                              {user.profile_picture ? (
                                <img src={`http://localhost:5000/${user.profile_picture}`} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              ) : (
                                user.username[0].toUpperCase()
                              )}
                            </div>
                            <div className="friends-list-info">
                              <h4>{user.username}</h4>
                              <p>{user.email}</p>
                            </div>
                            <button onClick={() => handleSendRequest(user.id)} className="add-friend-button">Add</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="friends-chat-area">
              {selectedFriend ? (
                <>
                  <div className="chat-header">
                    <div className="chat-header-info">
                      <h3>{selectedFriend.username}</h3>
                      <p>{isOnline(selectedFriend.id) ? 'Online' : getTimeSince(selectedFriend.last_seen)}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(selectedFriend.id)}
                      className="chat-remove-btn"
                      title="Remove friend"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="chat-messages">
                    {chatMessages.length === 0 ? (
                      <div className="chat-empty">
                        <p>Start a conversation with {selectedFriend.username}</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isOwn = msg.isOwn || Number(msg.sender_id) === Number(user?.id);
                        return (
                        <div
                          key={msg.id}
                          className={`chat-message ${isOwn ? 'own' : 'other'}`}
                        >
                          <p>{msg.content}</p>
                        </div>
                        );
                      })
                    )}
                  </div>

                  <div className="chat-input-area">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="chat-input"
                    />
                    <button onClick={handleSendMessage} className="chat-send-btn">
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div className="chat-select">
                  <div className="select-icon">💬</div>
                  <h3>Select a friend to chat</h3>
                  <p>Choose a friend from the list to start messaging</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tabs for other sections - Hidden by default, can be toggled */}
        {activeTab !== 'friends' && (
          <>
            {/* Pending Requests Tab */}
            {activeTab === 'requests' && (
              <section className="friends-list-section" style={{ marginTop: '2rem' }}>
                <div className="friends-list-container">
                  {pendingRequests.length === 0 ? (
                    <div className="friends-empty-state">
                      <div className="friends-empty-icon">📬</div>
                      <h3>No pending requests</h3>
                    </div>
                  ) : (
                    <div className="friends-grid">
                      {pendingRequests.map((request) => (
                        <div key={request.request_id} className="friends-card">
                          <div className="friends-card-header">
                            <div className="friends-card-avatar">
                              {request.username[0].toUpperCase()}
                            </div>
                            <div className="friends-card-info">
                              <h3 className="friends-card-name">{request.username}</h3>
                              <p className="friends-card-email">{request.email}</p>
                            </div>
                          </div>

                          <div className="friends-card-actions">
                            <button
                              onClick={() => handleAcceptRequest(request.request_id)}
                              className="friends-action-btn friends-action-accept"
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.request_id)}
                              className="friends-action-btn friends-action-reject"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <section className="friends-search-section">
                <div className="friends-search-container">
                  <div className="friends-search-box">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by username or email..."
                      className="friends-search-input"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={loading}
                      className="friends-search-btn"
                    >
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="friends-grid">
                      {searchResults.map((user) => (
                        <div key={user.id} className="friends-card">
                          <div className="friends-card-header">
                            <div className="friends-card-avatar">
                              {user.username[0].toUpperCase()}
                            </div>
                            <div className="friends-card-info">
                              <h3 className="friends-card-name">{user.username}</h3>
                              <p className="friends-card-email">{user.email}</p>
                            </div>
                          </div>

                          <div className="friends-card-actions">
                            {user.friendship_status === 'none' && (
                              <button
                                onClick={() => handleSendRequest(user.id)}
                                className="friends-action-btn friends-action-add"
                              >
                                + Add Friend
                              </button>
                            )}
                            {user.friendship_status === 'request_sent' && (
                              <button disabled className="friends-action-btn friends-action-pending">
                                Request Sent
                              </button>
                            )}
                            {user.friendship_status === 'request_received' && (
                              <button
                                onClick={() => setActiveTab('requests')}
                                className="friends-action-btn friends-action-respond"
                              >
                                Respond to Request
                              </button>
                            )}
                            {user.friendship_status === 'friend' && (
                              <button disabled className="friends-action-btn friends-action-friends">
                                Already Friends
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

