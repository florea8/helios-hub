import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../hooks/useNotifications';
import { useDebounce } from '../hooks/useDebounce';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import UserListItem from '../components/UserListItem';
import ChatWindow from '../components/ChatWindow';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Button from '../components/Button';
import Modal from '../components/Modal';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);
  const [postTags, setPostTags] = useState({});
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getSocket, isUserOnline, sendMessage } = useSocket();
  const { markMessagesAsRead } = useNotifications();

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const [postsRes, tagsRes] = await Promise.all([
        api.get('/api/posts?limit=10&offset=0'),
        api.get('/api/tags')
      ]);
      
      setPosts(postsRes.data.posts || []);
      setFilteredPosts(postsRes.data.posts || []);
      setHasMore(postsRes.data.hasMore);
      setOffset(10);
      setAllTags(tagsRes.data);

      // Fetch tags for each post
      const tagsMap = {};
      for (const post of postsRes.data.posts || []) {
        try {
          const tagRes = await api.get(`/api/tags/post/${post.id}`);
          tagsMap[post.id] = tagRes.data;
        } catch {
          tagsMap[post.id] = [];
        }
      }
      setPostTags(tagsMap);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
      setFilteredPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to filter posts when debounced search query or tag changes
  useEffect(() => {
    let filtered = posts;
    
    // Filter by tag first
    if (selectedTagId) {
      filtered = posts.filter(post => postTags[post.id]?.some(tag => tag.id === selectedTagId));
    }
    
    // Then filter by search query
    if (debouncedSearchQuery.trim()) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((post) =>
        post.title?.toLowerCase().includes(lowerQuery) ||
        post.description?.toLowerCase().includes(lowerQuery) ||
        post.username?.toLowerCase().includes(lowerQuery)
      );
    }
    
    setFilteredPosts(filtered);
  }, [debouncedSearchQuery, posts, selectedTagId, postTags]);

  const handleSearchPosts = (query) => {
    setSearchQuery(query);
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

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const loadData = async () => {
      await fetchPosts();
      await fetchFriends();
    };
    loadData();
  }, [user, navigate, fetchPosts, fetchFriends]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (selectedFriend && (message.sender_id === selectedFriend.id || message.receiver_id === selectedFriend.id)) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: message.id || Date.now(),
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            content: message.content,
            created_at: message.created_at || new Date().toISOString(),
            isOwn: message.sender_id === user?.id,
          },
        ]);
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [getSocket, selectedFriend, user]);

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

  const handleOpenChat = async (friend) => {
    setSelectedFriend(friend);
    try {
      const res = await api.get(`/api/direct-messages/${friend.id}`);
      const messages = res.data.map((msg) => ({
        ...msg,
        isOwn: Number(msg.sender_id) === Number(user?.id),
      }));
      setChatMessages(messages);
      markMessagesAsRead(friend.id);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setChatMessages([]);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      const postsRes = await api.get(`/api/posts?limit=10&offset=${offset}`);
      
      setPosts(prev => [...prev, ...(postsRes.data.posts || [])]);
      setHasMore(postsRes.data.hasMore);
      setOffset(prev => prev + 10);

      // Fetch tags for new posts
      const tagsMap = { ...postTags };
      for (const post of postsRes.data.posts || []) {
        try {
          const tagRes = await api.get(`/api/tags/post/${post.id}`);
          tagsMap[post.id] = tagRes.data;
        } catch {
          tagsMap[post.id] = [];
        }
      }
      setPostTags(tagsMap);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setLoadingMore(false);
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
      setShowCreateModal(false);

      // Refresh posts
      await fetchPosts();
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

  const handleLikePost = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const currentlyLiked = post.user_liked;
      
      if (currentlyLiked) {
        await api.delete(`/api/posts/${postId}/like`);
      } else {
        await api.post(`/api/posts/${postId}/like`);
      }

      // Update post in state
      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            user_liked: currentlyLiked ? 0 : 1,
            like_count: currentlyLiked ? p.like_count - 1 : p.like_count + 1
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('Failed to like/unlike post:', err);
    }
  };

  const onlineCount = friends.filter((f) => isOnline(f.id)).length;

  return (
    <Layout>
      <section className="dashboard-wrapper">
        <div className="dashboard-layout">
          {/* Left Sidebar */}
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
                <button onClick={() => setShowCreateModal(true)} className="quick-link" style={{ cursor: 'pointer', border: 'none', background: 'transparent', textAlign: 'left', width: '100%' }}>
                  <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>New Post</span>
                </button>
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
          </aside>

          {/* Main Content */}
          <main className="content-main">
            <div className="content-top">
              <h2>Recent Posts</h2>
              <Button onClick={() => setShowCreateModal(true)} size="small">
                Create Post
              </Button>
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Filter by Tags</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedTagId(null)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: !selectedTagId ? 'rgba(100, 108, 255, 0.8)' : 'rgba(100, 108, 255, 0.3)',
                      background: !selectedTagId ? 'rgba(100, 108, 255, 0.2)' : 'transparent',
                      color: '#e0e6ff',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    All Posts
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTagId(tag.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: selectedTagId === tag.id ? tag.color : 'rgba(100, 108, 255, 0.3)',
                        background: selectedTagId === tag.id ? `${tag.color}20` : 'transparent',
                        color: '#e0e6ff',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="posts-search-section">
              <input
                type="text"
                placeholder="Search posts by title, content, or author..."
                value={searchQuery}
                onChange={(e) => handleSearchPosts(e.target.value)}
                className="posts-search-input"
              />
              {searchQuery && (
                <button onClick={() => handleSearchPosts('')} className="posts-search-clear">
                  Clear
                </button>
              )}
            </div>

            <div className="posts-layout">
              {loading ? (
                <LoadingSkeleton type="post" count={3} />
              ) : filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <div key={post.id}>
                    <PostCard 
                      post={post} 
                      onLike={handleLikePost}
                    />
                    
                    {/* Tags Display */}
                    {postTags[post.id] && postTags[post.id].length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {postTags[post.id].map(tag => (
                          <span
                            key={tag.id}
                            style={{ 
                              backgroundColor: `${tag.color}20`,
                              borderColor: tag.color,
                              color: '#e0e6ff',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              border: '1px solid',
                              fontSize: '0.85rem'
                            }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  title={searchQuery || selectedTagId ? 'No posts found' : 'No posts yet'}
                  message={searchQuery || selectedTagId ? 'Try different filters' : 'Be the first to share something amazing!'}
                  action={!searchQuery && !selectedTagId && (
                    <Button onClick={() => setShowCreateModal(true)}>Create Post</Button>
                  )}
                />
              )}
            </div>

            {/* Load More Button */}
            {!loading && hasMore && filteredPosts.length > 0 && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Button
                  variant="secondary"
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More Posts'}
                </Button>
              </div>
            )}

            {!loading && !hasMore && posts.length > 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                No more posts to load
              </div>
            )}
          </main>

          {/* Right Sidebar */}
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
                  <EmptyState
                    title="No friends yet"
                    message="Connect with people to see them here"
                  />
                ) : (
                  <div className="friends-list-home">
                    {friends.map((friend) => (
                      <UserListItem
                        key={friend.id}
                        user={friend}
                        subtitle={isOnline(friend.id) ? 'Online' : getTimeSince(friend.last_seen)}
                        isOnline={isOnline(friend.id)}
                        showOnline={true}
                        onClick={() => handleOpenChat(friend)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Mini Chat Popup */}
      {selectedFriend && (
        <div className="mini-chat-popup">
          <ChatWindow
            recipient={{ ...selectedFriend, isOnline: isOnline(selectedFriend.id) }}
            messages={chatMessages}
            onSendMessage={(content) => {
              if (content.trim()) {
                const tempMessage = {
                  id: Date.now(),
                  sender_id: user?.id,
                  receiver_id: selectedFriend.id,
                  content,
                  created_at: new Date().toISOString(),
                  isOwn: true,
                };
                setChatMessages((prev) => [...prev, tempMessage]);
                sendMessage(selectedFriend.id, content);
              }
            }}
            onClose={() => setSelectedFriend(null)}
          />
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create New Post"
        onClose={() => {
          setShowCreateModal(false);
          setError('');
          setDescription('');
          setImage(null);
          setImagePreview(null);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ 
              padding: '12px', 
              background: 'rgba(255, 68, 88, 0.1)', 
              border: '1px solid rgba(255, 68, 88, 0.3)',
              borderRadius: '8px',
              color: '#ff4458'
            }}>
              {error}
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#e0e6ff', fontWeight: '500' }}>
              Description
            </label>
            <textarea
              placeholder="Share your thoughts here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="6"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(100, 108, 255, 0.3)',
                borderRadius: '8px',
                color: '#e0e6ff',
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#e0e6ff', fontWeight: '500' }}>
              Add Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(100, 108, 255, 0.3)',
                borderRadius: '8px',
                color: '#e0e6ff',
                cursor: 'pointer'
              }}
            />
            {imagePreview && (
              <div style={{ marginTop: '12px', position: 'relative' }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    maxHeight: '300px',
                    objectFit: 'cover'
                  }} 
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '8px',
                    background: 'rgba(255, 68, 88, 0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    color: 'white',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowCreateModal(false);
                setError('');
                setDescription('');
                setImage(null);
                setImagePreview(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePost}
              disabled={loading || !description.trim()}
            >
              {loading ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Dashboard;
