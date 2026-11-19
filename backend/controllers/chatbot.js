const db = require('../config/db');
const { announceRoomMessage } = require('../utils/roomMessages');
const axios = require('axios');

// API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Simple fallback responses when no API is configured
const generateSimpleResponse = (message) => {
  const lowercaseMessage = message.toLowerCase();

  if (lowercaseMessage.match(/\b(salut|hello|hi|hey|buna|bună)\b/)) {
    return "👋 Salut! Sunt HeliosBot, asistentul virtual al acestui room. Cum te pot ajuta?";
  }

  if (lowercaseMessage.match(/\b(ajutor|help|ce poti|ce poți)\b/)) {
    return "🤖 Pot să te ajut cu:\n• Sfaturi despre task management\n• Sugestii pentru colaborare\n• Informații despre funcționalitățile Helios\n• Răspunsuri la întrebări generale\n\nÎntreabă-mă orice!";
  }

  if (lowercaseMessage.match(/\b(task|taskuri|sarcini)\b/)) {
    return "📋 Sfaturi pentru task-uri:\n• Împarte proiectele mari în task-uri mici\n• Setează deadline-uri realiste\n• Folosește priorități (HIGH/NORMAL/LOW)\n• Marchează task-urile complete pentru progres";
  }

  if (lowercaseMessage.match(/\b(c\+\+|cpp|program|cod|code)\b/)) {
    return "💻 Exemplu Hello World în C++:\n\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello World!\" << endl;\n    return 0;\n}\n```\n\nCompilează cu: `g++ program.cpp -o program`";
  }

  if (lowercaseMessage.match(/\b(python|py|script)\b/)) {
    return "🐍 Exemplu Hello World în Python:\n\n```python\nprint(\"Hello World!\")\n```\n\nRulează cu: `python program.py`";
  }

  if (lowercaseMessage.match(/\b(javascript|js|node)\b/)) {
    return "⚡ Exemplu Hello World în JavaScript:\n\n```javascript\nconsole.log(\"Hello World!\");\n```\n\nRulează în browser sau cu Node.js: `node program.js`";
  }

  if (lowercaseMessage.match(/\b(colaborare|echipă|team)\b/)) {
    return "👥 Sfaturi pentru colaborare:\n• Comunicați zilnic în chat\n• Partajați muzică pentru ambient\n• Verificați timeline-ul task-urilor\n• Respectați contribuțiile fiecăruia";
  }

  if (lowercaseMessage.match(/\b(productivitate|eficient|productiv)\b/)) {
    return "⚡ Pentru productivitate:\n• Lucrează în sesiuni de 25-50 min\n• Fă pauze scurte\n• Prioritizează task-urile importante\n• Folosește chat-ul pentru clarificări";
  }

  if (lowercaseMessage.match(/\b(mersi|mulțumesc|thanks)\b/)) {
    return "😊 Cu plăcere! Sunt aici să ajut!";
  }

  return "🤔 Interesant! Încearcă să întrebi despre task-uri, colaborare sau funcționalități. Scrie 'ajutor' pentru mai multe opțiuni!";
};

// Generate AI response using Groq API or Hugging Face fallback
const generateAIResponse = async (message, conversationHistory = []) => {
  // Try Groq API first if key is available
  if (GROQ_API_KEY) {
    try {
      const messages = [
        {
          role: 'system',
          content: `Tu ești HeliosBot, un asistent AI integrat într-o platformă de colaborare numită Helios. 
Ajuți utilizatorii cu întrebări despre funcționalități (rooms, tasks, colaborare), productivitate și lucrul în echipă.
Răspunde prietenos, concis și util. Folosește emoji-uri. Răspunde în limba întrebării (română sau engleză).`
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
        return "⚠️ Prea multe cereri. Încearcă din nou în câteva secunde.";
      }
      // Fall through to simple responses
    }
  }

  // Final fallback: simple rule-based responses
  console.log('Using simple fallback responses');
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

    // Create bot user if doesn't exist (id: 0, special bot user)
    const botUserCheck = db.prepare('SELECT * FROM users WHERE id = 0');
    let botUser = botUserCheck.get();

    if (!botUser) {
      // Create bot user
      const createBot = db.prepare(`
        INSERT INTO users (id, username, email, password_hash, profile_picture) 
        VALUES (0, 'HeliosBot', 'bot@helios.com', 'NO_PASSWORD', NULL)
      `);
      createBot.run();
      botUser = { id: 0, username: 'HeliosBot', profile_picture: null };
    }

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
    res.status(500).json({ message: 'Chatbot error', error: err.message });
  }
};
