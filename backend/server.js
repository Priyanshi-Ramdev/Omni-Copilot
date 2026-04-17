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
const { getDb } = require('./db/database');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Multer for file uploads
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ── REST: Auth Status ────────────────────────────────────────────────────────
app.get('/api/auth/status', async (req, res) => {
  const db = getDb();
  const tokens = db.prepare('SELECT service, connected_at FROM tokens').all();
  const connected = {};
  tokens.forEach(t => { connected[t.service] = { connected: true, connected_at: t.connected_at }; });
  res.json({ connected });
});

// ── REST: Google OAuth ───────────────────────────────────────────────────────
app.get('/auth/google', (req, res) => {
  const url = googleOAuth.getAuthUrl();
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await googleOAuth.handleCallback(code);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'google'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'google',error:'${err.message}'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  }
});

// ── REST: Notion OAuth ───────────────────────────────────────────────────────
app.get('/auth/notion', (req, res) => {
  const url = notionOAuth.getAuthUrl();
  res.redirect(url);
});

app.get('/auth/notion/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await notionOAuth.handleCallback(code);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'notion'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  } catch (err) {
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'notion',error:'${err.message}'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  }
});

// ── REST: Slack OAuth ────────────────────────────────────────────────────────
app.get('/auth/slack', (req, res) => {
  const url = slackOAuth.getAuthUrl();
  res.redirect(url);
});

app.get('/auth/slack/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await slackOAuth.handleCallback(code);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'slack'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  } catch (err) {
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'slack',error:'${err.message}'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  }
});

// ── REST: Zoom OAuth ────────────────────────────────────────────────────────
app.get('/auth/zoom', (req, res) => {
  const url = zoomOAuth.getAuthUrl();
  res.redirect(url);
});

app.get('/auth/zoom/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await zoomOAuth.handleCallback(code);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',service:'zoom'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  } catch (err) {
    console.error('Zoom OAuth error:', err);
    res.send(`<script>window.opener.postMessage({type:'OAUTH_ERROR',service:'zoom',error:'${err.message}'},'${process.env.FRONTEND_URL}');window.close();</script>`);
  }
});

// ── REST: Disconnect a service ───────────────────────────────────────────────
app.post('/api/auth/disconnect/:service', (req, res) => {
  const { service } = req.params;
  const db = getDb();
  db.prepare('DELETE FROM tokens WHERE service = ?').run(service);
  res.json({ success: true, message: `${service} disconnected` });
});

// ── REST: Task History ───────────────────────────────────────────────────────
app.get('/api/history', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 50').all();
  res.json(rows);
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

// ── Socket.IO: Real-time Chat ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('chat:message', async (payload) => {
    const { message, conversationId, attachments } = payload;
    console.log(`[Chat] Message from ${socket.id}: ${message}`);

    try {
      await orchestrator.execute({
        message,
        conversationId,
        attachments: attachments || [],
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
server.listen(PORT, () => {
  console.log(`\n🚀 OMNI Copilot Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections\n`);
  // Initialize DB
  getDb();
});
