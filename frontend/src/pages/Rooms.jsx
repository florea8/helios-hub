import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useVoiceChat } from '../hooks/useVoiceChat';
import Layout from '../components/Layout';
import Dialog from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RoomChat from '../components/rooms/RoomChat';
import RoomSide from '../components/rooms/RoomSide';
import '../styles/Rooms.css';

const Rooms = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [params, setParams] = useSearchParams();
  // Notification links written by the server use ?roomId=…
  const roomId = Number(params.get('room') || params.get('roomId')) || null;
  const [rooms, setRooms] = useState(null); // null while loading
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null); // new-room form, null while closed
  const voice = useVoiceChat(socket, roomId);
  const fail = useCallback((fallback) => (err) => setError(errorMessage(err, fallback)), []);

  useEffect(() => {
    api
      .get('/api/rooms')
      .then(({ data }) => {
        setRooms(data);
        // A "Join room" link from the feed arrives as ?postId=…
        const fromPost = data.find((item) => item.post_id === Number(params.get('postId')));
        if (fromPost) setParams({ room: fromPost.id }, { replace: true });
      })
      .catch(fail('Could not load the rooms.'));
    // The post id only matters on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoom = useCallback(
    (id) =>
      Promise.all([api.get(`/api/rooms/${id}`), api.get(`/api/rooms/${id}/check-membership`)]).then(
        async ([details, membership]) => {
          const next = { ...details.data, ...membership.data };
          // Messages, members and tasks are for members only.
          const [chat, people, todo] = next.isMember
            ? await Promise.all([
                api.get(`/api/messages/room/${id}`),
                api.get(`/api/rooms/${id}/members`),
                api.get(`/api/tasks/${id}`),
              ])
            : [];
          return { next, chat, people, todo };
        }
      ),
    []
  );

  const showRoom = useCallback(({ next, chat, people, todo }) => {
    setRoom(next);
    setMessages(chat ? chat.data.messages || chat.data : []);
    setMembers(people?.data || []);
    setTasks(todo?.data || []);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let stale = false;
    loadRoom(roomId)
      .then((loaded) => !stale && showRoom(loaded))
      .catch(fail('Could not open the room.'));
    socket?.emit('join-room', roomId);
    return () => {
      stale = true;
      socket?.emit('leave-room', roomId);
    };
  }, [roomId, socket, loadRoom, showRoom, fail]);

  useEffect(() => {
    if (!socket || !roomId) return;
    const onMessage = (message) =>
      message.room_id === roomId &&
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    const onMusic = (payload) => Number(payload.roomId) === roomId && setRoom((prev) => prev && { ...prev, ...payload });
    const onSettings = ({ roomId: id, description, rules }) =>
      Number(id) === roomId && setRoom((prev) => prev && { ...prev, description, rules });
    socket.on('room-message', onMessage);
    socket.on('room-music-update', onMusic);
    socket.on('room-settings-update', onSettings);
    return () => {
      socket.off('room-message', onMessage);
      socket.off('room-music-update', onMusic);
      socket.off('room-settings-update', onSettings);
    };
  }, [socket, roomId]);

  const current = room?.id === roomId ? room : null;

  const reloadMembers = () => api.get(`/api/rooms/${roomId}/members`).then(({ data }) => setMembers(data));

  const join = () =>
    api
      .post(`/api/rooms/${roomId}/join`)
      .then(() => loadRoom(roomId))
      .then(showRoom)
      .catch(fail('Could not join the room.'));

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      // A room hangs off a post, so the feed shows it too.
      const post = await api.post('/api/posts', { title: draft.name, description: draft.description, post_type: 'room' });
      const { data } = await api.post('/api/rooms', { postId: post.data.postId, name: draft.name });
      const created = await api.get('/api/rooms');
      setRooms(created.data);
      setDraft(null);
      setParams({ room: data.roomId });
    } catch (err) {
      fail('Could not create the room.')(err);
    }
  };

  return (
    <Layout>
      <div className="wrap rooms">
        <aside className="rooms-list">
          <h2>
            Rooms
            <button type="button" className="link" onClick={() => setDraft({ name: '', description: '' })}>
              New room
            </button>
          </h2>
          {!rooms ? (
            <LoadingSkeleton count={4} />
          ) : rooms.length ? (
            rooms.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rooms-item"
                aria-pressed={item.id === roomId}
                onClick={() => setParams({ room: item.id })}
              >
                <b>{item.name}</b>
                <span className="label">
                  {item.member_count} {item.member_count === 1 ? 'member' : 'members'} · by {item.creator_username}
                </span>
              </button>
            ))
          ) : (
            <EmptyState title="No rooms yet" message="Open the first one and invite people in." />
          )}
        </aside>

        <main className="room">
          {error && (
            <div className="notice notice-error" role="alert" onClick={() => setError('')}>
              {error}
            </div>
          )}
          {!current ? (
            <EmptyState
              title={roomId ? 'Opening the room…' : 'Pick a room'}
              message={roomId ? 'One moment.' : 'Choose one from the list, or start a new one.'}
            />
          ) : (
            <>
              <header className="room-head">
                <div>
                  <span className="label">rooms / {current.id}</span>
                  <h1>{current.name}</h1>
                </div>
                {voice.active && <span className="label room-live">In voice</span>}
              </header>
              {current.isMember ? (
                <RoomChat room={current} messages={messages} setMessages={setMessages} onError={setError} />
              ) : (
                <div className="room-locked">
                  <h2>Join to take part</h2>
                  <p>{current.post_description || 'Members can read the conversation, share files and pick up tasks.'}</p>
                  <button type="button" className="button button-primary" onClick={join}>
                    Join this room
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {current?.isMember && (
          <RoomSide
            key={current.id}
            room={current}
            setRoom={setRoom}
            members={members}
            reloadMembers={reloadMembers}
            tasks={tasks}
            setTasks={setTasks}
            voice={voice}
            user={user}
            onError={setError}
          />
        )}
      </div>

      <Dialog open={Boolean(draft)} title="New room" onClose={() => setDraft(null)}>
        {draft && (
          <form className="form" onSubmit={createRoom}>
            <label className="field">
              <span className="label">Name</span>
              <input
                className="field-input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                minLength={3}
                maxLength={100}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span className="label">What is it for?</span>
              <textarea
                className="field-input"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                minLength={10}
                maxLength={500}
                required
              />
              <span className="field-hint">This also appears in the feed, so people can find the room.</span>
            </label>
            <button type="submit" className="button button-primary">
              Open the room
            </button>
          </form>
        )}
      </Dialog>
    </Layout>
  );
};

export default Rooms;
