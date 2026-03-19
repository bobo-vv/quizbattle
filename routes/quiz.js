const express = require('express');
const { pool } = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// GET / - list all quizzes for logged-in host
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id)::int as question_count
       FROM quizzes q WHERE q.host_id = $1 ORDER BY q.updated_at DESC`,
      [req.session.hostId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List quizzes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create quiz
router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      'INSERT INTO quizzes (host_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [req.session.hostId, title, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get quiz with questions and options
router.get('/:id', async (req, res) => {
  try {
    const quizResult = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND host_id = $2',
      [req.params.id, req.session.hostId]
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
    res.json(quiz);
  } catch (err) {
    console.error('Get quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update quiz
router.put('/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await pool.query(
      'UPDATE quizzes SET title = COALESCE($1, title), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 AND host_id = $4 RETURNING *',
      [title, description, req.params.id, req.session.hostId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete quiz
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM quizzes WHERE id = $1 AND host_id = $2 RETURNING id',
      [req.params.id, req.session.hostId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/duplicate - duplicate quiz with all questions and options
router.post('/:id/duplicate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quizResult = await client.query(
      'SELECT * FROM quizzes WHERE id = $1 AND host_id = $2',
      [req.params.id, req.session.hostId]
    );
    if (quizResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const originalQuiz = quizResult.rows[0];

    const newQuizResult = await client.query(
      'INSERT INTO quizzes (host_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [req.session.hostId, originalQuiz.title + ' (Copy)', originalQuiz.description]
    );
    const newQuiz = newQuizResult.rows[0];

    const questionsResult = await client.query(
      'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY sort_order ASC',
      [originalQuiz.id]
    );

    for (const question of questionsResult.rows) {
      const newQuestionResult = await client.query(
        'INSERT INTO questions (quiz_id, type, question_text, image_url, time_limit, points, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [newQuiz.id, question.type, question.question_text, question.image_url, question.time_limit, question.points, question.sort_order]
      );
      const newQuestionId = newQuestionResult.rows[0].id;

      const optionsResult = await client.query(
        'SELECT * FROM options WHERE question_id = $1 ORDER BY sort_order ASC',
        [question.id]
      );

      for (const option of optionsResult.rows) {
        await client.query(
          'INSERT INTO options (question_id, option_text, is_correct, sort_order) VALUES ($1, $2, $3, $4)',
          [newQuestionId, option.option_text, option.is_correct, option.sort_order]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newQuiz);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Duplicate quiz error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /:id/questions - add question
router.post('/:id/questions', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify quiz belongs to host
    const quizResult = await client.query(
      'SELECT id FROM quizzes WHERE id = $1 AND host_id = $2',
      [req.params.id, req.session.hostId]
    );
    if (quizResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const { type, question_text, image_url, time_limit, points, sort_order, options } = req.body;
    if (!question_text) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'question_text is required' });
    }

    const questionResult = await client.query(
      'INSERT INTO questions (quiz_id, type, question_text, image_url, time_limit, points, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.params.id, type || 'multiple_choice', question_text, image_url || '', time_limit || 20, points || 1000, sort_order || 0]
    );
    const question = questionResult.rows[0];

    question.options = [];
    if (options && Array.isArray(options)) {
      for (const opt of options) {
        const optResult = await client.query(
          'INSERT INTO options (question_id, option_text, is_correct, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
          [question.id, opt.option_text, opt.is_correct || false, opt.sort_order || 0]
        );
        question.options.push(optResult.rows[0]);
      }
    }

    // Update quiz updated_at
    await client.query('UPDATE quizzes SET updated_at = NOW() WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.status(201).json(question);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /questions/:questionId - update question
router.put('/questions/:questionId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify question belongs to a quiz owned by host
    const checkResult = await client.query(
      `SELECT q.id, q.quiz_id FROM questions q
       JOIN quizzes qz ON q.quiz_id = qz.id
       WHERE q.id = $1 AND qz.host_id = $2`,
      [req.params.questionId, req.session.hostId]
    );
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Question not found' });
    }

    const quizId = checkResult.rows[0].quiz_id;
    const { type, question_text, image_url, time_limit, points, sort_order, options } = req.body;

    const questionResult = await client.query(
      `UPDATE questions SET
        type = COALESCE($1, type),
        question_text = COALESCE($2, question_text),
        image_url = COALESCE($3, image_url),
        time_limit = COALESCE($4, time_limit),
        points = COALESCE($5, points),
        sort_order = COALESCE($6, sort_order)
       WHERE id = $7 RETURNING *`,
      [type, question_text, image_url, time_limit, points, sort_order, req.params.questionId]
    );
    const question = questionResult.rows[0];

    // Replace options if provided
    if (options && Array.isArray(options)) {
      await client.query('DELETE FROM options WHERE question_id = $1', [question.id]);
      question.options = [];
      for (const opt of options) {
        const optResult = await client.query(
          'INSERT INTO options (question_id, option_text, is_correct, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
          [question.id, opt.option_text, opt.is_correct || false, opt.sort_order || 0]
        );
        question.options.push(optResult.rows[0]);
      }
    } else {
      const optionsResult = await client.query(
        'SELECT * FROM options WHERE question_id = $1 ORDER BY sort_order ASC',
        [question.id]
      );
      question.options = optionsResult.rows;
    }

    await client.query('UPDATE quizzes SET updated_at = NOW() WHERE id = $1', [quizId]);

    await client.query('COMMIT');
    res.json(question);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE /questions/:questionId - delete question
router.delete('/questions/:questionId', async (req, res) => {
  try {
    const checkResult = await pool.query(
      `SELECT q.id, q.quiz_id FROM questions q
       JOIN quizzes qz ON q.quiz_id = qz.id
       WHERE q.id = $1 AND qz.host_id = $2`,
      [req.params.questionId, req.session.hostId]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const quizId = checkResult.rows[0].quiz_id;
    await pool.query('DELETE FROM questions WHERE id = $1', [req.params.questionId]);
    await pool.query('UPDATE quizzes SET updated_at = NOW() WHERE id = $1', [quizId]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/questions/reorder - reorder questions
router.put('/:id/questions/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quizResult = await client.query(
      'SELECT id FROM quizzes WHERE id = $1 AND host_id = $2',
      [req.params.id, req.session.hostId]
    );
    if (quizResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const items = req.body; // [{id, sort_order}, ...]
    if (!Array.isArray(items)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Expected an array of {id, sort_order}' });
    }

    for (const item of items) {
      await client.query(
        'UPDATE questions SET sort_order = $1 WHERE id = $2 AND quiz_id = $3',
        [item.sort_order, item.id, req.params.id]
      );
    }

    await client.query('UPDATE quizzes SET updated_at = NOW() WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reorder questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
