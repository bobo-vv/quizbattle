/* ============================================================
   ZapQuiz – Host Game
   ============================================================ */
(function () {
  'use strict';

  /* ---- state ---- */
  var pin              = new URLSearchParams(window.location.search).get('pin');
  var socket           = null;
  var state            = 'lobby';
  var timerInterval    = null;
  var currentQuestion  = null; // flat object from server
  var currentOptions   = [];
  var isTeamMode       = false;
  var teamCount        = 0;
  var customTeamNames  = {};
  var lastPlayersList  = [];

  var ALL_TEAM_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'pink', 'cyan', 'purple', 'lime', 'teal'];
  var TEAM_EMOJI = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', orange: '🟠', pink: '🩷', cyan: '🩵', purple: '🟣', lime: '💚', teal: '🩶' };

  function getTeamLabel(color) {
    if (customTeamNames[color]) return customTeamNames[color];
    var defaultLabels = {
      red: typeof t === 'function' ? t('team.red') : 'Red Team',
      blue: typeof t === 'function' ? t('team.blue') : 'Blue Team',
      green: typeof t === 'function' ? t('team.green') : 'Green Team',
      yellow: typeof t === 'function' ? t('team.yellow') : 'Yellow Team',
      orange: typeof t === 'function' ? t('team.orange') : 'Orange Team',
      pink: typeof t === 'function' ? t('team.pink') : 'Pink Team',
      cyan: typeof t === 'function' ? t('team.cyan') : 'Cyan Team',
      purple: typeof t === 'function' ? t('team.purple') : 'Purple Team',
      lime: typeof t === 'function' ? t('team.lime') : 'Lime Team',
      teal: typeof t === 'function' ? t('team.teal') : 'Teal Team',
    };
    return defaultLabels[color] || color;
  }

  /* ---- DOM refs ---- */
  var stateLobby       = document.getElementById('state-lobby');
  var stateQuestion    = document.getElementById('state-question');
  var stateReview      = document.getElementById('state-review');
  var stateHalftime    = document.getElementById('state-halftime');
  var stateLeaderboard = document.getElementById('state-leaderboard');
  var stateFinal       = document.getElementById('state-final');

  var gamePinEl        = document.getElementById('game-pin');
  var playerListEl     = document.getElementById('player-list');
  var playerCountNum   = document.getElementById('player-count-num');
  var startGameBtn     = document.getElementById('start-game-btn');

  var questionNumberEl = document.getElementById('question-number');
  var questionTextEl   = document.getElementById('question-text');
  var questionImageEl  = document.getElementById('question-image');
  var countdownTextEl  = document.getElementById('countdown-text');
  var countdownCircle  = document.getElementById('countdown-circle');
  var answerCountNum   = document.getElementById('answer-count-num');

  var reviewQuestionEl = document.getElementById('review-question');
  var correctCountEl   = document.getElementById('correct-count');
  var wrongCountEl     = document.getElementById('wrong-count');
  var nextBtn          = document.getElementById('next-btn');

  var leaderboardList  = document.getElementById('leaderboard-list');
  var leaderboardNext  = document.getElementById('leaderboard-next-btn');

  var halftimeList     = document.getElementById('halftime-list');
  var halftimeProgress = document.getElementById('halftime-progress');
  var halftimeNextBtn  = document.getElementById('halftime-next-btn');

  var backDashboardBtn = document.getElementById('back-dashboard-btn');
  var soundToggleBtn   = document.getElementById('sound-toggle');

  /* ---- helpers ---- */

  function switchState(newState) {
    state = newState;
    [stateLobby, stateQuestion, stateReview, stateHalftime, stateLeaderboard, stateFinal].forEach(function (el) {
      if (el) el.classList.remove('host-state--active');
    });
    var map = {
      lobby: stateLobby,
      question: stateQuestion,
      review: stateReview,
      halftime: stateHalftime,
      leaderboard: stateLeaderboard,
      final: stateFinal
    };
    if (map[newState]) map[newState].classList.add('host-state--active');
  }

  function startCountdown(seconds) {
    clearInterval(timerInterval);
    var remaining = seconds;
    var circumference = 2 * Math.PI * 54;
    if (countdownTextEl) countdownTextEl.textContent = remaining;

    if (countdownCircle) {
      countdownCircle.style.strokeDasharray = circumference;
      countdownCircle.style.strokeDashoffset = '0';
    }

    timerInterval = setInterval(function () {
      remaining--;
      if (countdownTextEl) countdownTextEl.textContent = Math.max(0, remaining);

      if (countdownCircle) {
        var offset = circumference * (1 - remaining / seconds);
        countdownCircle.style.strokeDashoffset = offset;
      }

      if (remaining <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  }

  /* ---- init socket ---- */
  function initSocket() {
    socket = io();

    // Join as host (not as a player)
    socket.emit('host-join', { pin: pin });

    /* -- Host joined confirmation -- */
    socket.on('host-joined', function (data) {
      isTeamMode = data.teamMode || false;
      teamCount = data.teamCount || 0;
      renderPlayers(data.players || []);
      generateQR(pin);
      QuizSound.lobbyMusic();
      // Show team lobby actions if team mode
      var teamActions = document.getElementById('team-lobby-actions');
      if (teamActions) teamActions.hidden = !isTeamMode;
    });

    /* -- Player events -- */
    socket.on('player-joined', function (data) {
      renderPlayers(data.players || []);
      QuizSound.playerJoined();
    });

    socket.on('player-left', function (data) {
      renderPlayers(data.players || []);
    });

    /* -- Countdown 3-2-1-GO! -- */
    var countdownOverlay = document.getElementById('game-countdown-overlay');
    var countdownNumEl   = document.getElementById('countdown-number');

    socket.on('game-countdown', function () {
      QuizSound.stopMusic();
      if (countdownOverlay) countdownOverlay.hidden = false;
      var count = 3;
      if (countdownNumEl) countdownNumEl.textContent = count;
      if (countdownNumEl) countdownNumEl.className = 'countdown-number countdown-number--pop';
      QuizSound.countdownBeep && QuizSound.countdownBeep(count);

      var cdInterval = setInterval(function () {
        count--;
        if (count > 0) {
          if (countdownNumEl) {
            countdownNumEl.textContent = count;
            countdownNumEl.className = 'countdown-number countdown-number--pop';
            void countdownNumEl.offsetWidth;
            countdownNumEl.className = 'countdown-number countdown-number--pop';
          }
          QuizSound.countdownBeep && QuizSound.countdownBeep(count);
        } else {
          clearInterval(cdInterval);
          if (countdownNumEl) {
            countdownNumEl.textContent = 'GO!';
            countdownNumEl.className = 'countdown-number countdown-number--go';
          }
          setTimeout(function () {
            if (countdownOverlay) countdownOverlay.hidden = true;
          }, 800);
        }
      }, 1000);
    });

    /* -- Game events -- */
    socket.on('game-started', function () {
      QuizSound.gameStart();
    });

    // Backend sends flat data: { questionIndex, totalQuestions, id, type, question_text, image_url, time_limit, points, options }
    socket.on('question', function (data) {
      currentQuestion = {
        id: data.id,
        type: data.type,
        question_text: data.question_text,
        image_url: data.image_url,
        time_limit: data.time_limit,
        points: data.points,
      };
      currentOptions = data.options || [];

      if (questionNumberEl) {
        questionNumberEl.textContent = (data.questionIndex + 1) + ' / ' + data.totalQuestions;
      }
      if (questionTextEl) questionTextEl.textContent = data.question_text;

      // Image
      if (questionImageEl) {
        if (data.image_url) {
          questionImageEl.src = data.image_url;
          questionImageEl.hidden = false;
        } else {
          questionImageEl.hidden = true;
        }
      }

      // Render answer blocks
      renderAnswerBlocks(currentOptions, data.type);

      if (answerCountNum) answerCountNum.textContent = '0';
      startCountdown(data.time_limit || 20);
      QuizSound.countdownMusic(data.time_limit || 20);
      switchState('question');
    });

    socket.on('player-answered', function (data) {
      if (answerCountNum) {
        answerCountNum.textContent = data.answeredCount + ' / ' + data.totalPlayers;
      }
    });

    socket.on('time-up', function (data) {
      clearInterval(timerInterval);
      QuizSound.stopMusic();
      QuizSound.timeUp();
      showReview(data.correctOptionId, data.correctCount || 0, data.wrongCount || 0);
    });

    socket.on('halftime', function (data) {
      QuizSound.halftime();
      if (isTeamMode && data.teamRankings) {
        renderTeamLeaderboard(halftimeList, data.teamRankings);
      } else {
        renderHalftime(data.rankings, data.questionsCompleted, data.totalQuestions);
      }
      if (halftimeProgress) halftimeProgress.textContent = data.questionsCompleted + ' / ' + data.totalQuestions;
      switchState('halftime');
    });

    socket.on('leaderboard', function (data) {
      QuizSound.leaderboard();
      if (isTeamMode && data.teamRankings) {
        renderTeamLeaderboard(leaderboardList, data.teamRankings);
      } else {
        renderLeaderboard(data.rankings);
      }
      switchState('leaderboard');
    });

    socket.on('game-ended', function (data) {
      QuizSound.stopMusic();
      QuizSound.victory();
      if (isTeamMode && data.teamRankings) {
        renderTeamPodium(data.teamRankings);
      } else {
        renderPodium(data.rankings);
      }
      switchState('final');
      spawnConfetti();
    });

    /* -- Reaction emoji floating -- */
    var reactionContainer = document.getElementById('reaction-container');
    socket.on('reaction', function (data) {
      if (!reactionContainer) return;
      var el = document.createElement('div');
      el.className = 'reaction-float';
      el.textContent = data.emoji;
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.animationDuration = (2 + Math.random()) + 's';
      reactionContainer.appendChild(el);
      setTimeout(function () { el.remove(); }, 3500);
    });

    // Team name updates
    socket.on('team-names-updated', function (data) {
      customTeamNames = data.teamNames || {};
      // Re-render player list so team column headers update
      if (state === 'lobby' && lastPlayersList.length > 0) {
        renderPlayers(lastPlayersList);
      }
    });

    // Teams shuffled
    socket.on('teams-shuffled', function (data) {
      customTeamNames = data.teamNames || {};
      renderPlayers(data.players || []);
      // Close stale roster overlay
      var rosterOvl = document.getElementById('team-roster-overlay');
      if (rosterOvl) rosterOvl.hidden = true;
    });

    // Team roster (full-screen overlay)
    socket.on('team-roster', function (data) {
      showTeamRoster(data.roster, data.teamNames || {});
    });

    socket.on('error', function (data) {
      alert(data.message || data.error || 'Error');
    });
  }

  /* ---- team roster overlay ---- */
  function showTeamRoster(roster, names) {
    var overlay = document.getElementById('team-roster-overlay');
    if (!overlay) return;
    var body = document.getElementById('team-roster-body');
    if (!body) return;
    body.innerHTML = '';
    var teamColors = ALL_TEAM_COLORS.slice(0, teamCount);
    teamColors.forEach(function (color) {
      var members = roster[color] || [];
      var label = (names[color]) || getTeamLabel(color);
      var col = document.createElement('div');
      col.className = 'roster-team roster-team--' + color;
      var html = '<div class="roster-team__header">' + (TEAM_EMOJI[color] || '') + ' ' + escapeHtml(label) + '</div>';
      html += '<div class="roster-team__members">';
      members.forEach(function (m) {
        html += '<div class="roster-team__member">' +
          (m.isCaptain ? '<span class="captain-crown">👑</span>' : '') +
          (m.avatar ? '<span class="player-avatar">' + m.avatar + '</span>' : '') +
          escapeHtml(m.nickname) +
          (m.isCaptain ? ' <span class="roster-captain-label">(Captain)</span>' : '') +
          '</div>';
      });
      html += '</div>';
      col.innerHTML = html;
      body.appendChild(col);
    });
    overlay.hidden = false;
  }

  /* ---- render players ---- */
  function renderPlayers(players) {
    if (!playerListEl) return;
    lastPlayersList = players || [];
    playerListEl.innerHTML = '';

    if (isTeamMode && teamCount >= 2) {
      var teamColors = ALL_TEAM_COLORS.slice(0, teamCount);
      var container = document.createElement('div');
      container.className = 'team-columns';
      teamColors.forEach(function (color) {
        var col = document.createElement('div');
        col.className = 'team-column team-column--' + color;
        col.innerHTML = '<div class="team-column__title">' + (TEAM_EMOJI[color] || '') + ' ' + getTeamLabel(color) + '</div>';
        var teamPlayers = (players || []).filter(function (p) { return p.team === color; });
        teamPlayers.forEach(function (p) {
          var div = document.createElement('div');
          div.className = 'team-column__player';
          div.innerHTML = (p.isCaptain ? '<span class="captain-crown">👑</span>' : '') +
            (p.avatar ? '<span class="player-avatar">' + p.avatar + '</span>' : '') +
            escapeHtml(p.nickname);
          col.appendChild(div);
        });
        container.appendChild(col);
      });
      playerListEl.appendChild(container);
    } else {
      (players || []).forEach(function (p) {
        var li = document.createElement('li');
        li.className = 'lobby__player-chip';
        li.innerHTML = (p.avatar ? '<span class="player-avatar">' + p.avatar + '</span>' : '') + escapeHtml(p.nickname);
        playerListEl.appendChild(li);
      });
    }
    if (playerCountNum) playerCountNum.textContent = (players || []).length;
  }

  /* ---- render answer blocks on host question screen ---- */
  function renderAnswerBlocks(options, type) {
    for (var i = 0; i < 4; i++) {
      var textEl = document.getElementById('answer-' + i);
      var block = textEl ? textEl.closest('.answer-block') : null;
      if (i < options.length) {
        if (textEl) textEl.textContent = options[i].option_text;
        if (block) {
          block.hidden = false;
          block.classList.remove('answer-block--correct', 'answer-block--wrong');
        }
      } else {
        if (block) block.hidden = true;
      }
    }
  }

  /* ---- show answer review ---- */
  function showReview(correctOptionId, correctCount, wrongCount) {
    if (reviewQuestionEl) {
      reviewQuestionEl.textContent = currentQuestion ? currentQuestion.question_text : '';
    }

    for (var i = 0; i < 4; i++) {
      var reviewTextEl = document.getElementById('review-answer-' + i);
      var reviewBlock = reviewTextEl ? reviewTextEl.closest('.answer-block') : null;

      if (i < currentOptions.length) {
        if (reviewTextEl) reviewTextEl.textContent = currentOptions[i].option_text;
        if (reviewBlock) {
          reviewBlock.hidden = false;
          reviewBlock.classList.remove('answer-block--correct', 'answer-block--wrong');
          if (currentOptions[i].id === correctOptionId) {
            reviewBlock.classList.add('answer-block--correct');
          }
        }
      } else {
        if (reviewBlock) reviewBlock.hidden = true;
      }
    }

    if (correctCountEl) correctCountEl.textContent = correctCount;
    if (wrongCountEl) wrongCountEl.textContent = wrongCount;

    switchState('review');
  }

  /* ---- render halftime leaderboard ---- */
  function renderHalftime(rankings, completed, total) {
    if (halftimeProgress) {
      halftimeProgress.textContent = completed + ' / ' + total;
    }
    if (!halftimeList) return;
    halftimeList.innerHTML = '';
    var top = (rankings || []).slice(0, 5);
    var maxScore = top.length > 0 ? top[0].score : 1;

    top.forEach(function (entry, idx) {
      var li = document.createElement('li');
      li.className = 'leaderboard-item halftime-item';
      li.style.animationDelay = (idx * 0.15) + 's';
      li.innerHTML =
        '<span class="leaderboard-item__rank">#' + entry.rank + '</span>' +
        (entry.avatar ? '<span class="player-avatar">' + entry.avatar + '</span>' : '') +
        '<span class="leaderboard-item__name">' + escapeHtml(entry.nickname) + '</span>' +
        '<div class="leaderboard-item__bar-wrap">' +
          '<div class="leaderboard-item__bar" style="width:' + Math.max(10, (entry.score / Math.max(maxScore, 1)) * 100) + '%"></div>' +
        '</div>' +
        '<span class="leaderboard-item__score">' + entry.score + '</span>';
      halftimeList.appendChild(li);
    });
  }

  /* ---- render leaderboard ---- */
  function renderLeaderboard(rankings) {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    var top = (rankings || []).slice(0, 5);
    var maxScore = top.length > 0 ? top[0].score : 1;

    top.forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'leaderboard-item';
      li.innerHTML =
        '<span class="leaderboard-item__rank">#' + entry.rank + '</span>' +
        (entry.avatar ? '<span class="player-avatar">' + entry.avatar + '</span>' : '') +
        '<span class="leaderboard-item__name">' + escapeHtml(entry.nickname) + '</span>' +
        '<div class="leaderboard-item__bar-wrap">' +
          '<div class="leaderboard-item__bar" style="width:' + Math.max(10, (entry.score / Math.max(maxScore, 1)) * 100) + '%"></div>' +
        '</div>' +
        '<span class="leaderboard-item__score">' + entry.score + '</span>';
      leaderboardList.appendChild(li);
    });
  }

  /* ---- render podium ---- */
  function renderPodium(rankings) {
    var r = rankings || [];
    for (var place = 1; place <= 3; place++) {
      var entry = r[place - 1]; // rankings are sorted by rank
      var nameEl = document.getElementById('podium-' + place + '-name');
      var scoreEl = document.getElementById('podium-' + place + '-score');
      var avatarEl = document.getElementById('podium-' + place + '-avatar');
      if (nameEl) nameEl.textContent = entry ? entry.nickname : '-';
      if (scoreEl) scoreEl.textContent = entry ? entry.score : '0';
      if (avatarEl) avatarEl.textContent = entry ? (entry.avatar || entry.nickname.charAt(0).toUpperCase()) : '?';
    }
  }

  /* ---- render team leaderboard ---- */
  function renderTeamLeaderboard(listEl, teamRankings) {
    if (!listEl) return;
    listEl.innerHTML = '';
    (teamRankings || []).forEach(function (entry) {
      var label = entry.customName || getTeamLabel(entry.team);
      var li = document.createElement('li');
      li.className = 'team-leaderboard-item team-leaderboard-item--' + entry.team;
      li.innerHTML =
        '<span class="team-leaderboard-item__rank">#' + entry.rank + '</span>' +
        '<span class="team-leaderboard-item__name">' + (TEAM_EMOJI[entry.team] || '') + ' ' + escapeHtml(label) + '</span>' +
        '<span class="team-leaderboard-item__score">' + entry.score + '</span>';
      if (entry.mvp) {
        li.innerHTML += '<span class="team-leaderboard-item__mvp">🏅 ' + escapeHtml(entry.mvp.nickname) + '</span>';
      }
      listEl.appendChild(li);
    });
  }

  /* ---- render team podium ---- */
  function renderTeamPodium(teamRankings) {
    for (var place = 1; place <= 3; place++) {
      var entry = (teamRankings || [])[place - 1];
      var nameEl = document.getElementById('podium-' + place + '-name');
      var scoreEl = document.getElementById('podium-' + place + '-score');
      var avatarEl = document.getElementById('podium-' + place + '-avatar');
      if (entry) {
        var label = entry.customName || getTeamLabel(entry.team);
        if (nameEl) nameEl.textContent = label;
        if (scoreEl) scoreEl.textContent = entry.score;
        if (avatarEl) avatarEl.textContent = TEAM_EMOJI[entry.team] || '🏆';
      } else {
        if (nameEl) nameEl.textContent = '-';
        if (scoreEl) scoreEl.textContent = '0';
        if (avatarEl) avatarEl.textContent = '?';
      }
    }
    // Show MVP section under podium
    var mvpArea = document.getElementById('team-mvp-area');
    if (mvpArea) {
      mvpArea.innerHTML = '';
      (teamRankings || []).forEach(function (entry) {
        if (entry.mvp) {
          var label = entry.customName || getTeamLabel(entry.team);
          var div = document.createElement('div');
          div.className = 'team-mvp-item team-mvp-item--' + entry.team;
          div.innerHTML = '🏅 <strong>' + escapeHtml(label) + ' MVP:</strong> ' +
            (entry.mvp.avatar ? '<span class="player-avatar">' + entry.mvp.avatar + '</span>' : '') +
            escapeHtml(entry.mvp.nickname) + ' (' + entry.mvp.score + ')';
          mvpArea.appendChild(div);
        }
      });
      mvpArea.hidden = false;
    }
  }

  /* ---- confetti ---- */
  function spawnConfetti() {
    var area = document.getElementById('confetti-area');
    if (!area) return;
    area.innerHTML = '';
    var colors = ['#E21B3C', '#1368CE', '#D89E00', '#26890C', '#FFD700', '#FF69B4', '#46178F'];
    for (var i = 0; i < 60; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 2) + 's';
      piece.style.animationDuration = (2 + Math.random() * 3) + 's';
      area.appendChild(piece);
    }
  }

  /* ---- generate QR code ---- */
  function generateQR(pin) {
    var qrContainer = document.getElementById('lobby-qr');
    if (!qrContainer || typeof qrcode === 'undefined') return;
    qrContainer.innerHTML = '';
    var url = window.location.origin + '/join.html?pin=' + pin;
    var qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    qrContainer.innerHTML = qr.createImgTag(8, 16);
  }

  /* ---- escape HTML ---- */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---- button handlers ---- */
  var shuffleBtn = document.getElementById('shuffle-teams-btn');
  var showTeamsBtn = document.getElementById('show-teams-btn');
  var rosterOverlay = document.getElementById('team-roster-overlay');
  var rosterCloseBtn = document.getElementById('roster-close-btn');

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', function () {
      if (socket) socket.emit('shuffle-teams', { pin: pin });
    });
  }
  if (showTeamsBtn) {
    showTeamsBtn.addEventListener('click', function () {
      if (socket) socket.emit('show-teams', { pin: pin });
    });
  }
  if (rosterCloseBtn) {
    rosterCloseBtn.addEventListener('click', function () {
      if (rosterOverlay) rosterOverlay.hidden = true;
    });
  }

  if (startGameBtn) {
    startGameBtn.addEventListener('click', function () {
      if (socket) socket.emit('start-game', { pin: pin });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      // From review → show leaderboard/halftime (not skip to next question)
      if (socket) socket.emit('show-results', { pin: pin });
    });
  }

  if (leaderboardNext) {
    leaderboardNext.addEventListener('click', function () {
      if (socket) socket.emit('next-question', { pin: pin });
    });
  }

  if (halftimeNextBtn) {
    halftimeNextBtn.addEventListener('click', function () {
      if (socket) socket.emit('next-question', { pin: pin });
    });
  }

  if (backDashboardBtn) {
    backDashboardBtn.addEventListener('click', function () {
      window.location.href = '/dashboard.html';
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', function () {
      var on = QuizSound.toggle();
      soundToggleBtn.textContent = on ? '\uD83D\uDD0A' : '\uD83D\uDD07';
      soundToggleBtn.classList.toggle('sound-toggle--muted', !on);
    });
  }

  /* ---- init ---- */
  if (!pin) {
    window.location.href = '/dashboard.html';
  } else {
    if (gamePinEl) gamePinEl.textContent = pin;
    initSocket();
  }

})();
