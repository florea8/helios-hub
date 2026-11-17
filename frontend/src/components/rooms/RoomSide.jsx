import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../services/api';
import Avatar from '../Avatar';
import Dialog from '../Dialog';

const EMPTY_TASK = { title: '', description: '', start_date: '', end_date: '', priority: 'NORMAL' };
const shortDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function Tasks({ room, tasks, setTasks, onError }) {
  const [editing, setEditing] = useState(null); // null, 'new', or the task being edited
  const [form, setForm] = useState(EMPTY_TASK);
  const today = new Date().toISOString().slice(0, 10);
  const done = tasks.filter((task) => task.status === 'DONE').length;
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const open = (task) => {
    setEditing(task || 'new');
    setForm(task ? Object.fromEntries(Object.keys(EMPTY_TASK).map((key) => [key, task[key] || ''])) : EMPTY_TASK);
  };

  const run = async (request, fallback) => {
    try {
      await request();
    } catch (err) {
      onError(errorMessage(err, fallback));
    }
  };

  const save = (e) => {
    e.preventDefault();
    run(async () => {
      if (editing === 'new') {
        const { data } = await api.post(`/api/tasks/${room.id}`, form);
        setTasks((prev) => [...prev, data]);
      } else {
        await api.put(`/api/tasks/${room.id}/${editing.id}`, { ...form, status: editing.status });
        setTasks((prev) => prev.map((task) => (task.id === editing.id ? { ...task, ...form } : task)));
      }
      setEditing(null);
    }, 'Could not save the task.');
  };

  // The tick shows at once; it is undone if the server refuses.
  const toggle = (task) => {
    const setStatus = (status) => setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    const status = task.status === 'DONE' ? 'PENDING' : 'DONE';
    setStatus(status);
    api.patch(`/api/tasks/${room.id}/${task.id}/toggle`, { status }).catch((err) => {
      setStatus(task.status);
      onError(errorMessage(err, 'Could not update the task.'));
    });
  };

  const remove = (task) =>
    window.confirm(`Delete "${task.title}"?`) &&
    run(async () => {
      await api.delete(`/api/tasks/${room.id}/${task.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    }, 'Could not delete the task.');

  return (
    <>
      <div className="side-head">
        <span className="label">
          {done}/{tasks.length} done
        </span>
        <button type="button" className="link" onClick={() => open(null)}>
          Add a task
        </button>
      </div>
      {tasks.length > 0 && (
        <div className="room-progress">
          <i style={{ width: `${(done / tasks.length) * 100}%` }} />
        </div>
      )}
      <ul className="task-list">
        {[...tasks]
          .sort((a, b) => a.end_date.localeCompare(b.end_date))
          .map((task) => (
            <li key={task.id} data-done={task.status === 'DONE' || undefined}>
              <input
                type="checkbox"
                className="check"
                aria-label={`Done: ${task.title}`}
                checked={task.status === 'DONE'}
                onChange={() => toggle(task)}
              />
              <div>
                <b>{task.title}</b>
                <span className="label">
                  {shortDate(task.start_date)} → {shortDate(task.end_date)}
                  {task.priority !== 'NORMAL' && ` · ${task.priority}`}
                  {task.status !== 'DONE' && task.end_date < today && <mark>Overdue</mark>}
                </span>
              </div>
              <button type="button" className="label" onClick={() => open(task)}>
                Edit
              </button>
              <button type="button" className="label" onClick={() => remove(task)}>
                Delete
              </button>
            </li>
          ))}
      </ul>
      {tasks.length === 0 && <p className="side-quiet">No tasks yet. Add the first thing that needs doing.</p>}

      <Dialog open={Boolean(editing)} title={editing === 'new' ? 'New task' : 'Edit task'} onClose={() => setEditing(null)}>
        <form className="form" onSubmit={save}>
          <label className="field">
            <span className="label">Title</span>
            <input className="field-input" value={form.title} onChange={set('title')} required autoFocus />
          </label>
          <label className="field">
            <span className="label">Details</span>
            <textarea className="field-input" rows={3} value={form.description} onChange={set('description')} />
          </label>
          <div className="form-row">
            <label className="field">
              <span className="label">Starts</span>
              <input className="field-input" type="date" value={form.start_date} onChange={set('start_date')} required />
            </label>
            <label className="field">
              <span className="label">Due</span>
              <input
                className="field-input"
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={set('end_date')}
                required
              />
            </label>
          </div>
          <label className="field">
            <span className="label">Priority</span>
            <select className="field-input" value={form.priority} onChange={set('priority')}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <button type="submit" className="button button-primary">
            Save task
          </button>
        </form>
      </Dialog>
    </>
  );
}

function People({ room, setRoom, members, reloadMembers, voice, user, onError }) {
  const [openId, setOpenId] = useState(null);
  const iOwn = room.created_by === user.id;
  const nameOf = (id) => members.find((member) => member.id === id)?.username || 'Someone';

  const act = async (request, fallback) => {
    try {
      await request();
      await reloadMembers();
      setOpenId(null);
    } catch (err) {
      onError(errorMessage(err, fallback));
    }
  };

  const setRole = (member, role) =>
    act(() => api.put(`/api/rooms/${room.id}/members/${member.id}/role`, { role }), 'Could not change the role.');

  const remove = (member) =>
    window.confirm(`Remove ${member.username} from the room?`) &&
    act(() => api.delete(`/api/rooms/${room.id}/members/${member.id}`), 'Could not remove the member.');

  const makeOwner = (member) =>
    window.confirm(`Make ${member.username} the owner? You will become a moderator.`) &&
    act(async () => {
      await api.post(`/api/rooms/${room.id}/transfer-ownership`, { newOwnerId: member.id });
      setRoom((prev) => ({ ...prev, role: 'moderator', created_by: member.id }));
    }, 'Could not transfer ownership.');

  const joinVoice = () =>
    voice.join().catch(() => onError('Could not use the microphone. Check the browser permission.'));

  return (
    <>
      <div className="side-head">
        <span className="label">Voice</span>
        {voice.active ? (
          <span>
            <button type="button" className="link" onClick={voice.toggleMute}>
              {voice.muted ? 'Unmute' : 'Mute'}
            </button>{' '}
            <button type="button" className="link" onClick={voice.leave}>
              Leave
            </button>
          </span>
        ) : (
          <button type="button" className="link" onClick={joinVoice}>
            Join voice
          </button>
        )}
      </div>
      {voice.active && (
        <ul className="voice-list">
          {[{ userId: 'self', username: user.username, isMuted: voice.muted }, ...voice.others].map((person) => (
            <li
              key={person.userId}
              data-speaking={(voice.speaking.has(person.userId) && !person.isMuted) || undefined}
            >
              {person.username || nameOf(person.userId)}
              {person.isMuted && <span className="label">muted</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="side-head">
        <span className="label">{members.length} members</span>
      </div>
      <ul className="member-list">
        {members.map((member) => {
          const isOwner = member.id === room.created_by;
          const canManage = ['admin', 'moderator'].includes(room.role) && !isOwner && member.id !== user.id;
          const canRemove = room.role === 'admin' || member.role === 'member';
          return (
            <li key={member.id}>
              <div className="person">
                <Link to={`/profile/${member.id}`}>
                  <Avatar user={member} size={36} />
                </Link>
                <div>
                  <Link to={`/profile/${member.id}`}>{member.username}</Link>
                  <span className="label">{isOwner ? 'owner' : member.role}</span>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="label"
                    aria-expanded={openId === member.id}
                    onClick={() => setOpenId(openId === member.id ? null : member.id)}
                  >
                    Manage
                  </button>
                )}
              </div>
              {openId === member.id && (
                <div className="member-menu">
                  {room.role === 'admin' && (
                    <>
                      <button type="button" onClick={() => setRole(member, member.role === 'admin' ? 'member' : 'admin')}>
                        {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(member, member.role === 'moderator' ? 'member' : 'moderator')}
                      >
                        {member.role === 'moderator' ? 'Remove moderator' : 'Make moderator'}
                      </button>
                    </>
                  )}
                  {iOwn && (
                    <button type="button" onClick={() => makeOwner(member)}>
                      Make owner
                    </button>
                  )}
                  {canRemove && (
                    <button type="button" data-danger onClick={() => remove(member)}>
                      Remove from room
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

const youtubeEmbed = (url) => {
  const id = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/))([\w-]{11})/)?.[1];
  return id && `https://www.youtube.com/embed/${id}?rel=0`;
};

function Music({ room, setRoom, onError }) {
  const [url, setUrl] = useState(room.music_url || '');
  const [title, setTitle] = useState(room.music_title || '');
  const embed = youtubeEmbed(room.music_url);

  const save = async (next) => {
    try {
      const { data } = await api.put(`/api/rooms/${room.id}/music`, next);
      setRoom((prev) => ({ ...prev, ...data.room }));
      setUrl(next.url || '');
      setTitle(next.title || '');
    } catch (err) {
      onError(errorMessage(err, 'Could not update the music.'));
    }
  };

  return (
    <>
      <div className="side-head">
        <span className="label">Shared music</span>
        {room.music_url && (
          <button type="button" className="link" onClick={() => save({ url: null, title: null })}>
            Stop
          </button>
        )}
      </div>
      {embed ? (
        <>
          <iframe className="music-player" src={embed} title={room.music_title || 'Room music'} allow="autoplay; encrypted-media" allowFullScreen />
          <p className="side-quiet">
            {room.music_title || 'Untitled'}
            {room.music_added_by_username && ` · added by ${room.music_added_by_username}`}
          </p>
        </>
      ) : (
        <p className="side-quiet">
          {room.music_url ? 'That link is not a YouTube video.' : 'Nothing is playing. Paste a YouTube link for everyone in the room.'}
        </p>
      )}
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save({ url: url.trim() || null, title: title.trim() || null });
        }}
      >
        <input className="field-input" type="url" aria-label="YouTube link" placeholder="YouTube link" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <input className="field-input" aria-label="Title" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" className="button">
          Play for the room
        </button>
      </form>
    </>
  );
}

function About({ room, setRoom, onError }) {
  const [form, setForm] = useState(null); // null while the dialog is closed

  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/api/rooms/${room.id}/settings`, form);
      setRoom((prev) => ({ ...prev, ...data.room }));
      setForm(null);
    } catch (err) {
      onError(errorMessage(err, 'Could not save the room settings.'));
    }
  };

  return (
    <>
      <div className="side-head">
        <span className="label">About this room</span>
        {room.role === 'admin' && (
          <button
            type="button"
            className="link"
            onClick={() => setForm({ description: room.description || '', rules: room.rules || '' })}
          >
            Edit
          </button>
        )}
      </div>
      <p className="side-text">{room.description || room.post_description || 'No description yet.'}</p>
      {room.rules && (
        <>
          <div className="side-head">
            <span className="label">Rules</span>
          </div>
          <p className="side-text">{room.rules}</p>
        </>
      )}
      <p className="side-quiet">
        Started by <Link to={`/profile/${room.created_by}`} className="link">{room.creator_username}</Link>
      </p>

      <Dialog open={Boolean(form)} title="Room settings" onClose={() => setForm(null)}>
        {form && (
          <form className="form" onSubmit={save}>
            <label className="field">
              <span className="label">Description</span>
              <textarea className="field-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus />
            </label>
            <label className="field">
              <span className="label">Rules</span>
              <textarea className="field-input" rows={4} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} />
            </label>
            <button type="submit" className="button button-primary">
              Save
            </button>
          </form>
        )}
      </Dialog>
    </>
  );
}

const TABS = { Tasks, People, Music, About };

const RoomSide = (props) => {
  const [tab, setTab] = useState('Tasks');
  const Panel = TABS[tab];

  return (
    <aside className="room-side">
      <nav className="side-tabs" aria-label="Room panels">
        {Object.keys(TABS).map((name) => (
          <button key={name} type="button" aria-pressed={tab === name} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </nav>
      <div className="side-body">
        <Panel {...props} />
      </div>
    </aside>
  );
};

export default RoomSide;
