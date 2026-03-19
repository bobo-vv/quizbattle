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
const io = new Server(server);

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
  secret: process.env.SESSION_SECRET || 'quizbattle-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

// Share session with Socket.io
io.engine.use(sessionMiddleware);

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
