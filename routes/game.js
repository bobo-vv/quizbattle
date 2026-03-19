const express = require('express');
const { pool } = require('../db/db');
const { requireAuth, getLimits } = require('../middleware/auth');

const router = express.Router();
const games = new Map();

function generatePin() {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (games.has(pin));
  return pin;
}

// POST /create - create a new game session
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { quizId, teamMode, teamCount } = req.body;
    if (!quizId) {
      return res.status(400).json({ error: 'quizId is required' });
    }

    // Load quiz with questions and options
    const quizResult = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND host_id = $2',
      [quizId, req.session.hostId]
    );
    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    const questionsResult = await pool.query(
      'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY sort_order ASC',
      [quiz.id]
    );

    const questions = questionsResult.rows;
    for (const question of questions) {
      const optionsResult = await pool.query(
        'SELECT * FROM options WHERE question_id = $1 ORDER BY sort_order ASC',
        [question.id]
      );
      question.options = optionsResult.rows;
    }

    quiz.questions = questions;

    // Get host's role for player limits
    const hostResult = await pool.query('SELECT role FROM hosts WHERE id = $1', [req.session.hostId]);
    const hostRole = hostResult.rows.length > 0 ? hostResult.rows[0].role : 'member';
    const limits = getLimits(hostRole);

    const pin = generatePin();

    const game = {
      pin,
      hostId: req.session.hostId,
      quizId: quiz.id,
      quiz: { title: quiz.title, questions },
      players: new Map(),
      state: 'lobby',
      currentQuestion: -1,
      timer: null,
      maxPlayers: limits.maxPlayers,
      teamMode: teamMode || false,
      teamCount: (teamMode && teamCount >= 2 && teamCount <= 4) ? teamCount : 0,
      teamNextIndex: 0,
    };

    games.set(pin, game);

    res.status(201).json({ pin });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /history - list past game sessions for logged-in host
router.get('/history', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM game_sessions WHERE host_id = $1 ORDER BY ended_at DESC LIMIT 50`,
      [req.session.hostId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /history/:id - get game detail with players and answers
router.get('/history/:id', requireAuth, async (req, res) => {
  try {
    const session = await pool.query(
      'SELECT * FROM game_sessions WHERE id = $1 AND host_id = $2',
      [req.params.id, req.session.hostId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const players = await pool.query(
      'SELECT * FROM game_players WHERE game_session_id = $1 ORDER BY final_rank ASC',
      [req.params.id]
    );
    const answers = await pool.query(
      'SELECT * FROM player_answers WHERE game_session_id = $1 ORDER BY nickname, question_id',
      [req.params.id]
    );

    res.json({
      session: session.rows[0],
      players: players.rows,
      answers: answers.rows,
    });
  } catch (err) {
    console.error('Get history detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:pin - get game info
router.get('/:pin', (req, res) => {
  try {
    const game = games.get(req.params.pin);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const playersList = [];
    game.players.forEach((player, socketId) => {
      playersList.push({ nickname: player.nickname, score: player.score });
    });

    res.json({
      pin: game.pin,
      quizTitle: game.quiz.title,
      state: game.state,
      playerCount: game.players.size,
      players: playersList,
      totalQuestions: game.quiz.questions.length,
      currentQuestion: game.currentQuestion,
    });
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, games };
