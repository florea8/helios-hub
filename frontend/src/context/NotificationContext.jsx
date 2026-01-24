import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { NotificationContext } from './notificationContextInstance';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { getSocket, connected } = useSocket();
  const [unreadMessages, setUnreadMessages] = useState({});
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Fetch initial unread counts
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCounts = async () => {
      try {
        // Fetch pending friend requests count
        const requestsRes = await api.get('/api/friends/requests/pending');
        setPendingFriendRequests(requestsRes.data.length);
      } catch (err) {
        console.error('Failed to fetch notification counts:', err);
      }
    };

    fetchUnreadCounts();
  }, [user]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  }, [removeNotification]);

  // Socket listeners for real-time notifications
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !connected) return;

    // Listen for new messages
    const handleNewMessage = (message) => {
      // Increment unread count for this sender
      setUnreadMessages(prev => ({
        ...prev,
        [message.sender_id]: (prev[message.sender_id] || 0) + 1
      }));

      // Add toast notification
      addNotification({
        id: Date.now(),
        type: 'message',
        title: 'New Message',
        message: `You have a new message`,
        senderId: message.sender_id
      });
    };

    // Listen for new friend requests
    const handleFriendRequest = (data) => {
      setPendingFriendRequests(prev => prev + 1);
      
      addNotification({
        id: Date.now(),
        type: 'friend_request',
        title: 'Friend Request',
        message: `${data.username || 'Someone'} sent you a friend request`,
        userId: data.userId
      });
    };

    // Listen for friend request accepted
    const handleFriendAccepted = (data) => {
      addNotification({
        id: Date.now(),
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${data.username || 'Someone'} accepted your friend request`,
        userId: data.userId
      });
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('friend_request_received', handleFriendRequest);
    socket.on('friend_request_accepted', handleFriendAccepted);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('friend_request_received', handleFriendRequest);
      socket.off('friend_request_accepted', handleFriendAccepted);
    };
  }, [getSocket, connected, addNotification]);

  const markMessagesAsRead = useCallback((userId) => {
    setUnreadMessages(prev => {
      const newUnread = { ...prev };
      delete newUnread[userId];
      return newUnread;
    });
  }, []);

  const decrementFriendRequests = useCallback(() => {
    setPendingFriendRequests(prev => Math.max(0, prev - 1));
  }, []);

  const getTotalUnreadMessages = useCallback(() => {
    return Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
  }, [unreadMessages]);

  const value = {
    unreadMessages,
    pendingFriendRequests,
    notifications,
    markMessagesAsRead,
    decrementFriendRequests,
    getTotalUnreadMessages,
    removeNotification,
    addNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
