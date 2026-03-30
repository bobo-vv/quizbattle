const { games } = require('../routes/game');
const { pool } = require('../db/db');

// O(1) lookup: socketId → game pin (avoids iterating all games on disconnect)
const socketToPin = new Map();

// Debounce timers for player-joined broadcasts (avoid flooding when many join at once)
const joinBroadcastTimers = new Map();

// Per-socket rate limiting
const socketRates = new Map();
function isRateLimited(socketId, max, windowMs) {
  const now = Date.now();
  let entry = socketRates.get(socketId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + (windowMs || 1000) };
  }
  entry.count++;
  socketRates.set(socketId, entry);
  return entry.count > (max || 10);
}

// Helper: check if socket is the host of a game
function isHost(game, socketId) {
  return game.hostSocketId === socketId;
}

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
      socketToPin.set(socket.id, pin);
      socket.emit('host-joined', {
        pin: game.pin,
        quizTitle: game.quiz.title,
        totalQuestions: game.quiz.questions.length,
        players: getPlayersList(game),
        teamMode: game.teamMode || false,
        teamCount: game.teamCount || 0,
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
        socketToPin.delete(existingSocketId);
        oldPlayer.disconnected = false;
        game.players.set(socket.id, oldPlayer);
      } else {
        // New player
        if (game.state !== 'lobby' && game.state !== 'countdown') {
          return socket.emit('error', { message: 'Game has already started' });
        }
        // Check player limit
        if (game.maxPlayers && game.players.size >= game.maxPlayers) {
          return socket.emit('error', { message: 'Game is full (max ' + game.maxPlayers + ' players)' });
        }
        var teamColor = null;
        var isCaptain = false;
        if (game.teamMode && game.teamCount >= 2) {
          var allColors = ['red', 'blue', 'green', 'yellow', 'orange', 'pink', 'cyan', 'purple', 'lime', 'teal'];
          var teamColors = allColors.slice(0, game.teamCount);
          teamColor = teamColors[game.teamNextIndex % game.teamCount];
          // First player in this team becomes captain
          var teamHasCaptain = false;
          game.players.forEach(function (p) {
            if (p.team === teamColor && p.isCaptain) teamHasCaptain = true;
          });
          isCaptain = !teamHasCaptain;
          game.teamNextIndex++;
        }
        game.players.set(socket.id, {
          nickname,
          avatar: avatar || '',
          score: 0,
          streak: 0,
          answers: [],
          team: teamColor,
          isCaptain: isCaptain,
        });
      }

      socket.join(pin);
      socketToPin.set(socket.id, pin);

      const joiningPlayer = game.players.get(socket.id);

      // Confirm to joining player immediately
      socket.emit('game-joined', {
        pin: game.pin,
        quizTitle: game.quiz.title,
        totalQuestions: game.quiz.questions.length,
        team: joiningPlayer ? joiningPlayer.team : null,
        isCaptain: joiningPlayer ? joiningPlayer.isCaptain : false,
        teamMode: game.teamMode || false,
        teamNames: game.teamNames || {},
      });

      // Debounce player-joined broadcast: wait 200ms to batch rapid joins
      debouncedPlayerBroadcast(io, game, pin);
    });

    // rename-team: captain renames their team
    socket.on('rename-team', ({ pin, teamName }) => {
      const game = games.get(pin);
      if (!game) return;
      const player = game.players.get(socket.id);
      if (!player || !player.isCaptain || !player.team) return;
      if (!teamName || teamName.length > 20) return;
      if (!game.teamNames) game.teamNames = {};
      game.teamNames[player.team] = teamName.trim();
      // Broadcast updated team names to everyone
      io.to(pin).emit('team-names-updated', { teamNames: game.teamNames });
    });

    // shuffle-teams: host reshuffles all players into teams (host-only)
    socket.on('shuffle-teams', ({ pin }) => {
      const game = games.get(pin);
      if (!game || !game.teamMode || game.state !== 'lobby') return;
      if (!isHost(game, socket.id)) return;
      var allColors = ['red', 'blue', 'green', 'yellow', 'orange', 'pink', 'cyan', 'purple', 'lime', 'teal'];
      var teamColors = allColors.slice(0, game.teamCount);
      // Collect all player socket IDs and shuffle
      var sids = Array.from(game.players.keys());
      for (var i = sids.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = sids[i]; sids[i] = sids[j]; sids[j] = tmp;
      }
      // Reset captains
      var captainSet = {};
      sids.forEach(function (sid, idx) {
        var p = game.players.get(sid);
        var color = teamColors[idx % game.teamCount];
        p.team = color;
        if (!captainSet[color]) {
          p.isCaptain = true;
          captainSet[color] = true;
        } else {
          p.isCaptain = false;
        }
      });
      game.teamNextIndex = sids.length;
      // Clear custom names on shuffle
      game.teamNames = {};
      var players = getPlayersList(game);
      io.to(pin).emit('teams-shuffled', { players: players, teamNames: {} });
      // Notify each player of their new team
      game.players.forEach(function (p, sid) {
        io.to(sid).emit('team-assigned', { team: p.team, isCaptain: p.isCaptain });
      });
    });

    // show-teams: host broadcasts team roster to everyone (host-only)
    socket.on('show-teams', ({ pin }) => {
      const game = games.get(pin);
      if (!game || !game.teamMode) return;
      if (!isHost(game, socket.id)) return;
      var allColors = ['red', 'blue', 'green', 'yellow', 'orange', 'pink', 'cyan', 'purple', 'lime', 'teal'];
      var teamColors = allColors.slice(0, game.teamCount);
      var roster = {};
      teamColors.forEach(function (color) { roster[color] = []; });
      game.players.forEach(function (p) {
        if (p.team && roster[p.team]) {
          roster[p.team].push({ nickname: p.nickname, avatar: p.avatar || '', isCaptain: p.isCaptain || false });
        }
      });
      io.to(pin).emit('team-roster', { roster: roster, teamNames: game.teamNames || {} });
    });

    // start-game (host-only)
    socket.on('start-game', ({ pin }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }
      if (!isHost(game, socket.id)) return;
      // Prevent double-start: only allow from lobby state
      if (game.state !== 'lobby') {
        return;
      }
      if (game.players.size === 0) {
        return socket.emit('error', { message: 'No players have joined' });
      }
      if (!game.quiz.questions || game.quiz.questions.length === 0) {
        return socket.emit('error', { message: 'This quiz has no questions. Please add questions first.' });
      }

      // Initialize answered counter
      game.answeredThisRound = 0;

      game.startedAt = new Date();
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

    // next-question: from leaderboard/halftime → next question (host-only)
    socket.on('next-question', ({ pin }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }
      if (!isHost(game, socket.id)) return;
      // Only allow advancing from leaderboard or halftime state
      if (game.state !== 'leaderboard' && game.state !== 'halftime') {
        return;
      }
      // Clear any pending timer to prevent double-fire
      if (game.timer) {
        clearTimeout(game.timer);
        game.timer = null;
      }
      sendQuestion(io, game);
    });

    // show-results: from review → show leaderboard or halftime (host-only)
    socket.on('show-results', ({ pin }) => {
      const game = games.get(pin);
      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }
      if (!isHost(game, socket.id)) return;
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

    // submit-answer (rate limited: 5 per second)
    socket.on('submit-answer', ({ pin, questionId, optionId, timeRemaining }) => {
      if (isRateLimited(socket.id, 5, 1000)) return;
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
        // Use server-side time calculation to prevent cheating
        const serverElapsed = (Date.now() - (game.questionStartedAt || Date.now())) / 1000;
        const serverTimeRemaining = Math.max(0, timeLimit - serverElapsed);
        // Use the MINIMUM of client and server time (anti-cheat)
        const safeTimeRemaining = Math.min(
          Math.max(0, Math.min(timeRemaining, timeLimit)),
          serverTimeRemaining
        );
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

      // Increment counter (O(1) instead of iterating all players)
      game.answeredThisRound = (game.answeredThisRound || 0) + 1;
      const answeredCount = game.answeredThisRound;

      // Count connected players only
      let connectedPlayers = 0;
      game.players.forEach((p) => { if (!p.disconnected) connectedPlayers++; });

      // Notify HOST only (not all 100 players) with answer count
      if (game.hostSocketId) {
        io.to(game.hostSocketId).emit('player-answered', {
          answeredCount,
          totalPlayers: connectedPlayers,
        });
      }

      // If all connected players answered, trigger time-up immediately
      if (answeredCount >= connectedPlayers) {
        if (game.timer) {
          clearTimeout(game.timer);
        }
        triggerTimeUp(io, game);
      }
    });

    // reaction: player sends emoji reaction (rate limited: 3 per 2 seconds)
    socket.on('reaction', ({ pin, emoji }) => {
      if (isRateLimited(socket.id, 3, 2000)) return;
      const game = games.get(pin);
      if (!game) return;
      const player = game.players.get(socket.id);
      if (!player) return;
      // Send to host only (host screen shows floating reactions)
      if (game.hostSocketId) {
        io.to(game.hostSocketId).emit('reaction', { nickname: player.nickname, emoji: emoji });
      }
    });

    // disconnect: O(1) lookup via socketToPin map
    socket.on('disconnect', () => {
      const pin = socketToPin.get(socket.id);
      socketToPin.delete(socket.id);
      socketRates.delete(socket.id);
      if (!pin) return;

      const game = games.get(pin);
      if (!game) return;

      // Host disconnected
      if (socket.id === game.hostSocketId) {
        game.hostSocketId = null;
      }

      if (game.players.has(socket.id)) {
        const player = game.players.get(socket.id);

        if (game.state === 'lobby') {
          // In lobby: fully remove player
          game.players.delete(socket.id);
        } else {
          // During game: mark as disconnected, keep data for reconnection
          player.disconnected = true;
          player.disconnectedSocketId = socket.id;

          // Fix answeredThisRound counter if player answered this round
          if (game.state === 'question' && game.answeredThisRound > 0) {
            const answeredThisQ = player.answers.find(
              a => a.questionIndex === game.currentQuestion
            );
            if (answeredThisQ) {
              game.answeredThisRound--;
            }
          }

          // Check if all remaining connected players have answered
          if (game.state === 'question') {
            let connectedCount = 0;
            let answeredConnected = 0;
            game.players.forEach((p) => {
              if (!p.disconnected) {
                connectedCount++;
                if (p.answers.find(a => a.questionIndex === game.currentQuestion)) {
                  answeredConnected++;
                }
              }
            });
            if (connectedCount > 0 && answeredConnected >= connectedCount) {
              if (game.timer) clearTimeout(game.timer);
              triggerTimeUp(io, game);
            }
          }
        }

        // Debounce player-left broadcast
        debouncedPlayerBroadcast(io, game, pin);
      }
    });
  });
}

