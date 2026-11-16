import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../hooks/useNotifications';
import Layout from '../components/Layout';
import UserListItem from '../components/UserListItem';
import ChatWindow from '../components/ChatWindow';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import '../styles/Friends.css';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const { user } = useAuth();
  const { getSocket, isUserOnline, sendMessage, connected } = useSocket();
  const { getTotalUnreadMessages, pendingFriendRequests, markMessagesAsRead, decrementFriendRequests, unreadMessages } = useNotifications();

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [user]);

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
      setLoading(true);
      const res = await api.get('/api/friends/list');
      setFriends(res.data);
    } catch (err) {
      console.error('fetchFriends error:', err);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/api/friends/requests/pending');
      setPendingRequests(res.data);
    } catch (err) {
      console.error('fetchPendingRequests error:', err);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/api/friends/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
      setError('');
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (friendId) => {
    try {
      await api.post('/api/friends/request', { friendId });
      setError('');
      setSearchResults(searchResults.map(user => 
        user.id === friendId ? { ...user, friendship_status: 'request_sent' } : user
      ));
    } catch (err) {
      console.error('Send request error:', err);
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
      console.error('Accept request error:', err);
      setError(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.delete(`/api/friends/reject/${requestId}`);
      fetchPendingRequests();
      decrementFriendRequests();
      setError('');
    } catch (err) {
      console.error('Reject request error:', err);
      setError(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await api.delete(`/api/friends/${friendId}`);
      fetchFriends();
      setSelectedFriend(null);
      setError('');
    } catch (err) {
      console.error('Remove friend error:', err);
      setError(err.response?.data?.error || 'Failed to remove friend');
    }
  };

  const handleSelectFriend = async (friend) => {
    setSelectedFriend(friend);
    try {
      const res = await api.get(`/api/direct-messages/${friend.id}`);
      const messages = res.data.map(msg => ({
        ...msg,
        isOwn: Number(msg.sender_id) === Number(user?.id)
      }));
      setChatMessages(messages);
      markMessagesAsRead(friend.id);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setChatMessages([]);
    }
  };

  const handleSendMessage = (content) => {
    if (!content.trim() || !selectedFriend) return;
    
    const tempMessage = {
      id: 'temp',
      sender_id: user?.id,
      receiver_id: selectedFriend.id,
      content,
      created_at: new Date().toISOString(),
      isOwn: true
    };
    
    setChatMessages(prev => [...prev, tempMessage]);
    sendMessage(selectedFriend.id, content);
  };

  const isOnline = (userId) => isUserOnline(userId);

  const getTimeSince = (lastSeen) => {
    if (!lastSeen) return 'Offline';
    const now = new Date();
    const last = new Date(lastSeen);
    const diff = Math.floor((now - last) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Layout>
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
                    {loading ? (
                      <LoadingSkeleton type="list" count={5} />
                    ) : friends.length === 0 ? (
                      <EmptyState
                        title="No friends yet"
                        message="Search for users to add friends"
                      />
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          className={`friends-list-item ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                          onClick={() => handleSelectFriend(friend)}
                        >
                          <UserListItem
                            user={friend}
                            subtitle={isOnline(friend.id) ? 'Online' : getTimeSince(friend.last_seen)}
                            isOnline={isOnline(friend.id)}
                            showOnline={true}
                            badge={unreadMessages[friend.id] > 0 && (
                              <span className="notification-badge">{unreadMessages[friend.id]}</span>
                            )}
                          />
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                  <>
                    {pendingRequests.length === 0 ? (
                      <EmptyState
                        title="No pending requests"
                        message="Friend requests will appear here"
                      />
                    ) : (
                      pendingRequests.map((request) => (
                        <div key={request.request_id} className="friends-list-item">
                          <UserListItem
                            user={request}
                            subtitle={request.email}
                            actions={
                              <div className="request-actions">
                                <button onClick={() => handleAcceptRequest(request.request_id)} className="accept-btn">Accept</button>
                                <button onClick={() => handleRejectRequest(request.request_id)} className="reject-btn">Reject</button>
                              </div>
                            }
                          />
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
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="friends-search-input"
                      />
                      <Button onClick={handleSearch} disabled={loading} size="small">
                        {loading ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                    
                    {error && (
                      <div style={{ padding: '12px', background: 'rgba(255, 68, 88, 0.1)', border: '1px solid rgba(255, 68, 88, 0.3)', borderRadius: '8px', margin: '12px', color: '#ff4458' }}>
                        {error}
                      </div>
                    )}
                    
                    {searchResults.length > 0 && (
                      <div className="search-results">
                        {searchResults.map((user) => (
                          <div key={user.id} className="friends-list-item">
                            <UserListItem
                              user={user}
                              subtitle={user.email}
                              actions={
                                <>
                                  {user.friendship_status === 'none' && (
                                    <Button onClick={() => handleSendRequest(user.id)} size="small">
                                      Add
                                    </Button>
                                  )}
                                  {user.friendship_status === 'request_sent' && (
                                    <Button disabled size="small" variant="secondary">
                                      Sent
                                    </Button>
                                  )}
                                  {user.friendship_status === 'request_received' && (
                                    <Button onClick={() => setActiveTab('requests')} size="small">
                                      Respond
                                    </Button>
                                  )}
                                  {user.friendship_status === 'friend' && (
                                    <Button disabled size="small" variant="secondary">
                                      Friends
                                    </Button>
                                  )}
                                </>
                              }
                            />
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
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Link to={`/profile/${selectedFriend.id}`}>
                        <Button variant="secondary" size="small">
                          Profile
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleRemoveFriend(selectedFriend.id)}
                        variant="danger"
                        size="small"
                        title="Remove friend"
                      >
                        &times;
                      </Button>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {chatMessages.length === 0 ? (
                      <EmptyState
                        title={`Chat with ${selectedFriend.username}`}
                        message="Start a conversation!"
                      />
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      placeholder="Type a message..."
                      className="chat-input"
                    />
                    <button 
                      onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        handleSendMessage(input.value);
                        input.value = '';
                      }} 
                      className="chat-send-btn"
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Select a friend to chat"
                  message="Choose a friend from the list to start messaging"
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
