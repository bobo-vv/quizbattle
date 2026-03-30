require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

const { pool, initDB } = require('./db/db');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const { router: gameRoutes } = require('./routes/game');
const adminRoutes = require('./routes/admin');
const gameHandler = require('./socket/gameHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Render.com proxy-friendly settings
  transports: ['websocket', 'polling'],  // prefer WebSocket, fallback to polling
  pingTimeout: 60000,                     // wait 60s before considering connection dead
  pingInterval: 25000,                    // ping every 25s to keep connection alive
  maxHttpBufferSize: 1e6,                 // 1MB max message size
  connectTimeout: 10000,                  // 10s handshake timeout
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for Render.com (needed for secure cookies)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session
const sessionMiddleware = session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || (() => {
    const fallback = require('crypto').randomBytes(32).toString('hex');
    if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: SESSION_SECRET not set — using random secret (sessions will reset on restart)');
    }
    return fallback;
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
});

app.use(sessionMiddleware);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler — prevent stack trace leaks
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// NOTE: Session middleware removed from Socket.io to reduce DB load.
// Players don't need HTTP sessions — they identify via pin + nickname over socket.
// Only host routes (Express) use sessions for authentication.

// Socket.io handler
gameHandler(io);

// Start server
const PORT = process.env.PORT || 3000;

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
