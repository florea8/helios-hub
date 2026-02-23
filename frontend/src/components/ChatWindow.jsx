import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';
import '../styles/ChatWindow.css';

const ChatWindow = ({ 
  recipient, 
  messages = [], 
  onSendMessage, 
  onClose = null,
  loading = false,
  className = ''
}) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={`chat-container ${className}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>{recipient.username}</h3>
          <p>{recipient.isOnline ? 'Online' : 'Offline'}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="chat-remove-btn">&times;</button>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-empty">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <span className="select-icon"></span>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <ChatMessage 
                key={msg.id || index} 
                message={msg} 
                isOwn={msg.isOwn}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={onSendMessage} placeholder={`Message ${recipient.username}...`} />
    </div>
  );
};

export default ChatWindow;
