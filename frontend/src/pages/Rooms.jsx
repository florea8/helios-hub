import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import NotificationPanel from '../components/NotificationPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';
import UploadProgress from '../components/UploadProgress';
import CreateRoomModal from '../components/rooms/CreateRoomModal';
import TaskModal from '../components/rooms/TaskModal';
import RoomSettingsModal from '../components/rooms/RoomSettingsModal';
import TransferOwnershipModal from '../components/rooms/TransferOwnershipModal';
import api from '../services/api';
import Peer from 'simple-peer';
import '../styles/Rooms.css';

export default function Rooms() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [roomSettings, setRoomSettings] = useState({ description: '', rules: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  
  // Voice chat state
  const [inVoiceChat, setInVoiceChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const userStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioAnalyzersRef = useRef({});
  const animationFramesRef = useRef({});

  // Voice chat helper functions (declared early to avoid TDZ issues)
  const setupAudioAnalyzer = useCallback((userId, stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 512;
      
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioAnalyzersRef.current[userId] = { analyser, dataArray };

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        setSpeakingUsers(prev => {
          const newSet = new Set(prev);
          if (average > 30) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });

        animationFramesRef.current[userId] = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.error('Failed to setup audio analyzer:', err);
    }
  }, []);

  const playAudio = useCallback((userId, stream) => {
    const existingAudio = document.getElementById(`audio-${userId}`);
    if (existingAudio) {
      existingAudio.srcObject = stream;
      return;
    }

    const audio = document.createElement('audio');
    audio.id = `audio-${userId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    document.body.appendChild(audio);

    setupAudioAnalyzer(userId, stream);
  }, [setupAudioAnalyzer]);

  const createPeer = useCallback((userId, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: true,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      socket?.emit('voice-signal', {
        roomId: selectedRoom?.id,
        targetUserId: userId,
        signal
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received stream from:', userId);
      playAudio(userId, remoteStream);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peersRef.current[userId] = peer;
    return peer;
  }, [playAudio, selectedRoom?.id, socket]);

  const addPeer = useCallback((userId, incomingSignal, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      socket?.emit('voice-signal', {
        roomId: selectedRoom?.id,
        targetUserId: userId,
        signal
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received stream from:', userId);
      playAudio(userId, remoteStream);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peer.signal(incomingSignal);
    peersRef.current[userId] = peer;
    return peer;
  }, [playAudio, selectedRoom?.id, socket]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;

    fetchRoomDetails(selectedRoom.id);
    fetchMessages(selectedRoom.id);
    fetchMembers(selectedRoom.id);
    checkMembership(selectedRoom.id);

    if (socket) {
      socket.emit('join-room', selectedRoom.id);
    }

    return () => {
      if (socket) {
        socket.emit('leave-room', selectedRoom.id);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id, socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-message', (message) => {
      if (selectedRoom && message.room_id === selectedRoom.id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('room-music-update', (payload) => {
      if (selectedRoom && Number(payload.roomId) === selectedRoom.id) {
        setSelectedRoom((prev) => ({
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

    socket.on('room-settings-update', (payload) => {
      if (selectedRoom && Number(payload.roomId) === selectedRoom.id) {
        setSelectedRoom((prev) => ({ ...prev, description: payload.description, rules: payload.rules }));
      }
    });

    // Voice chat socket events
    socket.on('voice-user-joined', (data) => {
      if (!inVoiceChat) return;
      
      console.log('User joined voice:', data);
      setVoiceUsers((prev) => [...prev, { userId: data.userId, username: data.username, profilePicture: data.profilePicture, isMuted: false }]);
      
      // Create peer connection for the new user
      createPeer(data.userId, userStreamRef.current);
    });

    socket.on('voice-user-left', (data) => {
      console.log('User left voice:', data.userId);
      setVoiceUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      
      // Close peer connection
      if (peersRef.current[data.userId]) {
        peersRef.current[data.userId].destroy();
        delete peersRef.current[data.userId];
      }
    });

    socket.on('voice-signal', (data) => {
      const { fromUserId, signal } = data;
      
      if (peersRef.current[fromUserId]) {
        peersRef.current[fromUserId].signal(signal);
      } else {
        // Create peer for incoming call
        addPeer(fromUserId, signal, userStreamRef.current);
      }
    });

    socket.on('voice-user-muted', (data) => {
      setVoiceUsers((prev) => 
        prev.map((u) => u.userId === data.userId ? { ...u, isMuted: data.isMuted } : u)
      );
    });

    return () => {
      socket.off('room-message');
      socket.off('room-music-update');
      socket.off('room-settings-update');
      socket.off('voice-user-joined');
      socket.off('voice-user-left');
      socket.off('voice-signal');
      socket.off('voice-user-muted');
    };
  }, [socket, selectedRoom, inVoiceChat, addPeer, createPeer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
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
      // Handle both old array format and new paginated format
      setMessages(Array.isArray(res.data) ? res.data : (res.data.messages || []));
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
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
      setSelectedRoom((prev) => (prev ? { ...prev, ...res.data } : res.data));
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
      setSelectedRoom((prev) => (prev ? { ...prev, isMember: res.data.isMember, role: res.data.role } : { isMember: res.data.isMember, role: res.data.role }));
    } catch (err) {
      console.error('Failed to check membership:', err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const postRes = await api.post('/api/posts', {
        title: newRoom.name,
        description: newRoom.description,
        post_type: 'room'
      });

      const res = await api.post('/api/rooms', {
        postId: postRes.data.postId,
        name: newRoom.name
      });

      const newRoomData = res.data.room || res.data;
      setRooms((prev) => [newRoomData, ...prev]);
      setShowCreateModal(false);
      setNewRoom({ name: '', description: '' });
      setSelectedRoom(newRoomData);
    } catch (err) {
      alert('Failed to create room: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleJoinRoom = async () => {
    if (!selectedRoom) return;
    try {
      await api.post(`/api/rooms/${selectedRoom.id}/join`);
      setSelectedRoom((prev) => ({ ...prev, isMember: true }));
      fetchMembers(selectedRoom.id);
      fetchRooms();
    } catch (err) {
      alert('Failed to join room: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !selectedRoom?.isMember) return;

    const tempMessage = messageText;
    const tempFile = selectedFile;
    setMessageText('');
    setSelectedFile(null);

    try {
      const formData = new FormData();
      if (tempMessage.trim()) {
        formData.append('content', tempMessage);
      }
      if (tempFile) {
        formData.append('file', tempFile);
        setIsUploading(true);
        setUploadFileName(tempFile.name);
        setUploadProgress(0);
      }

      const res = await api.post(`/api/messages/${selectedRoom.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (tempFile) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });

      if (tempFile) {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadFileName('');
      }

      const newMessage = {
        ...res.data,
        username: user.username,
        profile_picture: user.profile_picture
      };
      setMessages((prev) => [...prev, newMessage]);

      if (socket) {
        socket.emit('room-message', newMessage);
      }
    } catch (err) {
      alert('Failed to send message: ' + (err.response?.data?.message || 'Error'));
      setMessageText(tempMessage);
      setSelectedFile(tempFile);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
    }
  };

  const handleAskBot = async () => {
    if (!messageText.trim() || !selectedRoom?.isMember) return;

    setAskingBot(true);
    const userMessage = messageText;
    setMessageText('');

    try {
      const userMsgRes = await api.post(`/api/messages/${selectedRoom.id}`, { content: userMessage });
      const userMsg = { ...userMsgRes.data, username: user.username, profile_picture: user.profile_picture };
      setMessages((prev) => [...prev, userMsg]);
      if (socket) socket.emit('room-message', userMsg);

      const thinkingMsg = {
        id: 'thinking-' + Date.now(),
        user_id: 0,
        username: 'HeliosBot',
        content: 'Thinking...',
        created_at: new Date().toISOString(),
        isThinking: true
      };
      setMessages((prev) => [...prev, thinkingMsg]);

      const botRes = await api.post(`/api/chatbot/${selectedRoom.id}`, { content: userMessage });
      setMessages((prev) => prev.filter((m) => !m.isThinking));

      if (botRes.data.botMessage) {
        setMessages((prev) => [...prev, botRes.data.botMessage]);
        if (socket) socket.emit('room-message', botRes.data.botMessage);
      }
    } catch (err) {
      console.error('Failed to ask bot:', err);
      setMessages((prev) => prev.filter((m) => !m.isThinking));
      alert('Failed to contact bot: ' + (err.response?.data?.message || 'Error'));
    } finally {
      setAskingBot(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
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
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      setSelectedRoom((prev) => ({ ...prev, ...updatedRoom }));
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r)));
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
      setSelectedRoom((prev) => ({ ...prev, ...updatedRoom }));
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r)));
      setMusicUrl('');
      setMusicTitle('');
    } catch (err) {
      alert('Failed to clear music: ' + (err.response?.data?.message || 'Error'));
    } finally {
      setSavingMusic(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedRoom || selectedRoom.role !== 'admin') return;

    setSavingSettings(true);
    try {
      const res = await api.put(`/api/rooms/${selectedRoom.id}/settings`, roomSettings);
      const updatedRoom = res.data.room;
      setSelectedRoom((prev) => ({ ...prev, ...updatedRoom }));
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r)));
      setShowSettingsModal(false);
    } catch (err) {
      alert('Failed to update settings: ' + (err.response?.data?.message || 'Error'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    if (!selectedRoom || selectedRoom.role !== 'admin') return;
    try {
      await api.put(`/api/rooms/${selectedRoom.id}/members/${memberId}/role`, { role: newRole });
      const res = await api.get(`/api/rooms/${selectedRoom.id}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      alert('Failed to update role: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedRoom || !['admin', 'moderator'].includes(selectedRoom.role)) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/api/rooms/${selectedRoom.id}/members/${memberId}`);
      const res = await api.get(`/api/rooms/${selectedRoom.id}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      alert('Failed to remove member: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    if (!selectedRoom || selectedRoom.created_by !== user?.id) return;
    if (!selectedTransferUserId) return;
    if (!window.confirm('Are you sure you want to transfer ownership? You will become a moderator.')) return;

    try {
      await api.post(`/api/rooms/${selectedRoom.id}/transfer-ownership`, {
        newOwnerId: parseInt(selectedTransferUserId, 10)
      });

      const res = await api.get(`/api/rooms/${selectedRoom.id}/members`);
      setMembers(res.data.members || []);

      setShowTransferModal(false);
      setSelectedTransferUserId('');
      setSelectedRoom((prev) => ({ ...prev, role: 'moderator', created_by: parseInt(selectedTransferUserId, 10) }));
    } catch (err) {
      alert('Failed to transfer ownership: ' + (err.response?.data?.message || 'Error'));
    }
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
        await api.put(`/api/tasks/${selectedRoom.id}/${editingTask.id}`, {
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          start_date: newTask.start_date,
          end_date: newTask.end_date,
          priority: newTask.priority,
          status: editingTask.status
        });
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...t, ...newTask } : t)));
      } else {
        const res = await api.post(`/api/tasks/${selectedRoom.id}`, {
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          start_date: newTask.start_date,
          end_date: newTask.end_date,
          priority: newTask.priority
        });
        setTasks((prev) => [...prev, res.data]);
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
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/api/tasks/${selectedRoom.id}/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert('Failed to delete task: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleJoinVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      userStreamRef.current = stream;
      
      setInVoiceChat(true);
      setIsMuted(false);
      
      // Setup analyzer for own audio
      setupAudioAnalyzer('self', stream);
      
      socket?.emit('voice-join-room', {
        roomId: selectedRoom.id,
        username: user.username,
        profilePicture: user.profile_picture
      });
    } catch (err) {
      console.error('Failed to get user media:', err);
      alert('Nu s-a putut accesa microfonul. Verifică permisiunile.');
    }
  };

  const handleLeaveVoiceChat = () => {
    // Stop all tracks
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach(track => track.stop());
      userStreamRef.current = null;
    }

    // Close all peer connections
    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};

    // Clean up audio analyzers
    Object.keys(audioAnalyzersRef.current).forEach(userId => {
      if (animationFramesRef.current[userId]) {
        cancelAnimationFrame(animationFramesRef.current[userId]);
      }
    });
    audioAnalyzersRef.current = {};
    animationFramesRef.current = {};

    // Remove all audio elements
    voiceUsers.forEach(vu => {
      const audio = document.getElementById(`audio-${vu.userId}`);
      if (audio) audio.remove();
    });

    socket?.emit('voice-leave-room', { roomId: selectedRoom.id });
    
    setInVoiceChat(false);
    setVoiceUsers([]);
    setSpeakingUsers(new Set());
  };

  const handleToggleMute = () => {
    if (userStreamRef.current) {
      const audioTrack = userStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        socket?.emit('voice-mute-toggle', {
          roomId: selectedRoom.id,
          isMuted: !audioTrack.enabled
        });
      }
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const cleaned = url.trim();
    const patterns = [
      /youtu\.be\/([\w-]{11})/,
      /youtube\.com\/watch\?.*v=([\w-]{11})/,
      /youtube\.com\/embed\/([\w-]{11})/,
      /youtube\.com\/shorts\/([\w-]{11})/
    ];

    for (const regex of patterns) {
      const match = cleaned.match(regex);
      if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}?rel=0`;
    }
    return null;
  };

  const getGanttDays = () => {
    const days = [];
    const daysCount = new Date(ganttMonth.getFullYear(), ganttMonth.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysCount; i += 1) {
      days.push(new Date(ganttMonth.getFullYear(), ganttMonth.getMonth(), i));
    }
    return days;
  };

  const prevGanttMonth = () => setGanttMonth(new Date(ganttMonth.getFullYear(), ganttMonth.getMonth() - 1));
  const nextGanttMonth = () => setGanttMonth(new Date(ganttMonth.getFullYear(), ganttMonth.getMonth() + 1));

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'IMG';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'DOC';
    if (['xls', 'xlsx'].includes(ext)) return 'XLS';
    if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';
    if (['mp4', 'avi', 'mov'].includes(ext)) return 'VID';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return 'AUD';
    return 'FILE';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="rooms-page-container">
      <div className="rooms-atmosphere-bg">
        <div className="rooms-gradient-mesh" />
        <div className="rooms-grid-pattern" />
      </div>

      <header className={`rooms-header ${scrollY > 50 ? 'rooms-header-scrolled' : ''}`}>
        <div className="rooms-header-inner">
          <Link to="/" className="rooms-brand-logo">
            <svg className="rooms-logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L25 15H15L20 5Z" fill="url(#rooms-logo-grad)" />
              <path d="M20 35L15 25H25L20 35Z" fill="url(#rooms-logo-grad)" />
              <circle cx="20" cy="20" r="3" fill="url(#rooms-logo-grad)" />
              <defs>
                <linearGradient id="rooms-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#646cff" />
                  <stop offset="100%" stopColor="#41d1ff" />
                </linearGradient>
              </defs>
            </svg>
            <span className="rooms-brand-name">Helios</span>
          </Link>
          <nav className="rooms-nav">
            <Link to="/dashboard" className="rooms-nav-item">Dashboard</Link>
            <Link to="/rooms" className="rooms-nav-item rooms-nav-active">Rooms</Link>
            <Link to="/friends" className="rooms-nav-item">Friends</Link>
            <Link to="/profile" className="rooms-nav-item">Profile</Link>
            <Link to="/settings" className="rooms-nav-item">Settings</Link>
            <NotificationPanel />
            <button onClick={logout} className="rooms-nav-item rooms-nav-logout">Logout</button>
          </nav>
        </div>
      </header>

      <main className="rooms-main">
        <section className="rooms-content-section">
          <div className="rooms-layout">
            <aside className="rooms-sidebar">
              <div className="rooms-sidebar-header">
                <div className="rooms-sidebar-header-top">
                  <h2>All Rooms</h2>
                  <span className="rooms-count">{rooms.length}</span>
                </div>
                <button className="rooms-create-btn-sidebar" onClick={() => setShowCreateModal(true)}>
                  <span>＋ Create Room</span>
                </button>
              </div>

              {loading ? (
                <LoadingSkeleton type="card" count={3} />
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
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`room-card ${selectedRoom?.id === room.id ? 'room-card-active' : ''}`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className="room-card-header">
                        <h3>{room.name}</h3>
                        <span className="room-members-badge">{room.member_count}</span>
                      </div>
                      {room.post_title && <p className="room-post-title">{room.post_title}</p>}
                      <div className="room-creator">
                        <div className="creator-avatar">
                          {room.creator_profile_picture ? (
                            <img src={`http://localhost:5000/${room.creator_profile_picture}`} alt={room.creator_username} />
                          ) : (
                            getInitials(room.creator_username)
                          )}
                        </div>
                        <Link to={`/profile/${room.created_by}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <span>by {room.creator_username}</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>

            <div className="rooms-main-content">
              <div className="rooms-chat-wrapper">
                {selectedRoom ? (
                  <>
                    <div className="room-chat-header">
                      <div className="room-info">
                        <h2>{selectedRoom.name}</h2>
                        {selectedRoom.post_title && <p>{selectedRoom.post_title}</p>}
                      </div>
                      <div className="room-actions room-actions-secondary">
                        {selectedRoom.isMember && (
                          <>
                            {!inVoiceChat ? (
                              <button onClick={handleJoinVoiceChat} className="btn-voice-join" title="Join voice chat">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                  <line x1="12" y1="19" x2="12" y2="23"></line>
                                  <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                                <span>Voice</span>
                              </button>
                            ) : (
                              <div className="voice-controls-bar">
                                <button 
                                  onClick={handleToggleMute} 
                                  className={`btn-voice-control ${isMuted ? 'muted' : ''}`}
                                  title={isMuted ? 'Unmute' : 'Mute'}
                                >
                                  {isMuted ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="1" y1="1" x2="23" y2="23"></line>
                                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                      <line x1="12" y1="19" x2="12" y2="23"></line>
                                      <line x1="8" y1="23" x2="16" y2="23"></line>
                                    </svg>
                                  ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                      <line x1="12" y1="19" x2="12" y2="23"></line>
                                      <line x1="8" y1="23" x2="16" y2="23"></line>
                                    </svg>
                                  )}
                                </button>
                                <div className="voice-connection-status">
                                  <div className="voice-connection-icon"></div>
                                  <span className="voice-connection-text">Voice Connected</span>
                                </div>
                                <button onClick={handleLeaveVoiceChat} className="btn-voice-disconnect" title="Disconnect">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    <line x1="23" y1="1" x2="1" y2="23"></line>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </>
                        )}
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
                              const isOwn = msg.user_id === user.id;
                              return (
                                <div key={msg.id} className={`message ${isOwn ? 'message-own' : ''} ${isBot ? 'message-bot' : ''}`}>
                                  <div className="message-avatar">
                                    {isBot ? (
                                      <div className="avatar-bot">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="3" y="11" width="18" height="10" rx="2" />
                                          <circle cx="8" cy="15" r="1" />
                                          <circle cx="16" cy="15" r="1" />
                                          <path d="M9 7 h6" />
                                          <path d="M12 7 V11" />
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
                                      {isBot || msg.user_id === user.id ? (
                                        <span className={`message-username ${isBot ? 'bot-username' : ''}`}>
                                          {msg.username}
                                          {isBot && <span className="bot-badge">AI</span>}
                                        </span>
                                      ) : (
                                        <Link to={`/profile/${msg.user_id}`} className={`message-username ${isBot ? 'bot-username' : ''}`} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                                          {msg.username}
                                          {isBot && <span className="bot-badge">AI</span>}
                                        </Link>
                                      )}
                                      <span className="message-time">{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                    {msg.content && <p className="message-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>}
                                    {msg.file_name && (
                                      (() => {
                                        const isImage = msg.file_type && msg.file_type.startsWith('image/');
                                        const filename = msg.file_path?.split('/').pop();

                                        if (isImage) {
                                          return (
                                            <div className="message-image-container">
                                              <img src={`http://localhost:5000/${msg.file_path}`} alt={msg.file_name} className="message-image" />
                                              {filename && (
                                                <a href={`http://localhost:5000/api/messages/download/${filename}`} className="image-download-link" title="Descarcă imaginea">
                                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                  </svg>
                                                </a>
                                              )}
                                            </div>
                                          );
                                        }

                                        return (
                                          <a href={filename ? `http://localhost:5000/api/messages/download/${filename}` : '#'} className="message-file">
                                            <span className="file-icon">{getFileIcon(msg.file_name)}</span>
                                            <span className="file-info">
                                              <span className="file-name">{msg.file_name}</span>
                                              <span className="file-size">{formatFileSize(msg.file_size)}</span>
                                            </span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                              <polyline points="7 10 12 15 17 10" />
                                              <line x1="12" y1="15" x2="12" y2="3" />
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

                        {isUploading && (
                          <UploadProgress 
                            progress={uploadProgress}
                            fileName={uploadFileName}
                          />
                        )}

                        <form onSubmit={handleSendMessage} className="room-message-form">
                          {selectedFile && (
                            <div className="selected-file-preview">
                              <span className="file-icon">{getFileIcon(selectedFile.name)}</span>
                              <span className="file-name">{selectedFile.name}</span>
                              <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                              <button type="button" onClick={handleRemoveFile} className="btn-remove-file">&times;</button>
                            </div>
                          )}
                          <div className="message-input-row">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-attach" title="Atașează fișier">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                              </svg>
                            </button>
                            <input
                              type="text"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Scrie un mesaj... (sau întreabă bot-ul)"
                              className="message-input"
                            />
                            <button type="button" onClick={handleAskBot} disabled={askingBot || !messageText.trim()} className={`btn-bot ${askingBot ? 'btn-bot-thinking' : ''}`} title={askingBot ? 'Bot is thinking...' : 'Ask AI bot'}>
                              {askingBot ? (
                                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                                  <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
                                </svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="11" width="18" height="10" rx="2" />
                                  <circle cx="8" cy="15" r="1" />
                                  <circle cx="16" cy="15" r="1" />
                                  <path d="M9 7 h6" />
                                  <path d="M12 7 V11" />
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
                        <button onClick={handleJoinRoom} className="btn-join-large">Join Room</button>
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

            {selectedRoom && selectedRoom.isMember && (
              <aside className="rooms-right-sidebar">
                {(selectedRoom.description || selectedRoom.rules) && (
                  <div className="rooms-aux-block">
                    <div className="room-info-card">
                      <h3>Room Info</h3>
                      {selectedRoom.description && (
                        <div className="room-info-section">
                          <h4>Description</h4>
                          <p>{selectedRoom.description}</p>
                        </div>
                      )}
                      {selectedRoom.rules && (
                        <div className="room-info-section">
                          <h4>Rules</h4>
                          <p>{selectedRoom.rules}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rooms-aux-block">
                  <div className="rooms-gantt-section">
                    <div className="task-section">
                      <div className="task-header">
                        <h3>Tasks Timeline</h3>
                        <button
                          onClick={() => {
                            setEditingTask(null);
                            setNewTask({ title: '', description: '', start_date: '', end_date: '', priority: 'NORMAL' });
                            setShowTaskModal(true);
                          }}
                          className="btn-add-task"
                        >
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
                            {getGanttDays()
                              .reduce((weeks, day, idx) => {
                                if (idx % 7 === 0) weeks.push([]);
                                weeks[weeks.length - 1].push(day);
                                return weeks;
                              }, [])
                              .map((week, weekIdx) => (
                                <div key={weekIdx} className="calendar-grid-week">
                                  {week.map((day, dayIdx) => {
                                    const dateStr = day.toISOString().split('T')[0];
                                    const dayTasks = tasks.filter((t) => {
                                      const start = new Date(t.start_date);
                                      const end = new Date(t.end_date);
                                      start.setHours(0, 0, 0, 0);
                                      end.setHours(0, 0, 0, 0);
                                      const compareDay = new Date(day);
                                      compareDay.setHours(0, 0, 0, 0);
                                      return compareDay >= start && compareDay <= end;
                                    });

                                    const isToday = day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth();

                                    return (
                                      <div key={`${weekIdx}-${dayIdx}-${dateStr}`} className={`calendar-grid-day ${isToday ? 'calendar-today' : ''}`}>
                                        <div className="calendar-day-number">{day.getDate()}</div>
                                        <div className="calendar-day-tasks">
                                          {dayTasks.map((task) => (
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
                                                  {task.status === 'DONE' ? 'Done' : 'Pending'}
                                                </button>
                                                <button
                                                  className="badge-delete"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTask(task.id);
                                                  }}
                                                >
                                                  &times;
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
                </div>

                <div className="rooms-aux-block">
                  <div className="room-music-card">
                    <div className="room-music-top">
                      <div className="room-music-pill">Muzică</div>
                      {selectedRoom.music_added_by_username && <span className="room-music-by">de {selectedRoom.music_added_by_username}</span>}
                    </div>

                    <div className="room-music-title-row">
                      <div>
                        <p className="room-music-title">Muzică de fundal</p>
                        <p className="room-music-sub">YouTube pentru ambient, fără alte setări.</p>
                      </div>
                      {selectedRoom.music_updated_at && <span className="room-music-updated">{new Date(selectedRoom.music_updated_at).toLocaleString()}</span>}
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
                        <input type="text" value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} placeholder="Titlu (opțional)" />
                        <input type="url" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} placeholder="Link YouTube" />
                      </div>
                      <div className="room-music-actions">
                        <button type="submit" className="btn-save-music" disabled={savingMusic}>{savingMusic ? 'Se salvează...' : 'Salvează'}</button>
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
                  {inVoiceChat && (
                    <div className="voice-channel">
                      <div className="voice-channel-header">
                        <div className="voice-channel-title">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00204H3C2.45 8.00204 2 8.45304 2 9.00204V15.002C2 15.552 2.45 16.002 3 16.002H6L10.293 20.71C10.579 20.996 11.009 21.082 11.383 20.927C11.757 20.772 12 20.407 12 20.002V4.00204C12 3.59904 11.757 3.23204 11.383 3.07904ZM14 5.00195V7.00195C16.757 7.00195 19 9.24595 19 12.002C19 14.759 16.757 17.002 14 17.002V19.002C17.86 19.002 21 15.863 21 12.002C21 8.14295 17.86 5.00195 14 5.00195ZM14 9.00195C15.654 9.00195 17 10.349 17 12.002C17 13.657 15.654 15.002 14 15.002V13.002C14.551 13.002 15 12.553 15 12.002C15 11.451 14.551 11.002 14 11.002V9.00195Z"></path>
                          </svg>
                          <span>VOICE CHANNEL</span>
                        </div>
                        <span className="voice-count">{voiceUsers.length + 1}</span>
                      </div>
                      <div className="voice-users-list">
                        <div className={`voice-user-item ${speakingUsers.has('self') && !isMuted ? 'speaking' : ''}`}>
                          <div className="voice-user-avatar-wrapper">
                            <div className="voice-user-avatar">
                              {user.profile_picture ? (
                                <img src={`http://localhost:5000/${user.profile_picture}`} alt={user.username} />
                              ) : (
                                getInitials(user.username)
                              )}
                            </div>
                            {speakingUsers.has('self') && !isMuted && (
                              <div className="speaking-indicator">
                                <div key="ring-1" className="speaking-ring"></div>
                                <div key="ring-2" className="speaking-ring"></div>
                              </div>
                            )}
                          </div>
                          <div className="voice-user-info">
                            <span className="voice-user-name">{user.username}</span>
                            <div className="voice-user-icons">
                              {isMuted ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="voice-icon muted">
                                  <path d="M6.7 11H5C5 12.19 5.34 13.3 5.9 14.28L7.13 13.05C6.86 12.43 6.7 11.74 6.7 11Z"></path>
                                  <path d="M9.01 11.085C9.015 11.1225 9.02 11.16 9.02 11.2L9 11.14V11.085H9.01Z"></path>
                                  <path d="M11.7 11.76L14 9.46V11C14 11.89 13.55 12.67 12.88 13.17L13.94 14.23C15.06 13.44 15.83 12.18 15.98 10.74L17.99 10.72C17.82 12.76 16.66 14.51 15 15.58V18.58C17.96 17.23 20 14.35 20 11H18C18 13.68 16.44 16.01 14.29 17.11L15.85 18.67C18.69 17.25 20.7 14.4 20.98 11.12V10.88L21 10.74V11C21 15.23 18.48 18.82 14.94 20.27L16 21.33L6.66 12L5.6 10.94L1.27 6.61L2.67 5.21L9 11.54L9.01 11.085L9 11.14V11.2L11.7 11.76Z"></path>
                                  <path d="M9 11C9 8.24 11.24 6 14 6V4C10.14 4 7 7.14 7 11H9Z"></path>
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="voice-icon active">
                                  <path d="M12 2C11.0133 2 10.1267 2.38667 9.44 3.01333C8.86667 3.54667 8.53333 4.26667 8.53333 5V11C8.53333 11.7333 8.86667 12.4533 9.44 12.9867C10.1267 13.6133 11.0133 14 12 14C12.9867 14 13.8733 13.6133 14.56 12.9867C15.1333 12.4533 15.4667 11.7333 15.4667 11V5C15.4667 4.26667 15.1333 3.54667 14.56 3.01333C13.8733 2.38667 12.9867 2 12 2Z"></path>
                                  <path d="M10.6667 18.6667V22H13.3333V18.6667C16.9067 18.3067 19.6667 15.2533 19.6667 11.6667H17.3333C17.3333 14.6133 14.9467 17 12 17C9.05333 17 6.66667 14.6133 6.66667 11.6667H4.33333C4.33333 15.2533 7.09333 18.3067 10.6667 18.6667Z"></path>
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                        {voiceUsers.map((vu) => (
                          <div key={vu.userId} className={`voice-user-item ${speakingUsers.has(vu.userId) && !vu.isMuted ? 'speaking' : ''}`}>
                            <div className="voice-user-avatar-wrapper">
                              <div className="voice-user-avatar">
                                {vu.profilePicture ? (
                                  <img src={`http://localhost:5000/${vu.profilePicture}`} alt={vu.username} />
                                ) : (
                                  getInitials(vu.username)
                                )}
                              </div>
                              {speakingUsers.has(vu.userId) && !vu.isMuted && (
                                <div className="speaking-indicator">
                                  <div key="ring-1" className="speaking-ring"></div>
                                  <div key="ring-2" className="speaking-ring"></div>
                                </div>
                              )}
                            </div>
                            <div className="voice-user-info">
                              <span className="voice-user-name">{vu.username}</span>
                              <div className="voice-user-icons">
                                {vu.isMuted ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="voice-icon muted">
                                    <path d="M6.7 11H5C5 12.19 5.34 13.3 5.9 14.28L7.13 13.05C6.86 12.43 6.7 11.74 6.7 11Z"></path>
                                    <path d="M9.01 11.085C9.015 11.1225 9.02 11.16 9.02 11.2L9 11.14V11.085H9.01Z"></path>
                                    <path d="M11.7 11.76L14 9.46V11C14 11.89 13.55 12.67 12.88 13.17L13.94 14.23C15.06 13.44 15.83 12.18 15.98 10.74L17.99 10.72C17.82 12.76 16.66 14.51 15 15.58V18.58C17.96 17.23 20 14.35 20 11H18C18 13.68 16.44 16.01 14.29 17.11L15.85 18.67C18.69 17.25 20.7 14.4 20.98 11.12V10.88L21 10.74V11C21 15.23 18.48 18.82 14.94 20.27L16 21.33L6.66 12L5.6 10.94L1.27 6.61L2.67 5.21L9 11.54L9.01 11.085L9 11.14V11.2L11.7 11.76Z"></path>
                                    <path d="M9 11C9 8.24 11.24 6 14 6V4C10.14 4 7 7.14 7 11H9Z"></path>
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="voice-icon active">
                                    <path d="M12 2C11.0133 2 10.1267 2.38667 9.44 3.01333C8.86667 3.54667 8.53333 4.26667 8.53333 5V11C8.53333 11.7333 8.86667 12.4533 9.44 12.9867C10.1267 13.6133 11.0133 14 12 14C12.9867 14 13.8733 13.6133 14.56 12.9867C15.1333 12.4533 15.4667 11.7333 15.4667 11V5C15.4667 4.26667 15.1333 3.54667 14.56 3.01333C13.8733 2.38667 12.9867 2 12 2Z"></path>
                                    <path d="M10.6667 18.6667V22H13.3333V18.6667C16.9067 18.3067 19.6667 15.2533 19.6667 11.6667H17.3333C17.3333 14.6133 14.9467 17 12 17C9.05333 17 6.66667 14.6133 6.66667 11.6667H4.33333C4.33333 15.2533 7.09333 18.3067 10.6667 18.6667Z"></path>
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="members-header">
                    <h3>Members</h3>
                    <span className="members-count">{members.length}</span>
                  </div>
                  <div className="members-list">
                    {members.map((member) => {
                      const isOwner = member.id === selectedRoom?.created_by;
                      const isExpanded = expandedMemberId === member.id;
                      const canManage = (selectedRoom?.role === 'admin' || selectedRoom?.role === 'moderator') && !isOwner && member.id !== user?.id;
                      const canRemove = selectedRoom?.role === 'admin' || (selectedRoom?.role === 'moderator' && member.role === 'member');

                      return (
                        <div
                          key={member.user_id}
                          className={`member-item-simple ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => (canManage ? setExpandedMemberId(isExpanded ? null : member.id) : null)}
                          style={{ cursor: canManage ? 'pointer' : 'default' }}
                        >
                          <div className="member-row">
                            <div className="member-avatar">
                              {member.profile_picture ? (
                                <img src={`http://localhost:5000/${member.profile_picture}`} alt={member.username} />
                              ) : (
                                getInitials(member.username)
                              )}
                            </div>
                            <Link to={`/profile/${member.user_id}`} className="member-name" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {member.username}
                              {isOwner && <span className="owner-indicator">Owner</span>}
                            </Link>
                          </div>

                          {isExpanded && canManage && (
                            <div className="member-actions-dropdown">
                              {selectedRoom?.role === 'admin' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newRole = member.role === 'admin' ? 'member' : 'admin';
                                      handleUpdateMemberRole(member.id, newRole);
                                    }}
                                    className="action-btn"
                                  >
                                    {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newRole = member.role === 'moderator' ? 'member' : 'moderator';
                                      handleUpdateMemberRole(member.id, newRole);
                                    }}
                                    className="action-btn"
                                  >
                                    {member.role === 'moderator' ? 'Remove Moderator' : 'Make Moderator'}
                                  </button>
                                </>
                              )}
                              {canRemove && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMember(member.id);
                                    setExpandedMemberId(null);
                                  }}
                                  className="action-btn action-danger"
                                >
                                  Remove from room
                                </button>
                              )}
                              {selectedRoom?.created_by === user?.id && !isOwner && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTransferUserId(member.id);
                                    setShowTransferModal(true);
                                    setExpandedMemberId(null);
                                  }}
                                  className="action-btn action-transfer"
                                >
                                  Transfer ownership
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </section>
      </main>

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newRoom={newRoom}
        setNewRoom={setNewRoom}
        onSubmit={handleCreateRoom}
      />

      <TaskModal
        isOpen={showTaskModal && !!selectedRoom}
        onClose={() => setShowTaskModal(false)}
        editingTask={editingTask}
        newTask={newTask}
        setNewTask={setNewTask}
        onSubmit={handleCreateTask}
        savingTask={savingTask}
      />

      <RoomSettingsModal
        isOpen={showSettingsModal && !!selectedRoom && selectedRoom.role === 'admin'}
        onClose={() => setShowSettingsModal(false)}
        roomSettings={roomSettings}
        setRoomSettings={setRoomSettings}
        onSubmit={handleSaveSettings}
        savingSettings={savingSettings}
      />

      <TransferOwnershipModal
        isOpen={showTransferModal && !!selectedRoom && selectedRoom.created_by === user?.id}
        onClose={() => { setShowTransferModal(false); setSelectedTransferUserId(''); }}
        selectedTransferUserId={selectedTransferUserId}
        setSelectedTransferUserId={setSelectedTransferUserId}
        members={members}
        currentUserId={user?.id}
        onSubmit={handleTransferOwnership}
      />
    </div>
  );
}