// Debounced broadcast: batches rapid join/leave events into one broadcast
function debouncedPlayerBroadcast(io, game, pin) {
  if (joinBroadcastTimers.has(pin)) {
    clearTimeout(joinBroadcastTimers.get(pin));
  }
  joinBroadcastTimers.set(pin, setTimeout(() => {
    joinBroadcastTimers.delete(pin);
    const players = getPlayersList(game);
    io.to(pin).emit('player-joined', {
      playerCount: game.players.size,
      players,
      teamMode: game.teamMode || false,
    });
  }, 200)); // 200ms debounce window
}

function getPlayersList(game) {
  const players = [];
  game.players.forEach((player) => {
    if (!player.disconnected) {
      players.push({ nickname: player.nickname, avatar: player.avatar || '', score: player.score, team: player.team || null, isCaptain: player.isCaptain || false });
    }
  });
  return players;
}

function getTeamRankings(game) {
  if (!game.teamMode || !game.teamCount) return null;
  const teamData = {};
  game.players.forEach((player) => {
    if (player.team) {
      if (!teamData[player.team]) {
        teamData[player.team] = { totalScore: 0, memberCount: 0, mvp: null, mvpScore: -1 };
      }
      teamData[player.team].totalScore += player.score;
      teamData[player.team].memberCount++;
      if (player.score > teamData[player.team].mvpScore) {
        teamData[player.team].mvpScore = player.score;
        teamData[player.team].mvp = { nickname: player.nickname, avatar: player.avatar || '', score: player.score };
      }
    }
  });
  // Find the largest team size for normalization
  var maxMembers = 0;
  Object.keys(teamData).forEach(function (color) {
    if (teamData[color].memberCount > maxMembers) maxMembers = teamData[color].memberCount;
  });
  const teams = Object.keys(teamData).map(function (color) {
    var td = teamData[color];
    // Normalized score: average per person × maxMembers (so teams with fewer members aren't penalized)
    var avgScore = td.memberCount > 0 ? td.totalScore / td.memberCount : 0;
    var normalizedScore = Math.round(avgScore * maxMembers);
    return {
      team: color,
      customName: (game.teamNames && game.teamNames[color]) || null,
      score: normalizedScore,
      rawScore: td.totalScore,
      memberCount: td.memberCount,
      mvp: td.mvp,
    };
  });
  teams.sort(function (a, b) { return b.score - a.score; });
  teams.forEach(function (t, i) { t.rank = i + 1; });
  return teams;
}

