import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
const SPEAKING_LEVEL = 30;

// Peer-to-peer voice for one room. Signalling goes through the room's socket.
export function useVoiceChat(socket, roomId) {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [others, setOthers] = useState([]);
  const [speaking, setSpeaking] = useState(() => new Set());
  const stream = useRef(null);
  const peers = useRef({});
  const meters = useRef({});

  // Marks a participant as speaking while their volume is above the threshold.
  const meter = useCallback((id, mediaStream) => {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(mediaStream).connect(analyser);
    const levels = new Uint8Array(analyser.frequencyBinCount);
    let loud = false;

    const tick = () => {
      analyser.getByteFrequencyData(levels);
      const isLoud = levels.reduce((sum, level) => sum + level, 0) / levels.length > SPEAKING_LEVEL;
      // Runs every frame, so only touch state when the answer changes.
      if (isLoud !== loud) {
        loud = isLoud;
        setSpeaking((prev) => {
          const next = new Set(prev);
          next[isLoud ? 'add' : 'delete'](id);
          return next;
        });
      }
      meters.current[id].frame = requestAnimationFrame(tick);
    };
    meters.current[id] = { context };
    tick();
  }, []);

  const connect = useCallback(
    (userId, signal) => {
      const peer = new Peer({ initiator: !signal, trickle: true, stream: stream.current, config: ICE });
      peer.on('signal', (data) => socket.emit('voice-signal', { roomId, targetUserId: userId, signal: data }));
      peer.on('stream', (remote) => {
        const audio = new Audio();
        audio.srcObject = remote;
        audio.play().catch(() => {});
        peer.audio = audio;
        meter(userId, remote);
      });
      peer.on('error', () => {});
      if (signal) peer.signal(signal);
      peers.current[userId] = peer;
    },
    [socket, roomId, meter]
  );

  const drop = (userId) => {
    peers.current[userId]?.audio?.pause();
    peers.current[userId]?.destroy();
    delete peers.current[userId];
    if (meters.current[userId]) {
      cancelAnimationFrame(meters.current[userId].frame);
      meters.current[userId].context.close();
      delete meters.current[userId];
    }
  };

  const leave = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    [...Object.keys(peers.current), ...Object.keys(meters.current)].forEach(drop);
    socket?.emit('voice-leave-room', { roomId });
    setActive(false);
    setMuted(false);
    setOthers([]);
    setSpeaking(new Set());
  }, [socket, roomId]);

  const join = async () => {
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    meter('self', stream.current);
    setActive(true);
    socket.emit('voice-join-room', { roomId });
  };

  const toggleMute = () => {
    const track = stream.current.getAudioTracks()[0];
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
    socket.emit('voice-mute-toggle', { roomId, isMuted: !track.enabled });
  };

  useEffect(() => {
    if (!socket || !active) return;

    const onJoined = ({ userId, username, profilePicture }) => {
      setOthers((prev) => [...prev, { userId, username, profilePicture }]);
      connect(userId);
    };
    const onLeft = ({ userId }) => {
      setOthers((prev) => prev.filter((other) => other.userId !== userId));
      drop(userId);
    };
    const onSignal = ({ fromUserId, signal }) => {
      if (peers.current[fromUserId]) return peers.current[fromUserId].signal(signal);
      // Someone who was already in the call is reaching out to us.
      setOthers((prev) => [...prev, { userId: fromUserId }]);
      connect(fromUserId, signal);
    };
    const onMuted = ({ userId, isMuted }) =>
      setOthers((prev) => prev.map((other) => (other.userId === userId ? { ...other, isMuted } : other)));

    socket.on('voice-user-joined', onJoined);
    socket.on('voice-user-left', onLeft);
    socket.on('voice-signal', onSignal);
    socket.on('voice-user-muted', onMuted);
    return () => {
      socket.off('voice-user-joined', onJoined);
      socket.off('voice-user-left', onLeft);
      socket.off('voice-signal', onSignal);
      socket.off('voice-user-muted', onMuted);
    };
  }, [socket, active, connect]);

  // Hang up when the room changes or the page closes.
  useEffect(() => () => stream.current && leave(), [leave]);

  return { active, muted, others, speaking, join, leave, toggleMute };
}
