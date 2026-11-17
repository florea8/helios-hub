import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import TagPicker from '../components/TagPicker';
import InterestTag from '../components/InterestTag';
import { tagStyle } from '../interests';
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

const EMPTY_DRAFT = { title: '', description: '', image: null, tags: [] };
const MAX_TAGS = 3;

// The server does the filtering, so older posts are found too.
const feedUrl = (offset, { view, tagId, query }) =>
  `/api/posts?limit=${PAGE_SIZE}&offset=${offset}` +
  (view === 'mine' ? '&feed=mine' : '') +
  (tagId ? `&tag=${tagId}` : '') +
  (query ? `&q=${encodeURIComponent(query)}` : '');

// What to say when the feed is empty, and where to go next.
const FeedEmpty = ({ view, filtered, hasInterests }) => {
  if (filtered) return <EmptyState title="Nothing matches" message="Try another search or filter." />;
  if (view === 'mine' && !hasInterests)
    return (
      <EmptyState
        title="Pick your interests"
        message="Choose a few on your profile and this feed shows the posts about them."
        action={<Link to="/profile" className="link">Choose interests</Link>}
      />
    );
  if (view === 'mine')
    return <EmptyState title="Quiet for now" message="Nobody has posted about your interests yet. Start the conversation above." />;
  return <EmptyState title="No posts yet" message="Write the first one above." />;
};

const Dashboard = () => {
  const [feed, setFeed] = useState({ key: null, posts: [], hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [tagId, setTagId] = useState(null);
  const { user } = useAuth();
  // People who picked interests start on their own feed.
  const [view, setView] = useState(() => (user.interests?.length ? 'mine' : 'all'));
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [friends, setFriends] = useState([]);
  const [chatFriend, setChatFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const { getSocket, isUserOnline, sendMessage } = useSocket();
  const { markMessagesAsRead } = useNotifications();
  const query = useDebounce(search, 300).trim();
  // The feed shown belongs to one filter; while the next one loads, show the skeleton.
  const filters = { view, tagId, query };
  const feedKey = `${view}|${tagId}|${query}`;
  const loading = feed.key !== feedKey;
  const posts = feed.posts;
  const setPosts = (update) => setFeed((prev) => ({ ...prev, posts: update(prev.posts) }));

  const reloadFeed = useCallback(
    () =>
      api
        .get(feedUrl(0, { view, tagId, query }))
        .then(({ data }) => setFeed({ key: `${view}|${tagId}|${query}`, posts: data.posts, hasMore: data.hasMore })),
    [view, tagId, query]
  );

  useEffect(() => {
    Promise.all([api.get('/api/tags'), api.get('/api/friends/list')])
      .then(([tags, friendList]) => {
        setAllTags(tags.data);
        setFriends(friendList.data);
      })
      .catch((err) => setError(errorMessage(err, 'Could not load the feed.')));
  }, []);

  useEffect(() => {
    let stale = false;
    api
      .get(feedUrl(0, { view, tagId, query }))
      .then(({ data }) => !stale && setFeed({ key: `${view}|${tagId}|${query}`, posts: data.posts, hasMore: data.hasMore }))
      .catch((err) => setError(errorMessage(err, 'Could not load the feed.')));
    return () => {
      stale = true;
    };
  }, [view, tagId, query]);

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

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await api.get(feedUrl(posts.length, filters));
      setFeed((prev) => ({ ...prev, posts: [...prev.posts, ...data.posts], hasMore: data.hasMore }));
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
      setDraft(EMPTY_DRAFT);
      await reloadFeed();
    } catch (err) {
      setError(errorMessage(err, 'Could not publish the post.'));
    }
    setPosting(false);
  };

  // Creates the interest if nobody has yet, and returns it for the picker to select.
  const createTag = async (name) => {
    try {
      const { data: tag } = await api.post('/api/tags', { name });
      setAllTags((prev) =>
        prev.some((t) => t.id === tag.id) ? prev : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
      );
      return tag;
    } catch (err) {
      setError(errorMessage(err, 'Could not add the interest.'));
    }
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
          {user.interests?.length > 0 && (
            <div className="dash-interests">
              {user.interests.map((tag) => (
                <InterestTag key={tag.id} interest={tag} />
              ))}
            </div>
          )}
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
            <TagPicker
              tags={allTags}
              selected={draft.tags}
              onChange={(tags) => setDraft((d) => ({ ...d, tags }))}
              max={MAX_TAGS}
              onCreate={createTag}
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
            <nav className="dash-view" aria-label="Which posts">
              <button type="button" aria-pressed={view === 'mine'} onClick={() => setView('mine')}>
                For you
              </button>
              <button type="button" aria-pressed={view === 'all'} onClick={() => setView('all')}>
                Everything
              </button>
            </nav>
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
                  All interests
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="tag"
                    style={tagStyle(tag)}
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
          ) : posts.length ? (
            <div className="dash-posts">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onLike={toggleLike} />
              ))}
            </div>
          ) : (
            <FeedEmpty view={view} filtered={Boolean(query || tagId)} hasInterests={user.interests?.length > 0} />
          )}

          {feed.hasMore && !loading && (
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
