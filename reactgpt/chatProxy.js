const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const logFolderPath = path.join(__dirname, 'logs');

if (!fs.existsSync(logFolderPath)) {
  fs.mkdirSync(logFolderPath, { recursive: true });
}

const app = express();
const port = process.env.PORT || 5000;

const openaiConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(openaiConfiguration);

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many requests. Please try again later or you will be blocked.' });
  },
});

// Middleware for logging and blocking attackers
const blockedIPs = new Set();

const MAX_FAILED_REQUESTS = 3;
const WINDOW_SIZE = 60 * 1000; // 1 minute

const shouldBlock = (ip) => {
  if (blockedIPs.has(ip)) {
    return true;
  }

  const now = Date.now();
  const recentFailedRequests = failedRequests.filter((req) => req.ip === ip && now - req.timestamp < WINDOW_SIZE);

  if (recentFailedRequests.length >= MAX_FAILED_REQUESTS) {
    blockedIPs.add(ip);
    console.warn(`Blocked IP address: ${ip}`);
    logToFile(`Blocked IP address: ${ip}\n`);
    return true;
  }

  return false;
};

const failedRequests = [];

const logToFile = (message) => {
    const filePath = 'logs/server_errors.log';
    fs.appendFile(filePath, message, (err) => {
      if (err) {
        console.error('Failed to write error to file:', err);
      }
    });
  };
  
app.use((err, req, res, next) => {
  console.error(err.stack);
  logToFile(`${err.stack}\n`);

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const requestBody = JSON.stringify(req.body);
  const message = 'Internal Server Error. Your request has been logged and will be investigated.';

  console.error(`IP Address: ${ip}`);
  console.error(`User-Agent: ${userAgent}`);
  console.error(`Request Body: ${requestBody}`);

  logToFile(`IP Address: ${ip}\n`);
  logToFile(`User-Agent: ${userAgent}\n`);
  logToFile(`Request Body: ${requestBody}\n`);

  if (shouldBlock(ip)) {
    console.error(`Blocking IP Address: ${ip}`);
    logToFile(`Blocking IP Address: ${ip}\n`);
    return res.status(403).json({ message: 'Forbidden' });
  }

  return res.status(500).json({ message });
});

app.use(cors({ origin: 'https://wiki.ninj.ai' }));

app.post('/api/chat',
  body('messages').isArray().withMessage('messages must be an array'),
  limiter,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { messages } = req.body;
    const giveBirthToFrank = `You are an AI assistant named Frank.`;
    try {
      const initialSystemMessage = {
        role: 'system',
        content: giveBirthToFrank,
      };
      const openAIResponse = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          initialSystemMessage,
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        ],
      });
      const response = openAIResponse.data.choices[0].message.content;
      res.json(response);
    } catch (error) {
      console.error('Error communicating with OpenAI:', error);
      logToFile(`Error communicating with OpenAI: ${error}\n`);
      res.status(500).json({ message: 'Internal Server Error. Your request has been logged and will be investigated.' });
    }
  }
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});