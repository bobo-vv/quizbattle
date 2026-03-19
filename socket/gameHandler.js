const { games } = require('../routes/game');

function gameHandler(io) {
  io.on('connection', (socket) => {

    // host-join: host joins socket room without being a player
    socket.on('host-join', ({ pin }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }
      socket.join(pin);
      game.hostSocketId = socket.id;
      socket.emit('host-joined', {
        pin: game.pin,
        quizTitle: game.quiz.title,
        totalQuestions: game.quiz.questions.length,
        players: getPlayersList(game),
      });
    });

    // join-game: player joins
    socket.on('join-game', ({ pin, nickname, avatar }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }
      if (game.state === 'finished') {
        return socket.emit('error', { message: 'Game has already ended' });
      }
      if (!nickname || nickname.length > 20) {
        return socket.emit('error', { message: 'Invalid nickname' });
      }

      // Check for duplicate nickname - allow reconnection (replace old socket)
      let existingSocketId = null;
      game.players.forEach((player, sid) => {
        if (player.nickname === nickname) {
          existingSocketId = sid;
        }
      });

      if (existingSocketId) {
        // Reconnecting player - preserve score and answers
        const oldPlayer = game.players.get(existingSocketId);
        game.players.delete(existingSocketId);
        game.players.set(socket.id, oldPlayer);
      } else {
        // New player
        if (game.state !== 'lobby') {
          return socket.emit('error', { message: 'Game has already started' });
        }
        // Check player limit
        if (game.maxPlayers && game.players.size >= game.maxPlayers) {
          return socket.emit('error', { message: 'Game is full (max ' + game.maxPlayers + ' players)' });
        }
        game.players.set(socket.id, {
          nickname,
          avatar: avatar || '',
          score: 0,
          streak: 0,
          answers: [],
        });
      }

      socket.join(pin);

      const players = getPlayersList(game);

      // Notify everyone in the room (including host)
      io.to(pin).emit('player-joined', {
        nickname,
        playerCount: game.players.size,
        players,
      });

      // Confirm to joining player
      socket.emit('game-joined', {
        pin: game.pin,
        quizTitle: game.quiz.title,
        totalQuestions: game.quiz.questions.length,
      });
    });

    // start-game
    socket.on('start-game', ({ pin }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }
      if (game.players.size === 0) {
        return socket.emit('error', { message: 'No players have joined' });
      }
      if (!game.quiz.questions || game.quiz.questions.length === 0) {
        return socket.emit('error', { message: 'This quiz has no questions. Please add questions first.' });
      }

      game.state = 'countdown';
      io.to(pin).emit('game-countdown', {
        totalQuestions: game.quiz.questions.length,
      });

      // 4-second countdown (3-2-1-GO!) then start
      setTimeout(() => {
        game.state = 'playing';
        io.to(pin).emit('game-started', {
          totalQuestions: game.quiz.questions.length,
        });
        sendQuestion(io, game);
      }, 4000);
    });

    // next-question: from leaderboard/halftime → next question
    socket.on('next-question', ({ pin }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }

      sendQuestion(io, game);
    });

    // show-results: from review → show leaderboard or halftime (skip the 5s wait)
    socket.on('show-results', ({ pin }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }
      if (game.state !== 'answer_review') {
        return; // only valid during review
      }
      // Clear the auto-timer
      if (game.timer) {
        clearTimeout(game.timer);
        game.timer = null;
      }
      showLeaderboardOrHalftime(io, game);
    });

    // submit-answer
    socket.on('submit-answer', ({ pin, questionId, optionId, timeRemaining }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }

      const player = game.players.get(socket.id);
      if (!player) {
        return socket.emit('error', { message: 'Player not found in game' });
      }

      if (game.state !== 'question') {
        return socket.emit('error', { message: 'Not accepting answers right now' });
      }

      const questionIndex = game.currentQuestion;
      const question = game.quiz.questions[questionIndex];
      if (!question) {
        return socket.emit('error', { message: 'Invalid question' });
      }

      // Check if player already answered this question
      const alreadyAnswered = player.answers.find((a) => a.questionIndex === questionIndex);
      if (alreadyAnswered) {
        return socket.emit('error', { message: 'Already answered this question' });
      }

      // Find selected option and check correctness
      const selectedOption = question.options.find((o) => o.id === optionId);
      const isCorrect = selectedOption ? selectedOption.is_correct : false;

      let scoreGained = 0;
      if (isCorrect) {
        const basePoints = question.points;
        const timeLimit = question.time_limit;
        const safeTimeRemaining = Math.max(0, Math.min(timeRemaining, timeLimit));
        const speedBonus = Math.round((safeTimeRemaining / timeLimit) * 500);
        scoreGained = basePoints + speedBonus;
        player.score += scoreGained;
        player.streak += 1;
      } else {
        player.streak = 0;
      }

      player.answers.push({
        questionIndex,
        optionId,
        isCorrect,
        scoreGained,
      });

      // Emit result to answering player
      socket.emit('answer-result', {
        isCorrect,
        scoreGained,
        totalScore: player.score,
        streak: player.streak,
      });

      // Count how many have answered
      let answeredCount = 0;
      game.players.forEach((p) => {
        if (p.answers.find((a) => a.questionIndex === questionIndex)) {
          answeredCount++;
        }
      });

      // Notify host with answer count
      io.to(pin).emit('player-answered', {
        answeredCount,
        totalPlayers: game.players.size,
      });

      // If all players answered, trigger time-up immediately
      if (answeredCount >= game.players.size) {
        if (game.timer) {
          clearTimeout(game.timer);
        }
        triggerTimeUp(io, game);
      }
    });

    // reaction: player sends emoji reaction (fire and forget)
    socket.on('reaction', ({ pin, emoji }) => {
      const game = games.get(pin);
      if (!game) return;
      const player = game.players.get(socket.id);
      if (!player) return;
      // Broadcast to everyone in room (including host)
      io.to(pin).emit('reaction', { nickname: player.nickname, emoji: emoji });
    });

    // disconnect
    socket.on('disconnect', () => {
      games.forEach((game, pin) => {
        if (game.players.has(socket.id)) {
          const player = game.players.get(socket.id);
          game.players.delete(socket.id);
          io.to(pin).emit('player-left', {
            nickname: player.nickname,
            playerCount: game.players.size,
            players: getPlayersList(game),
          });
        }
      });
    });
  });
}

