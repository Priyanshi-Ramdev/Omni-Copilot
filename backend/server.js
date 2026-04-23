require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const orchestrator = require('./orchestrator');
const googleOAuth = require('./auth/googleOAuth');
const notionOAuth = require('./auth/notionOAuth');
const slackOAuth = require('./auth/slackOAuth');
const zoomOAuth = require('./auth/zoomOAuth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, User, Token, Conversation, Message, Analytics, Memory } = require('./db/database');

const JWT_SECRET = process.env.SESSION_SECRET || 'omni_secret_jwt_2026';

// ── Auth Middleware ──────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findOne({ _id: decoded.id }).select('-password');
    if (!req.user) throw new Error('User not found');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Accept any localhost origin for dev resilience (handles Vite port auto-increment)
const corsOrigin = (origin, callback) => {
  if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
    callback(null, true);
  } else if (origin === FRONTEND_URL) {
    callback(null, true);
  } else {
    callback(new Error(`CORS blocked: ${origin}`));
  }
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await new User({ name, email, password: hashedPassword }).save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ id: user._id, name: user.name, email: user.email, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ id: user._id, name: user.name, email: user.email, token });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', protect, (req, res) => {
  res.json(req.user);
});

// Multer for file uploads
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ── REST: Auth Status ────────────────────────────────────────────────────────
app.get('/api/auth/status', protect, async (req, res) => {
  try {
    const tokens = await Token.find({ userId: req.user._id });
    const connected = {};
    tokens.forEach(t => { connected[t.service] = { connected: true, connected_at: t.connected_at }; });
    res.json({ connected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REST: Google OAuth ───────────────────────────────────────────────────────
app.get('/auth/google', (req, res) => {
  const { token } = req.query;
  const url = googleOAuth.getAuthUrl(token);
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query; // state is the JWT token
    const decoded = jwt.verify(state, JWT_SECRET);
    await googleOAuth.handleCallback(code, decoded.id);
    console.log(`[Auth] Google connected for user: ${decoded.id}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'google'},'*');window.close();</script>`);
  } catch (err) {
    console.error(`[Auth Error] Google callback: ${err.message}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'google',error:'${err.message}'},'*');window.close();</script>`);
  }
});

// ── REST: Notion OAuth ───────────────────────────────────────────────────────
app.get('/auth/notion', (req, res) => {
  const { token } = req.query;
  const url = notionOAuth.getAuthUrl(token);
  res.redirect(url);
});

app.get('/auth/notion/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const decoded = jwt.verify(state, JWT_SECRET);
    await notionOAuth.handleCallback(code, decoded.id);
    console.log(`[Auth] Notion connected for user: ${decoded.id}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'notion'},'*');window.close();</script>`);
  } catch (err) {
    console.error(`[Auth Error] Notion callback: ${err.message}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'notion',error:'${err.message}'},'*');window.close();</script>`);
  }
});

// ── REST: Slack OAuth ────────────────────────────────────────────────────────
app.get('/auth/slack', (req, res) => {
  const { token } = req.query;
  const url = slackOAuth.getAuthUrl(token);
  res.redirect(url);
});

app.get('/auth/slack/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const decoded = jwt.verify(state, JWT_SECRET);
    await slackOAuth.handleCallback(code, decoded.id);
    console.log(`[Auth] Slack connected for user: ${decoded.id}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'slack'},'*');window.close();</script>`);
  } catch (err) {
    console.error(`[Auth Error] Slack callback: ${err.message}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'slack',error:'${err.message}'},'*');window.close();</script>`);
  }
});

// ── REST: Zoom OAuth ────────────────────────────────────────────────────────
app.get('/auth/zoom', (req, res) => {
  const { token } = req.query;
  const url = zoomOAuth.getAuthUrl(token);
  res.redirect(url);
});

app.get('/auth/zoom/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const decoded = jwt.verify(state, JWT_SECRET);
    await zoomOAuth.handleCallback(code, decoded.id);
    console.log(`[Auth] Zoom connected for user: ${decoded.id}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'zoom'},'*');window.close();</script>`);
  } catch (err) {
    console.error(`[Auth Error] Zoom callback: ${err.message}`);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'zoom',error:'${err.message}'},'*');window.close();</script>`);
  }
});

// ── REST: Disconnect a service ───────────────────────────────────────────────
app.post('/api/auth/disconnect/:service', protect, async (req, res) => {
  const { service } = req.params;
  await Token.deleteOne({ service, userId: req.user._id });
  res.json({ success: true, message: `${service} disconnected` });
});

// ── REST: History ───────────────────────────────────────────────────────────
app.get('/api/history', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id }).sort({ updated_at: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history/:id', protect, async (req, res) => {
  try {
    const messages = await Message.find({ conversation_id: req.params.id }).sort({ created_at: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REST: File Upload for Analysis ──────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const base64 = req.file.buffer.toString('base64');
  res.json({
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    data: base64,
  });
});

// ── REST: Analytics ─────────────────────────────────────────────────────────
app.get('/api/analytics', protect, async (req, res) => {
  try {
    const stats = await Analytics.find({ userId: req.user._id, event_type: 'tool_hit' });
    const counts = {};
    stats.forEach(s => {
      counts[s.tool_name] = (counts[s.tool_name] || 0) + 1;
    });

    const chartData = Object.entries(counts).map(([name, value]) => ({ 
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      value 
    }));
    
    res.json({ counts, chartData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Socket.IO Logic ──────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: Token missing'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.userId})`);

  socket.on('chat:message', async (payload) => {
    const { message, conversationId, attachments } = payload;
    console.log(`[Chat] Message from ${socket.id}: ${message}`);

    try {
      await orchestrator.execute({
        message,
        conversationId,
        attachments: attachments || [],
        userId: socket.userId,
        onStep: (step) => socket.emit('chat:step', step),
        onChunk: (chunk) => socket.emit('chat:chunk', chunk),
        onComplete: (result) => socket.emit('chat:complete', result),
        onError: (error) => socket.emit('chat:error', { error: error.message }),
        onRequestAction: (action) => {
          return new Promise((resolve) => {
            socket.emit('chat:action_required', action);
            const handler = (response) => {
              socket.off(`chat:action_response:${action.id}`, handler);
              resolve(response);
            };
            socket.on(`chat:action_response:${action.id}`, handler);
          });
        },
      });
    } catch (err) {
      console.error('[Orchestrator Error]', err);
      socket.emit('chat:error', { error: err.message || 'An unexpected error occurred.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  await getDb();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 OMNI Copilot Backend running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready for connections\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

