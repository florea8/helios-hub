const ChatMessage = ({ message, isOwn = false }) => (
  <p className="chat-message" data-me={isOwn || undefined}>
    {message.content}
  </p>
);

export default ChatMessage;