function getPlayersList(game) {
  const players = [];
  game.players.forEach((player) => {
    players.push({ nickname: player.nickname, avatar: player.avatar || '', score: player.score });
  });
  return players;
}

function sendQuestion(io, game) {
  game.currentQuestion += 1;

  // Check if all questions are done
  if (game.currentQuestion >= game.quiz.questions.length) {
    game.state = 'finished';

    const rankings = getRankings(game);
    io.to(game.pin).emit('game-ended', { rankings });

    // Clean up timer
    if (game.timer) {
      clearTimeout(game.timer);
      game.timer = null;
    }
    return;
  }

  game.state = 'question';

  const question = game.quiz.questions[game.currentQuestion];

  // Send question WITHOUT is_correct on options
  const safeOptions = question.options.map((o) => ({
    id: o.id,
    option_text: o.option_text,
    sort_order: o.sort_order,
  }));

  io.to(game.pin).emit('question', {
    questionIndex: game.currentQuestion,
    totalQuestions: game.quiz.questions.length,
    id: question.id,
    type: question.type,
    question_text: question.question_text,
    image_url: question.image_url,
    time_limit: question.time_limit,
    points: question.points,
    options: safeOptions,
  });

  // Start countdown timer
  if (game.timer) {
    clearTimeout(game.timer);
  }

  game.timer = setTimeout(() => {
    triggerTimeUp(io, game);
  }, question.time_limit * 1000);
}

function triggerTimeUp(io, game) {
  if (game.state !== 'question') return;

  game.state = 'answer_review';

  const question = game.quiz.questions[game.currentQuestion];
  const correctOption = question.options.find((o) => o.is_correct);
  const correctOptionId = correctOption ? correctOption.id : null;

  // Count correct/wrong answers
  let correctCount = 0;
  let wrongCount = 0;
  game.players.forEach((player) => {
    const answer = player.answers.find((a) => a.questionIndex === game.currentQuestion);
    if (answer) {
      if (answer.isCorrect) correctCount++;
      else wrongCount++;
    } else {
      wrongCount++; // didn't answer = wrong
    }
  });

  io.to(game.pin).emit('time-up', {
    correctOptionId,
    correctCount,
    wrongCount,
  });

  // After 5 seconds, auto-show leaderboard/halftime
  game.timer = setTimeout(() => {
    showLeaderboardOrHalftime(io, game);
  }, 5000);
}

function showLeaderboardOrHalftime(io, game) {
  const totalQ = game.quiz.questions.length;
  const halfwayIndex = Math.floor(totalQ / 2) - 1; // 0-based index of halfway question
  const isHalftime = totalQ >= 4 && game.currentQuestion === halfwayIndex;

  game.state = isHalftime ? 'halftime' : 'leaderboard';

  const rankings = getRankings(game);

  if (isHalftime) {
    io.to(game.pin).emit('halftime', {
      rankings: rankings.slice(0, 10),
      questionsCompleted: game.currentQuestion + 1,
      totalQuestions: totalQ,
    });
  } else {
    io.to(game.pin).emit('leaderboard', {
      rankings: rankings.slice(0, 10),
    });
  }
}

function getRankings(game) {
  const rankings = [];
  game.players.forEach((player) => {
    rankings.push({
      nickname: player.nickname,
      avatar: player.avatar || '',
      score: player.score,
      streak: player.streak,
    });
  });
  rankings.sort((a, b) => b.score - a.score);
  // Add rank
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rankings;
}

module.exports = gameHandler;
