import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import '../styles/Rooms.css';

export default function Rooms() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '' });
  const [musicUrl, setMusicUrl] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [savingMusic, setSavingMusic] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', start_date: '', end_date: '', priority: 'NORMAL' });
  const [savingTask, setSavingTask] = useState(false);
  const [ganttMonth, setGanttMonth] = useState(new Date());
  const [askingBot, setAskingBot] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchRoomDetails(selectedRoom.id);
      fetchMessages(selectedRoom.id);
      fetchMembers(selectedRoom.id);
      checkMembership(selectedRoom.id);
      
      // Join socket room
      if (socket) {
        socket.emit('join-room', selectedRoom.id);
      }
    }

    return () => {
      if (selectedRoom && socket) {
        socket.emit('leave-room', selectedRoom.id);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id, socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-message', (message) => {
      if (selectedRoom && message.room_id === selectedRoom.id) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('room-music-update', (payload) => {
      if (selectedRoom && Number(payload.roomId) === selectedRoom.id) {
        setSelectedRoom(prev => ({
          ...prev,
          music_url: payload.music_url,
          music_title: payload.music_title,
          music_added_by: payload.music_added_by,
          music_added_by_username: payload.music_added_by_username,
          music_updated_at: payload.music_updated_at
        }));
        setMusicUrl(payload.music_url || '');
        setMusicTitle(payload.music_title || '');
      }
    });

    return () => {
      socket.off('room-message');
      socket.off('room-music-update');
    };
  }, [socket, selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const res = await api.get(`/api/messages/room/${roomId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchMembers = async (roomId) => {
    try {
      const res = await api.get(`/api/rooms/${roomId}/members`);
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchTasks = async (roomId) => {
    try {
      const res = await api.get(`/api/tasks/${roomId}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const fetchRoomDetails = async (roomId) => {
    try {
      const res = await api.get(`/api/rooms/${roomId}`);
      setSelectedRoom(prev => (prev ? { ...prev, ...res.data } : res.data));
      setMusicUrl(res.data.music_url || '');
      setMusicTitle(res.data.music_title || '');
      fetchTasks(roomId);
    } catch (err) {
      console.error('Failed to fetch room details:', err);
    }
  };

  const checkMembership = async (roomId) => {
    try {
      const res = await api.get(`/api/rooms/${roomId}/check-membership`);
      setSelectedRoom(prev => (prev ? { ...prev, isMember: res.data.isMember } : { isMember: res.data.isMember }));
    } catch (err) {
      console.error('Failed to check membership:', err);
    }
  };

  const handleSaveMusic = async (e) => {
    e.preventDefault();
    if (!selectedRoom?.isMember) return;
    setSavingMusic(true);
    try {
      const res = await api.put(`/api/rooms/${selectedRoom.id}/music`, {
        url: musicUrl.trim() || null,
        title: musicTitle.trim() || null
      });

      const updatedRoom = res.data.room || {};
      setSelectedRoom(prev => ({ ...prev, ...updatedRoom }));
      setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
    } catch (err) {
      alert('Failed to update music: ' + (err.response?.data?.message || 'Error'));
    } finally {
      setSavingMusic(false);
    }
  };

  const handleClearMusic = async () => {
    if (!selectedRoom?.isMember) return;
    setSavingMusic(true);
    try {
      const res = await api.put(`/api/rooms/${selectedRoom.id}/music`, { url: null, title: null });
      const updatedRoom = res.data.room || {};
      setSelectedRoom(prev => ({ ...prev, ...updatedRoom }));
      setRooms(prev => prev.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
      setMusicUrl('');
      setMusicTitle('');
    } catch (err) {
      alert('Failed to clear music: ' + (err.response?.data?.message || 'Error'));
    } finally {
      setSavingMusic(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      // First create a room post
      const postRes = await api.post('/api/posts', {
        title: newRoom.name,
        description: newRoom.description,
        post_type: 'room'
      });
      
      // Then create the room with the post ID
      const res = await api.post('/api/rooms', {
        postId: postRes.data.postId,
        name: newRoom.name
      });
      const newRoomData = res.data.room || res.data;
      setRooms(prev => [newRoomData, ...prev]);
      setShowCreateModal(false);
      setNewRoom({ name: '', description: '' });
      setSelectedRoom(newRoomData);
    } catch (err) {
      alert('Failed to create room: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleJoinRoom = async () => {
    try {
      await api.post(`/api/rooms/${selectedRoom.id}/join`);
      setSelectedRoom(prev => ({ ...prev, isMember: true }));
      fetchMembers(selectedRoom.id);
      fetchRooms();
    } catch (err) {
      alert('Failed to join room: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const _handleLeaveRoom = async () => {
    try {
      await api.post(`/api/rooms/${selectedRoom.id}/leave`);
      setSelectedRoom(prev => ({ ...prev, isMember: false }));
      fetchMembers(selectedRoom.id);
      fetchRooms();
    } catch (err) {
      alert('Failed to leave room: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const _handleDeleteRoom = async () => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      await api.delete(`/api/rooms/${selectedRoom.id}`);
      setRooms(prev => prev.filter(r => r.id !== selectedRoom.id));
      setSelectedRoom(null);
    } catch (err) {
      alert('Failed to delete room: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !selectedRoom?.isMember) return;

    const tempMessage = messageText;
    setMessageText('');
    const tempFile = selectedFile;
    setSelectedFile(null);

    try {
      const formData = new FormData();
      if (tempMessage.trim()) {
        formData.append('content', tempMessage);
      }
      if (tempFile) {
        formData.append('file', tempFile);
      }

      const res = await api.post(`/api/messages/${selectedRoom.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Add message instantly to UI
      const newMessage = {
        ...res.data,
        username: user.username,
        profile_picture: user.profile_picture
      };
      setMessages(prev => [...prev, newMessage]);
      
      // Emit socket event for other users
      if (socket) {
        socket.emit('room-message', newMessage);
      }
    } catch (err) {
      alert('Failed to send message: ' + (err.response?.data?.message || 'Error'));
      setMessageText(tempMessage); // Restore message on error
      setSelectedFile(tempFile);
    }
  };

  const handleAskBot = async () => {
    if (!messageText.trim() || !selectedRoom?.isMember) return;
    
    setAskingBot(true);
    const userMessage = messageText;
    setMessageText('');

    try {
      // First send user message normally
      const userMsgRes = await api.post(`/api/messages/${selectedRoom.id}`, {
        content: userMessage
      });
      
      // Add user message instantly to UI
      const userMsg = {
        ...userMsgRes.data,
        username: user.username,
        profile_picture: user.profile_picture
      };
      setMessages(prev => [...prev, userMsg]);
      
      // Emit user message to socket for other users
      if (socket) {
        socket.emit('room-message', userMsg);
      }

      // Add "bot is thinking" placeholder
      const thinkingMsg = {
        id: 'thinking-' + Date.now(),
        user_id: 0,
        username: 'HeliosBot',
        content: '🤔 Mă gândesc...',
        created_at: new Date().toISOString(),
        isThinking: true
      };
      setMessages(prev => [...prev, thinkingMsg]);

      // Then get bot response
      const botRes = await api.post(`/api/chatbot/${selectedRoom.id}`, {
        content: userMessage
      });
      
      // Remove thinking message and add real bot response
      setMessages(prev => prev.filter(m => !m.isThinking));
      
      if (botRes.data.botMessage) {
        setMessages(prev => [...prev, botRes.data.botMessage]);
        
        // Emit bot message to socket for other users
        if (socket) {
          socket.emit('room-message', botRes.data.botMessage);
        }
      }
    } catch (err) {
      console.error('Failed to ask bot:', err);
      // Remove thinking message on error
      setMessages(prev => prev.filter(m => !m.isThinking));
      alert('Failed to contact bot: ' + (err.response?.data?.message || 'Error'));
    } finally {
      setAskingBot(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    if (['mp4', 'avi', 'mov'].includes(ext)) return '🎥';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedRoom?.isMember) return;
    if (!newTask.start_date || !newTask.end_date) {
      alert('Please select start and end dates');
      return;
    }
    setSavingTask(true);
    try {
      if (editingTask) {
        // Update existing task
        await api.put(`/api/tasks/${selectedRoom.id}/${editingTask.id}`, {
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          start_date: newTask.start_date,
          end_date: newTask.end_date,
          priority: newTask.priority,
          status: editingTask.status
        });
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...newTask } : t));
      } else {
        // Create new task
        const res = await api.post(`/api/tasks/${selectedRoom.id}`, {
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          start_date: newTask.start_date,
          end_date: newTask.end_date,
          priority: newTask.priority
        });
        setTasks(prev => [...prev, res.data]);
      }
      setNewTask({ title: '', description: '', start_date: '', end_date: '', priority: 'NORMAL' });
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (err) {
      alert('Failed to save task: ' + (err.response?.data?.message || 'Error'));
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
      await api.patch(`/api/tasks/${selectedRoom.id}/${taskId}/toggle`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/api/tasks/${selectedRoom.id}/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert('Failed to delete task: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const cleaned = url.trim();
    const patterns = [
      /youtu\.be\/([\w-]{11})/, // youtu.be/<id>
      /youtube\.com\/watch\?.*v=([\w-]{11})/, // watch?v=<id>
      /youtube\.com\/embed\/([\w-]{11})/, // embed/<id>
      /youtube\.com\/shorts\/([\w-]{11})/ // shorts/<id>
    ];

    for (const regex of patterns) {
      const match = cleaned.match(regex);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0`;
      }
    }
    return null;
  };

  // Gantt chart helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getGanttDays = () => {
    const days = [];
    const daysCount = getDaysInMonth(ganttMonth);
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(ganttMonth.getFullYear(), ganttMonth.getMonth(), i));
    }
    return days;
  };

  const _getTaskPositionAndWidth = (task) => {
    const ganttDays = getGanttDays();
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    taskStart.setHours(0, 0, 0, 0);
    taskEnd.setHours(0, 0, 0, 0);

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < ganttDays.length; i++) {
      const day = new Date(ganttDays[i]);
      day.setHours(0, 0, 0, 0);
      
      if (day.getTime() === taskStart.getTime() && startIndex === -1) {
        startIndex = i;
      }
      if (day.getTime() === taskEnd.getTime()) {
        endIndex = i;
      }
    }

    if (startIndex === -1) startIndex = 0;
    if (endIndex === -1) endIndex = ganttDays.length - 1;

    const cellWidth = 40;
    const leftOffset = startIndex * cellWidth;
    const width = (endIndex - startIndex + 1) * cellWidth;

    return { leftOffset, width, startIndex, endIndex };
  };

  const prevGanttMonth = () => {
    setGanttMonth(new Date(ganttMonth.getFullYear(), ganttMonth.getMonth() - 1));
  };

  const nextGanttMonth = () => {
    setGanttMonth(new Date(ganttMonth.getFullYear(), ganttMonth.getMonth() + 1));
  };

  const activeTasksCount = tasks.filter(t => t.status !== 'DONE').length;
  const _doneTasksCount = tasks.length - activeTasksCount;
  const _memberCount = members.length;
  const _messagesCount = messages.length;

  return (
    <div className="rooms-page-container">
      {/* Atmospheric Background */}
      <div className="rooms-atmosphere-bg">
        <div className="rooms-gradient-mesh"></div>
        <div className="rooms-grid-pattern"></div>
      </div>

      {/* Header */}
      <header className={`rooms-header ${scrollY > 50 ? 'rooms-header-scrolled' : ''}`}>
        <div className="rooms-header-inner">
          <Link to="/" className="rooms-brand-logo">
            <svg className="rooms-logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#rooms-logo-grad)"/>
              <path d="M20 35L15 25H25L20 35Z" fill="url(#rooms-logo-grad)"/>
              <circle cx="20" cy="20" r="3" fill="url(#rooms-logo-grad)"/>
              <defs>
                <linearGradient id="rooms-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff"/>
                  <stop offset="100%" stopColor="#41d1ff"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="rooms-brand-name">Helios</span>
          </Link>
          <nav className="rooms-nav">
            <Link to="/dashboard" className="rooms-nav-item">Dashboard</Link>
            <Link to="/posts" className="rooms-nav-item">Posts</Link>
            <Link to="/rooms" className="rooms-nav-item rooms-nav-active">Rooms</Link>
            <Link to="/friends" className="rooms-nav-item">Friends</Link>
            <Link to="/profile" className="rooms-nav-item">Profile</Link>
            <Link to="/settings" className="rooms-nav-item">Settings</Link>
            <button onClick={logout} className="rooms-nav-item rooms-nav-logout">Logout</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="rooms-main">
        {/* Rooms Layout */}
        <section className="rooms-content-section">
          <div className="rooms-layout">
            {/* Sidebar - Rooms List */}
            <aside className="rooms-sidebar">
              <div className="rooms-sidebar-header">
                <h2>All Rooms</h2>
                <span className="rooms-count">{rooms.length}</span>
              </div>
              
              {loading ? (
                <div className="rooms-loading">Loading...</div>
              ) : rooms.length === 0 ? (
                <div className="rooms-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <p>No rooms yet</p>
                  <span>Create the first one!</span>
                </div>
              ) : (
                <div className="rooms-list">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      className={`room-card ${selectedRoom?.id === room.id ? 'room-card-active' : ''}`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className="room-card-header">
                        <h3>{room.name}</h3>
                        <span className="room-members-badge">{room.member_count}</span>
                      </div>
                      {room.post_title && (
                        <p className="room-post-title">{room.post_title}</p>
                      )}
                      <div className="room-creator">
                        <div className="creator-avatar">
                          {room.creator_profile_picture ? (
                            <img src={`http://localhost:5000/${room.creator_profile_picture}`} alt={room.creator_username} />
                          ) : (
                            getInitials(room.creator_username)
                          )}
                        </div>
                        <span>by {room.creator_username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>

            {/* Main Chat Area */}
            <div className="rooms-main-content">
              {/* Chat Content */}
              <div className="rooms-chat-wrapper">
                {selectedRoom ? (
                  <>
                    {/* Chat Header */}
                    <div className="room-chat-header">
                      <div className="room-info">
                        <h2>{selectedRoom.name}</h2>
                        {selectedRoom.post_title && (
                          <p>{selectedRoom.post_title}</p>
                        )}
                      </div>
                      <div className="room-actions room-actions-secondary">
                        {selectedRoom.isMember ? (
                          <button
                            onClick={() => {
                              setEditingTask(null);
                              setNewTask({ title: '', description: '', start_date: '', end_date: '', priority: 'NORMAL' });
                              setShowTaskModal(true);
                            }}
                            className="btn-join"
                          >
                            Task nou
                          </button>
                        ) : (
                          <button onClick={handleJoinRoom} className="btn-join">
                            Intră
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedRoom.isMember ? (
                      <>
                        {/* Messages Area */}
                        <div className="room-messages">
                          {messages.length === 0 ? (
                            <div className="messages-empty">
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              <p>No messages yet</p>
                              <span>Start the conversation!</span>
                            </div>
                          ) : (
                            messages.map((msg) => {
                              const isBot = msg.user_id === 0 || msg.username === 'HeliosBot';
                              return (
                                <div key={msg.id} className={`message ${msg.user_id === user.id ? 'message-own' : ''} ${isBot ? 'message-bot' : ''}`}>
                                  <div className="message-avatar">
                                    {isBot ? (
                                      <div className="avatar-bot">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="3" y="11" width="18" height="10" rx="2"/>
                                          <circle cx="8" cy="15" r="1"/>
                                          <circle cx="16" cy="15" r="1"/>
                                          <path d="M9 7 h6"/>
                                          <path d="M12 7 V11"/>
                                        </svg>
                                      </div>
                                    ) : msg.profile_picture ? (
                                      <img src={`http://localhost:5000/${msg.profile_picture}`} alt={msg.username} />
                                    ) : (
                                      <div className="avatar-initials">{getInitials(msg.username)}</div>
                                    )}
                                  </div>
                                  <div className="message-content">
                                    <div className="message-header">
                                      <span className={`message-username ${isBot ? 'bot-username' : ''}`}>
                                        {msg.username}
                                        {isBot && <span className="bot-badge">🤖 AI</span>}
                                      </span>
                                      <span className="message-time">
                                        {new Date(msg.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    {msg.content && <p className="message-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>}
                                    {msg.file_name && (
                                      (() => {
                                        const isImage = msg.file_type && msg.file_type.startsWith('image/');
                                        
                                        if (isImage) {
                                          const filename = msg.file_path.split('/').pop();
                                          return (
                                            <div className="message-image-container">
                                              <img 
                                                src={`http://localhost:5000/${msg.file_path}`}
                                                alt={msg.file_name}
                                                className="message-image"
                                              />
                                              <a 
                                                href={`http://localhost:5000/api/messages/download/${filename}`}
                                                className="image-download-link"
                                                title="Descarcă imaginea"
                                              >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                  <polyline points="7 10 12 15 17 10"/>
                                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                              </a>
                                            </div>
                                          );
                                        }
                                        
                                        const filename = msg.file_path.split('/').pop();
                                        return (
                                          <a 
                                            href={`http://localhost:5000/api/messages/download/${filename}`}
                                            className="message-file"
                                          >
                                            <span className="file-icon">{getFileIcon(msg.file_name)}</span>
                                            <span className="file-info">
                                              <span className="file-name">{msg.file_name}</span>
                                              <span className="file-size">{formatFileSize(msg.file_size)}</span>
                                            </span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                              <polyline points="7 10 12 15 17 10"/>
                                              <line x1="12" y1="15" x2="12" y2="3"/>
                                            </svg>
                                          </a>
                                        );
                                      })()
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="room-message-form">
                          {selectedFile && (
                            <div className="selected-file-preview">
                              <span className="file-icon">{getFileIcon(selectedFile.name)}</span>
                              <span className="file-name">{selectedFile.name}</span>
                              <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                              <button type="button" onClick={handleRemoveFile} className="btn-remove-file">✕</button>
                            </div>
                          )}
                          <div className="message-input-row">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileSelect}
                              style={{ display: 'none' }}
                            />
                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="btn-attach"
                              title="Atașează fișier"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                              </svg>
                            </button>
                            <input
                              type="text"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Scrie un mesaj... (sau întreabă bot-ul)"
                              className="message-input"
                            />
                            <button 
                              type="button" 
                              onClick={handleAskBot}
                              disabled={askingBot || !messageText.trim()}
                              className={`btn-bot ${askingBot ? 'btn-bot-thinking' : ''}`}
                              title={askingBot ? "Bot-ul se gândește..." : "Întreabă bot-ul AI 🤖"}
                            >
                              {askingBot ? (
                                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" opacity="0.25"/>
                                  <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round"/>
                                </svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="11" width="18" height="10" rx="2"/>
                                  <circle cx="8" cy="15" r="1"/>
                                  <circle cx="16" cy="15" r="1"/>
                                  <path d="M9 7 h6"/>
                                  <path d="M12 7 V11"/>
                                </svg>
                              )}
                            </button>
                            <button type="submit" className="btn-send" disabled={!messageText.trim() && !selectedFile}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 2L9 11M18 2l-6 16-3-7-7-3 16-6z" />
                              </svg>
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="room-locked">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <h3>Room Locked</h3>
                        <p>Join this room to see messages and participate in discussions</p>
                        <button onClick={handleJoinRoom} className="btn-join-large">
                          Join Room
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rooms-chat-placeholder">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                    <h3>Select a Room</h3>
                    <p>Choose a room from the sidebar to start chatting</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Tasks, Music, Members */}
            {selectedRoom && selectedRoom.isMember && (
              <aside className="rooms-right-sidebar">
                <div className="rooms-aux-block">
                  <div className="rooms-gantt-section">
                    <div className="task-section">
                      <div className="task-header">
                        <h3>Tasks Timeline</h3>
                        <button onClick={() => {
                          setEditingTask(null);
                          setNewTask({ title: '', description: '', start_date: '', end_date: '', priority: 'NORMAL' });
                          setShowTaskModal(true);
                        }} className="btn-add-task">
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 4v12M4 10h12" />
                          </svg>
                        </button>
                      </div>

                      <div className="gantt-wrapper">
                        <div className="gantt-month-header">
                          <button onClick={prevGanttMonth} className="gantt-nav">◀</button>
                          <h4>{ganttMonth.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}</h4>
                          <button onClick={nextGanttMonth} className="gantt-nav">▶</button>
                        </div>

                        <div className="gantt-container">
                          <div className="calendar-grid">
                            <div className="calendar-grid-header">
                              <div>Luni</div>
                              <div>Marți</div>
                              <div>Mierc</div>
                              <div>Joi</div>
                              <div>Vineri</div>
                              <div>Sâmb</div>
                              <div>Dumi</div>
                            </div>
                            {getGanttDays().reduce((weeks, day, idx) => {
                              if (idx % 7 === 0) weeks.push([]);
                              weeks[weeks.length - 1].push(day);
                              return weeks;
                            }, []).map((week, weekIdx) => (
                              <div key={weekIdx} className="calendar-grid-week">
                                {week.map((day) => {
                                  const dateStr = day.toISOString().split('T')[0];
                                  const dayTasks = tasks.filter(t => {
                                    const start = new Date(t.start_date);
                                    const end = new Date(t.end_date);
                                    start.setHours(0, 0, 0, 0);
                                    end.setHours(0, 0, 0, 0);
                                    day.setHours(0, 0, 0, 0);
                                    return day >= start && day <= end;
                                  });

                                  return (
                                    <div
                                      key={dateStr}
                                      className={`calendar-grid-day ${day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() ? 'calendar-today' : ''}`}
                                    >
                                      <div className="calendar-day-number">{day.getDate()}</div>
                                      <div className="calendar-day-tasks">
                                        {dayTasks.map(task => (
                                          <div
                                            key={task.id}
                                            className={`calendar-task-badge gantt-task-${task.priority.toLowerCase()} ${task.status === 'DONE' ? 'gantt-task-done' : ''}`}
                                            onClick={() => {
                                              setEditingTask(task);
                                              setNewTask({
                                                title: task.title,
                                                description: task.description,
                                                start_date: task.start_date,
                                                end_date: task.end_date,
                                                priority: task.priority
                                              });
                                              setShowTaskModal(true);
                                            }}
                                            title={task.title}
                                          >
                                            <span className="task-title-short">{task.title.slice(0, 12)}</span>
                                            <div className="task-badge-actions">
                                              <button
                                                className="badge-check"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleTask(task.id, task.status);
                                                }}
                                              >
                                                {task.status === 'DONE' ? '✓' : '·'}
                                              </button>
                                              <button
                                                className="badge-delete"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteTask(task.id);
                                                }}
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rooms-aux-block">
                    <div className="room-music-card">
                      <div className="room-music-top">
                        <div className="room-music-pill">Muzică</div>
                        {selectedRoom.music_added_by_username && (
                          <span className="room-music-by">de {selectedRoom.music_added_by_username}</span>
                        )}
                      </div>

                      <div className="room-music-title-row">
                        <div>
                          <p className="room-music-title">Muzică de fundal</p>
                          <p className="room-music-sub">YouTube pentru ambient, fără alte setări.</p>
                        </div>
                        {selectedRoom.music_updated_at && (
                          <span className="room-music-updated">{new Date(selectedRoom.music_updated_at).toLocaleString()}</span>
                        )}
                      </div>

                      {selectedRoom.music_url ? (
                        <div className="room-music-player">
                          <div className="room-music-meta">
                            <div className="room-music-track">{selectedRoom.music_title || 'Untitled track'}</div>
                            <div className="room-music-link">{selectedRoom.music_url}</div>
                          </div>
                          {getYouTubeEmbedUrl(selectedRoom.music_url) ? (
                            <iframe
                              className="room-youtube"
                              src={getYouTubeEmbedUrl(selectedRoom.music_url)}
                              title={selectedRoom.music_title || 'Room music'}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="room-music-empty">Link YouTube invalid.</div>
                          )}
                        </div>
                      ) : (
                        <div className="room-music-empty">Nicio piesă setată.</div>
                      )}

                      <form onSubmit={handleSaveMusic} className="room-music-form">
                        <div className="room-music-fields">
                          <input
                            type="text"
                            value={musicTitle}
                            onChange={(e) => setMusicTitle(e.target.value)}
                            placeholder="Titlu (opțional)"
                          />
                          <input
                            type="url"
                            value={musicUrl}
                            onChange={(e) => setMusicUrl(e.target.value)}
                            placeholder="Link YouTube"
                          />
                        </div>
                        <div className="room-music-actions">
                          <button type="submit" className="btn-save-music" disabled={savingMusic}>
                            {savingMusic ? 'Se salvează...' : 'Salvează'}
                          </button>
                          {selectedRoom.music_url && (
                            <button type="button" className="btn-clear-music" onClick={handleClearMusic} disabled={savingMusic}>
                              Șterge
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="rooms-aux-block">
                    <div className="members-header">
                      <h3>Members</h3>
                      <span className="members-count">{members.length}</span>
                    </div>
                    <div className="members-list">
                      {members.map(member => (
                        <div key={member.user_id} className="member-item">
                          <div className="member-avatar">
                            {member.profile_picture ? (
                              <img src={`http://localhost:5000/${member.profile_picture}`} alt={member.username} />
                            ) : (
                              getInitials(member.username)
                            )}
                          </div>
                          <span className="member-name">{member.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </section>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Room</h2>
              <button onClick={() => setShowCreateModal(false)} className="modal-close">✕</button>
            </div>
            <form onSubmit={handleCreateRoom} className="modal-form">
              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="e.g. Study Group A"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  placeholder="Describe the purpose of this room..."
                  required
                  className="form-input"
                  rows="4"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">Create Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showTaskModal && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
              <button onClick={() => setShowTaskModal(false)} className="modal-close">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="modal-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Read Chapter 5"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Optional details..."
                  className="form-input"
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={newTask.end_date}
                    onChange={(e) => setNewTask({ ...newTask, end_date: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="form-input"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={savingTask}>
                  {savingTask ? 'Saving...' : (editingTask ? 'Update Task' : 'Add Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}