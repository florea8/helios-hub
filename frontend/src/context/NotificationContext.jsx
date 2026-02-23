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
  const [persistentNotifications, setPersistentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch persistent notifications from backend
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/api/notifications?limit=50');
      setPersistentNotifications(res.data);
      
      // Update unread count
      const unreadRes = await api.get('/api/notifications/unread-count');
      setUnreadCount(unreadRes.data.count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  // Fetch initial unread counts
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCounts = async () => {
      try {
        // Fetch pending friend requests count
        const requestsRes = await api.get('/api/friends/requests/pending');
        setPendingFriendRequests(requestsRes.data.length);
        
        // Fetch notifications
        const res = await api.get('/api/notifications?limit=50');
        setPersistentNotifications(res.data);
        
        // Update unread count
        const unreadRes = await api.get('/api/notifications/unread-count');
        setUnreadCount(unreadRes.data.count);
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

    // Listen for new notifications from backend
    const handleNewNotification = (notification) => {
      // Refresh notifications from backend to get the saved notification
      fetchNotifications();

      // Update pending friend requests count if it's a friend request
      if (notification.type === 'FRIEND_REQUEST') {
        setPendingFriendRequests(prev => prev + 1);
      }

      // Add toast notification for immediate feedback
      addNotification({
        id: notification.id || Date.now(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link
      });
    };

    // Listen for new messages (for unread count only)
    const handleNewMessage = (message) => {
      // Increment unread count for this sender
      setUnreadMessages(prev => ({
        ...prev,
        [message.sender_id]: (prev[message.sender_id] || 0) + 1
      }));
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('receive_message', handleNewMessage);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('receive_message', handleNewMessage);
    };
  }, [getSocket, connected, addNotification, fetchNotifications]);

  const markMessagesAsRead = useCallback((userId) => {
    setUnreadMessages(prev => {
      const newUnread = { ...prev };
      delete newUnread[userId];
      return newUnread;
    });
    
    // Also refresh notifications to update count
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      setPersistentNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await api.put('/api/notifications/mark-all-read');
      setPersistentNotifications(prev => 
        prev.map(n => ({ ...n, read: 1 }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      setPersistentNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Refetch to update count
      const unreadRes = await api.get('/api/notifications/unread-count');
      setUnreadCount(unreadRes.data.count);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
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
    persistentNotifications,
    unreadCount,
    markMessagesAsRead,
    decrementFriendRequests,
    getTotalUnreadMessages,
    removeNotification,
    addNotification,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
