import React from 'react';
import '../styles/ChatMessage.css';

const ChatMessage = ({ 
  message, 
  isOwn = false
}) => {
  return (
    <div className={`chat-message ${isOwn ? 'own' : 'other'}`}>
      <p>{message.content}</p>
    </div>
  );
};

export default ChatMessage;
