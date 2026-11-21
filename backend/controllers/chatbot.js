const db = require('../config/db');
const { announceRoomMessage } = require('../utils/roomMessages');
const axios = require('axios');

// API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Rule-based answers for when no AI key is configured or the AI service fails.
const FALLBACK = [
  [/\b(hello|hi|hey)\b/, "Hi, I'm the Helios assistant. Ask me about rooms, tasks or working with your group."],
  [/\b(help|what can you)\b/, 'I can help with:\n- planning tasks and deadlines\n- keeping a group project moving\n- how rooms, tasks and voice work in Helios'],
  [/\b(tasks?|deadlines?)\b/, 'Some task tips:\n- split big work into small tasks\n- give each a realistic due date\n- use HIGH priority sparingly\n- tick tasks off so the room sees progress'],
  [/\b(team|group|together|collaborat\w*)\b/, 'To keep a group moving:\n- agree on the goal in the room description\n- give every task an owner\n- check in here at least once a day\n- use voice for quick decisions'],
  [/\b(thanks|thank you)\b/, 'Glad to help.'],
];

const generateSimpleResponse = (message) =>
  FALLBACK.find(([pattern]) => pattern.test(message.toLowerCase()))?.[1] ||
  'Ask me about tasks, deadlines or working as a group. Write "help" to see what I can do.';

// Generate AI response using the Groq API, falling back to the rules above
const generateAIResponse = async (message, conversationHistory = []) => {
  // Try Groq API first if key is available
  if (GROQ_API_KEY) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are the Helios assistant, built into Helios, a place where people with shared interests meet to discuss, solve problems and build projects together.
You help a room's members with its topic, with planning their tasks and with working as a group.
Be friendly, short and practical. Answer in the language of the question.`
        },
        ...conversationHistory.slice(-5).map(msg => ({
          role: msg.isBot ? 'assistant' : 'user',
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: 'llama-3.3-70b-versatile', // Updated model
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Groq API error:', error.response?.data?.error?.message || error.message);
      
      if (error.response?.status === 429) {
        return 'Too many questions at once. Try again in a few seconds.';
      }
      // Fall through to simple responses
    }
  }

  // Final fallback: simple rule-based responses
  return generateSimpleResponse(message);
};

// Handle chatbot message
exports.handleChatbotMessage = async (req, res) => {
  const { roomId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!roomId || !content) {
    return res.status(400).json({ message: 'Room ID and content required' });
  }

  try {
    // Check if user is member of room
    const memberCheck = db.prepare('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?');
    const isMember = memberCheck.get(roomId, userId);

    if (!isMember) {
      return res.status(403).json({ message: 'You must be a room member' });
    }

    // Get recent conversation history for context (last 10 messages)
    const historyStmt = db.prepare(`
      SELECT m.content, m.user_id, u.username 
      FROM messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.room_id = ? 
      ORDER BY m.created_at DESC 
      LIMIT 10
    `);
    const history = historyStmt.all(roomId);
    const conversationHistory = history.reverse().map(msg => ({
      content: msg.content,
      isBot: msg.user_id === 0
    }));

    // Generate AI response using Groq
    const botResponse = await generateAIResponse(content, conversationHistory);

    // The assistant's account (user 0) is created at startup.
    // Insert bot message
    const stmt = db.prepare('INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)');
    const result = stmt.run(roomId, 0, botResponse);

    // Get the complete message with bot info
    const msgStmt = db.prepare(`
      SELECT m.*, u.username, u.profile_picture 
      FROM messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.id = ?
    `);
    const message = msgStmt.get(result.lastInsertRowid);

    announceRoomMessage(message);
    res.status(201).json({
      botMessage: message,
      originalMessage: content
    });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ message: 'Chatbot error' });
  }
};