function sendQuestion(io, game) {
  // Prevent sending a new question if one is already active
  if (game.state === 'question') return;

  game.currentQuestion += 1;

  // Reset answered counter for new round
  game.answeredThisRound = 0;

  // Check if all questions are done
  if (game.currentQuestion >= game.quiz.questions.length) {
    game.state = 'finished';

    const rankings = getRankings(game);
    const teamRankings = getTeamRankings(game);
    io.to(game.pin).emit('game-ended', { rankings, teamRankings });

    game.endedAt = Date.now();

    // Save game history to database
    saveGameHistory(game, rankings).catch(err => {
      console.error('Failed to save game history:', err);
    });

    // Clean up timer
    if (game.timer) {
      clearTimeout(game.timer);
      game.timer = null;
    }

    // Clean up game after 60s grace period (let clients receive game-ended)
    setTimeout(() => {
      games.delete(game.pin);
      if (joinBroadcastTimers.has(game.pin)) {
        clearTimeout(joinBroadcastTimers.get(game.pin));
        joinBroadcastTimers.delete(game.pin);
      }
      // Clean up socketToPin entries
      game.players.forEach((_, sid) => socketToPin.delete(sid));
      if (game.hostSocketId) socketToPin.delete(game.hostSocketId);
    }, 60000);

    return;
  }

  game.state = 'question';
  game.questionStartedAt = Date.now();

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

  // Team streak bonus: if all team members answered correctly, bonus x1.5
  var teamStreakBonuses = {};
  if (game.teamMode && game.teamCount >= 2) {
    var teamCorrect = {};
    var teamTotal = {};
    game.players.forEach(function (p) {
      if (p.team) {
        if (!teamTotal[p.team]) { teamTotal[p.team] = 0; teamCorrect[p.team] = 0; }
        teamTotal[p.team]++;
        var ans = p.answers.find(function (a) { return a.questionIndex === game.currentQuestion; });
        if (ans && ans.isCorrect) teamCorrect[p.team]++;
      }
    });
    Object.keys(teamTotal).forEach(function (team) {
      if (teamTotal[team] > 0 && teamCorrect[team] === teamTotal[team]) {
        teamStreakBonuses[team] = true;
        // Apply 50% bonus to each team member for this question
        game.players.forEach(function (p) {
          if (p.team === team) {
            var ans = p.answers.find(function (a) { return a.questionIndex === game.currentQuestion; });
            if (ans && ans.isCorrect && ans.teamBonus === undefined) {
              var bonus = Math.round(ans.scoreGained * 0.5);
              p.score += bonus;
              ans.teamBonus = bonus;
            }
          }
        });
      }
    });
  }

  io.to(game.pin).emit('time-up', {
    correctOptionId,
    correctCount,
    wrongCount,
    teamStreakBonuses: teamStreakBonuses,
  });

  // After 5 seconds, auto-show leaderboard/halftime
  game.timer = setTimeout(() => {
    showLeaderboardOrHalftime(io, game);
  }, 5000);
}

