import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../hooks/useNotifications';
import { useDebounce } from '../hooks/useDebounce';
import Layout from '../components/Layout';
import UserListItem from '../components/UserListItem';
import ChatWindow from '../components/ChatWindow';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { lastSeen } from '../utils/time';
import '../styles/Friends.css';

// What the search result button says and does for each friendship state.
const SEARCH_ACTION = {
  none: 'Add friend',
  request_sent: 'Request sent',
  request_received: 'Answer request',
  friend: 'Friends',
};

export default function Friends() {
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState(null); // null while loading
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState(null); // null until first loaded
  const [searching, setSearching] = useState(false);
  const [chatFriend, setChatFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { getSocket, isUserOnline, lastSeenOf, sendMessage } = useSocket();
  const { unreadMessages, pendingFriendRequests, markMessagesAsRead, setActiveChat, decrementFriendRequests } =
    useNotifications();
  const [params, setParams] = useSearchParams();
  const withId = Number(params.get('with')) || null;
  const search = useDebounce(query.trim(), 300);
  const fail = useCallback((fallback) => (err) => setError(errorMessage(err, fallback)), []);

  const loadFriends = useCallback(
    () =>
      Promise.all([api.get('/api/friends/list'), api.get('/api/friends/requests/pending')])
        .then(([list, pending]) => {
          setFriends(list.data);
          setRequests(pending.data);
        })
        .catch(fail('Could not load your friends.')),
    [fail]
  );

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Suggestions load the first time the find tab opens.
  useEffect(() => {
    if (tab !== 'find' || suggestions) return;
    api
      .get('/api/friends/suggestions')
      .then(({ data }) => setSuggestions(data))
      .catch(fail('Could not load suggestions.'));
  }, [tab, suggestions, fail]);

  // Search as you type, once there are two characters.
  useEffect(() => {
    if (search.length < 2) return;
    let stale = false;
    api
      .get(`/api/friends/search?query=${encodeURIComponent(search)}`)
      .then(({ data }) => !stale && setResults(data))
      .catch(fail('Search failed.'))
      .finally(() => !stale && setSearching(false));
    return () => {
      stale = true;
    };
  }, [search, fail]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatFriend) return;
    const onMessage = (message) => {
      if (message.sender_id !== chatFriend.id) return;
      setMessages((prev) => [...prev, { ...message, isOwn: false }]);
      markMessagesAsRead(chatFriend.id);
    };
    socket.on('receive_message', onMessage);
    return () => socket.off('receive_message', onMessage);
  }, [getSocket, chatFriend, markMessagesAsRead]);

  useEffect(() => {
    setActiveChat(chatFriend?.id ?? null);
    return () => setActiveChat(null);
  }, [chatFriend, setActiveChat]);

  // Arriving from a message alert opens that conversation once the list is in.
  const fromAlert = withId && friends?.find((friend) => friend.id === withId);
  useEffect(() => {
    if (!fromAlert) return;
    setParams({}, { replace: true });
    openChat(fromAlert);
    // openChat changes every render; the alert only needs handling once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAlert]);

  const openChat = async (friend) => {
    setChatFriend(friend);
    setMessages([]);
    try {
      const { data } = await api.get(`/api/direct-messages/${friend.id}`);
      setMessages(data.map((msg) => ({ ...msg, isOwn: Number(msg.sender_id) === Number(user?.id) })));
      markMessagesAsRead(friend.id);
    } catch (err) {
      fail('Could not load the conversation.')(err);
    }
  };

  const sendChat = (content) => {
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, content, isOwn: true }]);
    sendMessage(chatFriend.id, content);
  };

  const answer = async (request, accept) => {
    try {
      await (accept
        ? api.post(`/api/friends/accept/${request.request_id}`)
        : api.delete(`/api/friends/reject/${request.request_id}`));
      decrementFriendRequests();
      await loadFriends();
    } catch (err) {
      fail('Could not answer the request.')(err);
    }
  };

  const addFriend = async (person) => {
    if (person.friendship_status === 'request_received') return setTab('requests');
    try {
      await api.post('/api/friends/request', { friendId: person.id });
      const sent = (list) => list?.map((p) => (p.id === person.id ? { ...p, friendship_status: 'request_sent' } : p));
      setResults(sent);
      setSuggestions(sent);
    } catch (err) {
      fail('Could not send the request.')(err);
    }
  };

  const unfriend = async () => {
    if (!window.confirm(`Remove ${chatFriend.username} from your friends?`)) return;
    try {
      await api.delete(`/api/friends/${chatFriend.id}`);
      setChatFriend(null);
      await loadFriends();
    } catch (err) {
      fail('Could not remove the friend.')(err);
    }
  };

  const tabs = [
    ['friends', 'Friends'],
    ['requests', 'Requests', pendingFriendRequests],
    ['find', 'Find people'],
  ];

  return (
    <Layout>
      <div className="wrap friends">
        <aside className="friends-panel">
          <nav className="friends-tabs" aria-label="Friends sections">
            {tabs.map(([key, label, count]) => (
              <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
                {label}
                {count > 0 && <span className="badge">{count}</span>}
              </button>
            ))}
          </nav>

          {error && (
            <div className="notice notice-error" role="alert" onClick={() => setError('')}>
              {error}
            </div>
          )}

          <div className="friends-body">
            {tab === 'friends' &&
              (!friends ? (
                <LoadingSkeleton count={4} />
              ) : friends.length ? (
                friends.map((friend) => (
                  <UserListItem
                    key={friend.id}
                    user={friend}
                    subtitle={isUserOnline(friend.id) ? 'online' : lastSeen(lastSeenOf(friend.id, friend.last_seen))}
                    isOnline={isUserOnline(friend.id)}
                    isActive={chatFriend?.id === friend.id}
                    onClick={() => openChat(friend)}
                    actions={unreadMessages[friend.id] > 0 && <span className="badge">{unreadMessages[friend.id]}</span>}
                  />
                ))
              ) : (
                <EmptyState
                  title="No friends yet"
                  message="Find people by their username and send a request."
                  action={
                    <button type="button" className="link" onClick={() => setTab('find')}>
                      Find people
                    </button>
                  }
                />
              ))}

            {tab === 'requests' &&
              (requests.length ? (
                requests.map((request) => (
                  <UserListItem
                    key={request.request_id}
                    user={{ ...request, id: request.user_id }}
                    subtitle="wants to be friends"
                    actions={
                      <span className="friends-answer">
                        <button type="button" className="button button-primary" onClick={() => answer(request, true)}>
                          Accept
                        </button>
                        <button type="button" className="button" onClick={() => answer(request, false)}>
                          Decline
                        </button>
                      </span>
                    }
                  />
                ))
              ) : (
                <EmptyState title="No requests" message="When someone adds you, it shows up here." />
              ))}

            {tab === 'find' && (
              <>
                <input
                  className="field-input"
                  type="search"
                  aria-label="Search people by username"
                  placeholder="Search by username"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearching(e.target.value.trim().length >= 2);
                  }}
                  autoFocus
                />
                {query.trim().length < 2 && (
                  <>
                    <p className="label friends-hint">People who share your interests</p>
                    {!suggestions ? (
                      <LoadingSkeleton count={2} />
                    ) : suggestions.length ? (
                      suggestions.map((person) => (
                        <UserListItem
                          key={person.id}
                          user={person}
                          subtitle={person.shared.map((tag) => tag.name).join(' · ')}
                          actions={
                            <button
                              type="button"
                              className="button"
                              disabled={person.friendship_status === 'request_sent'}
                              onClick={() => addFriend(person)}
                            >
                              {SEARCH_ACTION[person.friendship_status || 'none']}
                            </button>
                          }
                        />
                      ))
                    ) : user.interests?.length ? (
                      <EmptyState title="Nobody new yet" message="No one else has picked your interests so far. Search by name instead." />
                    ) : (
                      <EmptyState
                        title="Pick your interests"
                        message="Choose a few on your profile to see people who share them."
                        action={<Link to="/profile" className="link">Choose interests</Link>}
                      />
                    )}
                  </>
                )}
                {search.length >= 2 &&
                  query.trim().length >= 2 &&
                  !searching &&
                  (results.length ? (
                    results.map((person) => (
                      <UserListItem
                        key={person.id}
                        user={person}
                        subtitle={isUserOnline(person.id) ? 'online' : lastSeen(lastSeenOf(person.id, person.last_seen))}
                        actions={
                          <button
                            type="button"
                            className="button"
                            disabled={['request_sent', 'friend'].includes(person.friendship_status)}
                            onClick={() => addFriend(person)}
                          >
                            {SEARCH_ACTION[person.friendship_status]}
                          </button>
                        }
                      />
                    ))
                  ) : (
                    <EmptyState title="Nobody by that name" message="Check the spelling, or try part of the name." />
                  ))}
              </>
            )}
          </div>
        </aside>

        <main className="friends-chat">
          {chatFriend ? (
            <>
              <div className="friends-chat-tools">
                <Link to={`/profile/${chatFriend.id}`} className="link">
                  View profile
                </Link>
                <button type="button" className="link" onClick={unfriend}>
                  Remove friend
                </button>
              </div>
              <ChatWindow
                recipient={{ ...chatFriend, isOnline: isUserOnline(chatFriend.id) }}
                messages={messages}
                onSendMessage={sendChat}
              />
            </>
          ) : (
            <EmptyState title="Pick someone to talk to" message="Choose a friend on the left to open your conversation." />
          )}
        </main>
      </div>
    </Layout>
  );
}
