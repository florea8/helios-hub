// Utility functions for socket operations
export const isUserOnline = (userId, onlineUsers) => {
  return onlineUsers.includes(userId);
};