function showLeaderboardOrHalftime(io, game) {
  // Prevent double-fire: only transition from answer_review state
  if (game.state !== 'answer_review') return;

  const totalQ = game.quiz.questions.length;
  const halfwayIndex = Math.floor(totalQ / 2) - 1; // 0-based index of halfway question
  const isHalftime = totalQ >= 4 && game.currentQuestion === halfwayIndex;

  game.state = isHalftime ? 'halftime' : 'leaderboard';

  const rankings = getRankings(game);

  const teamRankings = getTeamRankings(game);

  if (isHalftime) {
    io.to(game.pin).emit('halftime', {
      rankings: rankings.slice(0, 10),
      teamRankings,
      questionsCompleted: game.currentQuestion + 1,
      totalQuestions: totalQ,
    });
  } else {
    io.to(game.pin).emit('leaderboard', {
      rankings: rankings.slice(0, 10),
      teamRankings,
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

// Batch INSERT for game history — handles 100 players × 10 questions efficiently
async function saveGameHistory(game, rankings) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `INSERT INTO game_sessions (host_id, quiz_id, quiz_title, pin, team_mode, team_count, started_at, ended_at, player_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8) RETURNING id`,
      [game.hostId, game.quizId, game.quiz.title, game.pin,
       game.teamMode || false, game.teamCount || 0,
       game.startedAt || new Date(), game.players.size]
    );
    const sessionId = sessionResult.rows[0].id;

    // Build nickname → player map for O(1) lookup
    const nicknameMap = new Map();
    game.players.forEach((p) => nicknameMap.set(p.nickname, p));

    // Batch insert game_players (all in one query)
    if (rankings.length > 0) {
      const playerValues = [];
      const playerParams = [];
      let paramIdx = 1;
      for (const r of rankings) {
        const player = nicknameMap.get(r.nickname) || null;
        const totalCorrect = player ? player.answers.filter(a => a.isCorrect).length : 0;
        playerValues.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}, $${paramIdx+7})`);
        playerParams.push(sessionId, r.nickname, r.avatar || '', player?.team || null,
                          r.rank, r.score, totalCorrect, game.quiz.questions.length);
        paramIdx += 8;
      }
      await client.query(
        `INSERT INTO game_players (game_session_id, nickname, avatar, team_name, final_rank, final_score, total_correct, total_questions)
         VALUES ${playerValues.join(', ')}`,
        playerParams
      );
    }

    // Batch insert player_answers (all in one query, chunked if very large)
    const answerValues = [];
    const answerParams = [];
    let aIdx = 1;
    for (const [, player] of game.players) {
      for (const ans of player.answers) {
        const q = game.quiz.questions[ans.questionIndex];
        answerValues.push(`($${aIdx}, $${aIdx+1}, $${aIdx+2}, $${aIdx+3}, $${aIdx+4}, $${aIdx+5}, $${aIdx+6})`);
        answerParams.push(sessionId, player.nickname, q?.id || null, q?.question_text || '',
                          ans.optionId, ans.isCorrect, ans.scoreGained);
        aIdx += 7;
      }
    }
    // Insert in chunks of 500 rows to stay within PostgreSQL parameter limit (max ~65535 params)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < answerValues.length; i += CHUNK_SIZE) {
      const chunkValues = answerValues.slice(i, i + CHUNK_SIZE);
      // Recalculate param indices for this chunk
      const chunkParams = answerParams.slice(i * 7, (i + CHUNK_SIZE) * 7);
      // Re-number placeholders for this chunk
      const renumbered = [];
      let pIdx = 1;
      for (let j = i; j < Math.min(i + CHUNK_SIZE, answerValues.length); j++) {
        renumbered.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6})`);
        pIdx += 7;
      }
      const chunkParamsSlice = [];
      for (let j = i; j < Math.min(i + CHUNK_SIZE, answerValues.length); j++) {
        const base = j * 7;
        for (let k = 0; k < 7; k++) {
          chunkParamsSlice.push(answerParams[base + k]);
        }
      }
      await client.query(
        `INSERT INTO player_answers (game_session_id, nickname, question_id, question_text, option_id, is_correct, score_gained)
         VALUES ${renumbered.join(', ')}`,
        chunkParamsSlice
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function findPlayerByNickname(game, nickname) {
  for (const [, player] of game.players) {
    if (player.nickname === nickname) return player;
  }
  return null;
}

module.exports = gameHandler;
