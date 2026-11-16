import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../hooks/useNotifications';
import { useDebounce } from '../hooks/useDebounce';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import UserListItem from '../components/UserListItem';
import ChatWindow from '../components/ChatWindow';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import '../styles/Dashboard.css';

const PAGE_SIZE = 10;

const timeSince = (lastSeen) => {
  if (!lastSeen) return 'Offline';
  const seconds = Math.floor((Date.now() - new Date(lastSeen)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [tagId, setTagId] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState({ title: '', description: '', image: null });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [friends, setFriends] = useState([]);
  const [chatFriend, setChatFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getSocket, isUserOnline, sendMessage } = useSocket();
  const { markMessagesAsRead } = useNotifications();
  const query = useDebounce(search, 300).trim().toLowerCase();

  const loadPosts = useCallback(async (offset) => {
    const { data } = await api.get(`/api/posts?limit=${PAGE_SIZE}&offset=${offset}`);
    setPosts((prev) => (offset ? [...prev, ...data.posts] : data.posts));
    setHasMore(data.hasMore);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    Promise.all([
      api.get(`/api/posts?limit=${PAGE_SIZE}&offset=0`),
      api.get('/api/tags'),
      api.get('/api/friends/list'),
    ])
      .then(([feed, tags, friendList]) => {
        setPosts(feed.data.posts);
        setHasMore(feed.data.hasMore);
        setAllTags(tags.data);
        setFriends(friendList.data);
      })
      .catch((err) => setError(errorMessage(err, 'Could not load the feed.')))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatFriend) return;
    const onMessage = (message) => {
      if (message.sender_id !== chatFriend.id && message.receiver_id !== chatFriend.id) return;
      setChatMessages((prev) => [...prev, { ...message, isOwn: message.sender_id === user?.id }]);
    };
    socket.on('receive_message', onMessage);
    return () => socket.off('receive_message', onMessage);
  }, [getSocket, chatFriend, user]);

  const visiblePosts = posts.filter(
    (post) =>
      (!tagId || post.tags.some((tag) => tag.id === tagId)) &&
      (!query ||
        [post.title, post.description, post.username].some((text) => text?.toLowerCase().includes(query)))
  );

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await loadPosts(posts.length);
    } catch (err) {
      setError(errorMessage(err, 'Could not load more posts.'));
    }
    setLoadingMore(false);
  };

  const createPost = async (e) => {
    e.preventDefault();
    setError('');
    setPosting(true);
    try {
      await api.post('/api/posts', { ...draft, post_type: 'standard' });
      setDraft({ title: '', description: '', image: null });
      await loadPosts(0);
    } catch (err) {
      setError(errorMessage(err, 'Could not publish the post.'));
    }
    setPosting(false);
  };

  const attachImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, image: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleLike = async (postId) => {
    const liked = posts.find((post) => post.id === postId)?.user_liked;
    try {
      await api[liked ? 'delete' : 'post'](`/api/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, user_liked: liked ? 0 : 1, like_count: post.like_count + (liked ? -1 : 1) }
            : post
        )
      );
    } catch (err) {
      setError(errorMessage(err, 'Could not update the like.'));
    }
  };

  const openChat = async (friend) => {
    setChatFriend(friend);
    setChatMessages([]);
    try {
      const { data } = await api.get(`/api/direct-messages/${friend.id}`);
      setChatMessages(data.map((msg) => ({ ...msg, isOwn: Number(msg.sender_id) === Number(user?.id) })));
      markMessagesAsRead(friend.id);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the conversation.'));
    }
  };

  const sendChat = (content) => {
    setChatMessages((prev) => [...prev, { id: Date.now(), content, isOwn: true }]);
    sendMessage(chatFriend.id, content);
  };

  const onlineCount = friends.filter((friend) => isUserOnline(friend.id)).length;

  return (
    <Layout>
      <div className="wrap dash">
        <aside className="dash-me">
          <Avatar user={user} size={72} />
          <h2>{user?.username}</h2>
          <p className="dash-points">
            <b>{user?.points ?? 0}</b>
            <span className="label">points</span>
          </p>
          <Link to="/profile" className="link">
            Your profile
          </Link>
        </aside>

        <main className="dash-feed">
          <form className="dash-composer" onSubmit={createPost}>
            <span className="label">New post</span>
            <input
              className="field-input"
              aria-label="Title"
              placeholder="What is it about?"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              minLength={3}
              maxLength={200}
              required
            />
            <textarea
              className="field-input"
              aria-label="Description"
              placeholder="Ask a question, share what you made, or pitch a project."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              minLength={10}
              maxLength={5000}
              required
            />
            {draft.image && (
              <div className="dash-preview">
                <img src={draft.image} alt="Attached" />
                <button type="button" onClick={() => setDraft({ ...draft, image: null })}>
                  Remove image
                </button>
              </div>
            )}
            <div className="dash-composer-actions">
              <label className="link">
                Add an image
                <input type="file" accept="image/*" onChange={attachImage} hidden />
              </label>
              <button type="submit" className="button button-primary" disabled={posting}>
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>

          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}

          <div className="dash-filters">
            <input
              className="field-input"
              type="search"
              aria-label="Search posts"
              placeholder="Search posts, people, topics"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {allTags.length > 0 && (
              <div className="picks">
                <button type="button" className="tag" aria-pressed={!tagId} onClick={() => setTagId(null)}>
                  Everything
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="tag"
                    style={{ '--c': tag.color }}
                    aria-pressed={tagId === tag.id}
                    onClick={() => setTagId(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <LoadingSkeleton count={3} />
          ) : visiblePosts.length ? (
            <div className="dash-posts">
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} onLike={toggleLike} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={query || tagId ? 'Nothing matches' : 'No posts yet'}
              message={query || tagId ? 'Try another search or filter.' : 'Write the first one above.'}
            />
          )}

          {hasMore && !loading && (
            <button type="button" className="button dash-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </main>

        <aside className="dash-friends">
          <h2>
            Friends <span className="label">{onlineCount} online</span>
          </h2>
          {friends.length ? (
            friends.map((friend) => (
              <UserListItem
                key={friend.id}
                user={friend}
                subtitle={isUserOnline(friend.id) ? 'Online' : timeSince(friend.last_seen)}
                isOnline={isUserOnline(friend.id)}
                isActive={chatFriend?.id === friend.id}
                onClick={() => openChat(friend)}
              />
            ))
          ) : (
            <EmptyState
              title="No friends yet"
              message="Find people who share your interests."
              action={
                <Link to="/friends" className="link">
                  Find people
                </Link>
              }
            />
          )}
        </aside>
      </div>

      {chatFriend && (
        <div className="dash-chat">
          <ChatWindow
            recipient={{ ...chatFriend, isOnline: isUserOnline(chatFriend.id) }}
            messages={chatMessages}
            onSendMessage={sendChat}
            onClose={() => setChatFriend(null)}
          />
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
