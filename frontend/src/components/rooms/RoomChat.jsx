import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage, fileUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar';
import { formatDateTime } from '../../utils/time';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const downloadUrl = (message) => fileUrl(`api/messages/download/${message.file_path.split('/').pop()}`);

const Attachment = ({ message }) =>
  message.file_type?.startsWith('image/') ? (
    <a href={downloadUrl(message)} title="Download">
      <img src={fileUrl(message.file_path)} alt={message.file_name} />
    </a>
  ) : (
    <a href={downloadUrl(message)} className="room-file">
      <b>{message.file_name.split('.').pop().slice(0, 4)}</b>
      <span>{message.file_name}</span>
      <span className="label">{formatSize(message.file_size)}</span>
    </a>
  );

const RoomChat = ({ room, messages, setMessages, onError }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [asking, setAsking] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, asking]);

  // The server also sends this message to the room, so it may already be on screen.
  const publish = (message) => setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));

  const send = async (askAssistant) => {
    const content = text.trim();
    const attachment = file;
    if (!content && !attachment) return;
    setText('');
    setFile(null);
    try {
      const form = new FormData();
      if (content) form.append('content', content);
      if (attachment) form.append('file', attachment);
      const { data } = await api.post(`/api/messages/${room.id}`, form, {
        onUploadProgress: attachment && ((e) => setProgress(Math.round((e.loaded * 100) / e.total))),
      });
      publish({ ...data, username: user.username, profile_picture: user.profile_picture });

      if (askAssistant) {
        setAsking(true);
        const reply = await api.post(`/api/chatbot/${room.id}`, { content });
        if (reply.data.botMessage) publish(reply.data.botMessage);
      }
    } catch (err) {
      onError(errorMessage(err, 'Could not send the message.'));
      setText(content);
      setFile(attachment);
    }
    setProgress(null);
    setAsking(false);
  };

  const pickFile = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (picked.size > MAX_FILE_BYTES) return onError('Files can be at most 10 MB.');
    setFile(picked);
  };

  return (
    <>
      <ul className="room-messages" ref={listRef}>
        {messages.length === 0 && <li className="room-quiet">No messages yet. Say hello.</li>}
        {messages.map((message) => {
          const bot = message.user_id === 0 || message.username === 'HeliosBot';
          return (
            <li key={message.id} data-me={message.user_id === user.id || undefined} data-bot={bot || undefined}>
              {bot ? <span className="avatar" style={{ '--size': '36px' }}>AI</span> : <Avatar user={message} size={36} />}
              <div>
                <p className="label">
                  {bot ? 'Assistant' : <Link to={`/profile/${message.user_id}`}>{message.username}</Link>} ·{' '}
                  {formatDateTime(message.created_at)}
                </p>
                {message.content && <p>{message.content}</p>}
                {message.file_name && <Attachment message={message} />}
              </div>
            </li>
          );
        })}
        {asking && <li className="room-quiet label">The assistant is thinking…</li>}
      </ul>

      {progress !== null && (
        <div className="room-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${progress}%` }} />
        </div>
      )}

      <form
        className="room-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(false);
        }}
      >
        {file && (
          <p className="label">
            {file.name} · {formatSize(file.size)}{' '}
            <button type="button" onClick={() => setFile(null)}>
              remove
            </button>
          </p>
        )}
        <div>
          <label className="button" title="Attach a file">
            +
            <input type="file" onChange={pickFile} hidden />
          </label>
          <input
            className="field-input"
            aria-label="Message"
            placeholder="Write a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="button"
            onClick={() => send(true)}
            disabled={asking || !text.trim()}
            title="Send it and ask the assistant to answer"
          >
            Ask AI
          </button>
          <button type="submit" className="button button-primary" disabled={!text.trim() && !file}>
            Send
          </button>
        </div>
      </form>
    </>
  );
};

export default RoomChat;
