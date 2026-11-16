/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user?.token) {
      return;
    }

    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: user.token
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket.io connected');
      setSocket(newSocket);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.io disconnected');
      setConnected(false);
    });

    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Store socket in ref
    socketRef.current = newSocket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user?.token]);

  const sendMessage = (recipientId, content) => {
    if (!socketRef.current || !connected) {
      console.error('Socket not connected');
      return;
    }
    socketRef.current.emit('send_message', { recipientId, content });
  };

  const startTyping = (recipientId) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit('typing', { recipientId });
  };

  const stopTyping = (recipientId) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit('stop_typing', { recipientId });
  };

  const getSocket = () => socketRef.current;

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  const value = {
    socket,
    connected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    getSocket,
    isUserOnline
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
