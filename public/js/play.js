/* ============================================================
   ZapQuiz – Player Game Screen
   ============================================================ */
(function () {
  'use strict';

  /* ---- state ---- */
  var pin           = sessionStorage.getItem('zapquiz_pin');
  var nickname      = sessionStorage.getItem('zapquiz_nickname');
  var avatar        = sessionStorage.getItem('zapquiz_avatar') || '🐱';
  var socket        = null;
  var currentState  = 'waiting';
  var currentQId    = null;
  var currentOptions = [];
  var timerInterval = null;
  var timeRemaining = 0;
  var timeLimit     = 20;
  var myTeam        = null;
  var myCaptain     = false;

  var ALL_TEAM_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'pink', 'cyan', 'purple', 'lime', 'teal'];
  var TEAM_EMOJI = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', orange: '🟠', pink: '🩷', cyan: '🩵', purple: '🟣', lime: '💚', teal: '🩶' };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---- DOM refs ---- */
  var stateWaiting     = document.getElementById('state-waiting');
  var stateQuestion    = document.getElementById('state-question');
  var stateAnswered    = document.getElementById('state-answered');
  var stateResult      = document.getElementById('state-result');
  var stateHalftime    = document.getElementById('state-halftime');
  var stateLeaderboard = document.getElementById('state-leaderboard');
  var stateFinal       = document.getElementById('state-final');

  var playerNicknameEl = document.getElementById('player-nickname');
  var questionNumberEl = document.getElementById('play-question-number');
  var questionTextEl   = document.getElementById('play-question-text');
  var countdownTextEl  = document.getElementById('play-countdown-text');

  var mcAnswersEl      = document.getElementById('play-mc-answers');
  var tfAnswersEl      = document.getElementById('play-tf-answers');

  var resultIconEl     = document.getElementById('result-icon');
  var resultTextEl     = document.getElementById('result-text');
  var resultPointsEl   = document.getElementById('result-points');
  var resultTotalEl    = document.getElementById('result-total');
  var resultStreakEl   = document.getElementById('result-streak');

  var playRankEl       = document.getElementById('play-rank');
  var playScoreEl      = document.getElementById('play-score');

  var finalRankEl      = document.getElementById('final-rank');
  var finalScoreEl     = document.getElementById('final-score');
  var finalTop3Msg     = document.getElementById('final-top3-msg');
  var finalCelebration = document.getElementById('final-celebration');

  var halftimeRankEl   = document.getElementById('halftime-rank');
  var halftimeScoreEl  = document.getElementById('halftime-score');
  var soundToggleBtn   = document.getElementById('sound-toggle');

  /* ---- helpers ---- */

  function switchState(newState) {
    currentState = newState;
    [stateWaiting, stateQuestion, stateAnswered, stateResult, stateHalftime, stateLeaderboard, stateFinal].forEach(function (el) {
      if (el) el.classList.remove('play-state--active');
    });
    var map = {
      waiting: stateWaiting,
      question: stateQuestion,
      answered: stateAnswered,
      result: stateResult,
      halftime: stateHalftime,
      leaderboard: stateLeaderboard,
      final: stateFinal
    };
    if (map[newState]) map[newState].classList.add('play-state--active');
  }

  function startLocalTimer(seconds) {
    clearInterval(timerInterval);
    timeLimit = seconds;
    timeRemaining = seconds;
    if (countdownTextEl) countdownTextEl.textContent = timeRemaining;

    timerInterval = setInterval(function () {
      timeRemaining--;
      if (countdownTextEl) countdownTextEl.textContent = Math.max(0, timeRemaining);
      if (timeRemaining <= 0) clearInterval(timerInterval);
    }, 1000);
  }

  /* ---- init ---- */
  if (!pin || !nickname) {
    window.location.href = '/join.html';
  }

  if (playerNicknameEl) playerNicknameEl.textContent = nickname;

  /* ---- socket ---- */
  socket = io();
  socket.emit('join-game', { pin: pin, nickname: nickname, avatar: avatar });

  socket.on('game-joined', function (data) {
    // Show team badge if team mode
    if (data && data.team) {
      myTeam = data.team;
      myCaptain = data.isCaptain || false;
      showTeamBadge(data.team, data.teamNames || {});
      // Show captain rename UI
      if (myCaptain) showCaptainRename();
    }
    switchState('waiting');
  });

  // team-assigned: after shuffle
  socket.on('team-assigned', function (data) {
    myTeam = data.team;
    myCaptain = data.isCaptain || false;
    showTeamBadge(data.team, {});
    var renameWrap = document.getElementById('captain-rename-wrap');
    if (myCaptain) {
      showCaptainRename();
    } else if (renameWrap) {
      renameWrap.hidden = true;
    }
    // Close stale roster overlay
    var rosterOverlay = document.getElementById('player-roster-overlay');
    if (rosterOverlay) rosterOverlay.hidden = true;
  });

  // team-names-updated
  socket.on('team-names-updated', function (data) {
    if (myTeam) showTeamBadge(myTeam, data.teamNames || {});
  });

  // team-roster: show overlay on player screen too
  socket.on('team-roster', function (data) {
    showPlayerRoster(data.roster, data.teamNames || {});
  });

  function getTeamLabel(color, teamNames) {
    if (teamNames && teamNames[color]) return teamNames[color];
    if (typeof t === 'function') return t('team.' + color);
    var defaults = { red: 'Red Team', blue: 'Blue Team', green: 'Green Team', yellow: 'Yellow Team', orange: 'Orange Team', pink: 'Pink Team', cyan: 'Cyan Team', purple: 'Purple Team', lime: 'Lime Team', teal: 'Teal Team' };
    return defaults[color] || color;
  }

  function showTeamBadge(team, teamNames) {
    var teamBadgeEl = document.getElementById('player-team-badge');
    if (!teamBadgeEl) return;
    var label = (TEAM_EMOJI[team] || '') + ' ' + getTeamLabel(team, teamNames);
    teamBadgeEl.textContent = label;
    teamBadgeEl.className = 'team-badge team-badge--' + team;
    teamBadgeEl.hidden = false;
  }

  function showCaptainRename() {
    var wrap = document.getElementById('captain-rename-wrap');
    if (!wrap) {
      // Create captain rename UI dynamically
      wrap = document.createElement('div');
      wrap.id = 'captain-rename-wrap';
      wrap.className = 'captain-rename';
      wrap.innerHTML = '<span class="captain-crown">👑</span>' +
        '<input id="captain-rename-input" class="captain-rename__input" type="text" maxlength="20" placeholder="' + (typeof t === 'function' ? t('team.renameTeam') : 'Team name...') + '">' +
        '<button id="captain-rename-btn" class="btn btn--sm btn--primary">' + (typeof t === 'function' ? t('team.rename') : 'Rename') + '</button>';
      var badge = document.getElementById('player-team-badge');
      if (badge && badge.parentNode) {
        badge.parentNode.insertBefore(wrap, badge.nextSibling);
      }
    }
    wrap.hidden = false;
    var btn = document.getElementById('captain-rename-btn');
    var input = document.getElementById('captain-rename-input');
    if (btn && input) {
      btn.onclick = function () {
        var name = input.value.trim();
        if (name && socket) {
          socket.emit('rename-team', { pin: pin, teamName: name });
          input.value = '';
        }
      };
      input.onkeydown = function (e) {
        if (e.key === 'Enter') btn.click();
      };
    }
  }

  function showPlayerRoster(roster, teamNames) {
    var overlay = document.getElementById('player-roster-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'player-roster-overlay';
      overlay.className = 'team-roster-overlay';
      overlay.innerHTML = '<div class="team-roster"><h2 class="team-roster__title">' +
        (typeof t === 'function' ? t('team.teamRoster') : 'Team Roster') +
        '</h2><div id="player-roster-body" class="team-roster__body"></div>' +
        '<button id="player-roster-close" class="btn btn--primary btn--lg">OK</button></div>';
      document.body.appendChild(overlay);
      document.getElementById('player-roster-close').addEventListener('click', function () {
        overlay.hidden = true;
      });
    }
    var body = document.getElementById('player-roster-body');
    if (!body) return;
    body.innerHTML = '';
    ALL_TEAM_COLORS.forEach(function (color) {
      var members = roster[color];
      if (!members) return;
      var label = getTeamLabel(color, teamNames);
      var col = document.createElement('div');
      col.className = 'roster-team roster-team--' + color;
      var html = '<div class="roster-team__header">' + (TEAM_EMOJI[color] || '') + ' ' + escapeHtml(label) + '</div>';
      html += '<div class="roster-team__members">';
      members.forEach(function (m) {
        html += '<div class="roster-team__member">' +
          (m.isCaptain ? '<span class="captain-crown">👑</span>' : '') +
          (m.avatar ? '<span class="player-avatar">' + m.avatar + '</span>' : '') +
          escapeHtml(m.nickname) + '</div>';
      });
      html += '</div>';
      col.innerHTML = html;
      body.appendChild(col);
    });
    overlay.hidden = false;
  }

  socket.on('player-joined', function () {
    // stay in waiting
  });

  /* ---- countdown 3-2-1-GO! ---- */
  var countdownOverlay = document.getElementById('game-countdown-overlay');
  var countdownNumEl   = document.getElementById('countdown-number');

  socket.on('game-countdown', function () {
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
          countdownNumEl.className = 'countdown-number';
          void countdownNumEl.offsetWidth; // force reflow for animation
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

  socket.on('game-started', function () {
    QuizSound.gameStart();
  });

  // Backend sends flat data: { questionIndex, totalQuestions, id, type, question_text, image_url, time_limit, points, options }
  socket.on('question', function (data) {
    currentQId = data.id;
    currentOptions = data.options || [];

    if (questionNumberEl) {
      questionNumberEl.textContent = (data.questionIndex + 1) + ' / ' + data.totalQuestions;
    }
    if (questionTextEl) questionTextEl.textContent = data.question_text;

    var isTF = data.type === 'true-false' || data.type === 'true_false';

    if (isTF) {
      if (mcAnswersEl) mcAnswersEl.hidden = true;
      if (tfAnswersEl) tfAnswersEl.hidden = false;
    } else {
      if (mcAnswersEl) mcAnswersEl.hidden = false;
      if (tfAnswersEl) tfAnswersEl.hidden = true;

      // Populate MC answer texts
      for (var i = 0; i < 4; i++) {
        var textEl = document.getElementById('play-answer-' + i);
        var btn = textEl ? textEl.closest('.play-answer') : null;
        if (i < currentOptions.length) {
          if (textEl) textEl.textContent = currentOptions[i].option_text;
          if (btn) {
            btn.hidden = false;
            btn.disabled = false;
            btn.classList.remove('play-answer--selected', 'play-answer--correct', 'play-answer--wrong');
          }
        } else {
          if (btn) btn.hidden = true;
        }
      }
    }

    // Reset TF buttons
    if (tfAnswersEl) {
      tfAnswersEl.querySelectorAll('.play-answer').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('play-answer--selected', 'play-answer--correct', 'play-answer--wrong');
      });
    }

    startLocalTimer(data.time_limit || 20);
    QuizSound.countdownMusic(data.time_limit || 20);
    switchState('question');
  });

  /* ---- answer click (MC) ---- */
  if (mcAnswersEl) {
    mcAnswersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.play-answer');
      if (!btn || btn.disabled) return;

      var answerIndex = parseInt(btn.dataset.answer, 10);
      var optionId = currentOptions[answerIndex] ? currentOptions[answerIndex].id : null;
      submitAnswer(optionId, btn);
    });
  }

  /* ---- answer click (TF) ---- */
  if (tfAnswersEl) {
    tfAnswersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.play-answer');
      if (!btn || btn.disabled) return;

      var answerValue = btn.dataset.answer; // 'true' or 'false'
      var opt = currentOptions.find(function (o) {
        return o.option_text.toLowerCase() === answerValue;
      });
      submitAnswer(opt ? opt.id : null, btn);
    });
  }

  function submitAnswer(optionId, btn) {
    clearInterval(timerInterval);
    QuizSound.stopMusic();

    // Disable all answer buttons
    if (mcAnswersEl) mcAnswersEl.querySelectorAll('.play-answer').forEach(function (b) { b.disabled = true; });
    if (tfAnswersEl) tfAnswersEl.querySelectorAll('.play-answer').forEach(function (b) { b.disabled = true; });

    btn.classList.add('play-answer--selected');

    socket.emit('submit-answer', {
      pin: pin,
      questionId: currentQId,
      optionId: optionId,
      timeRemaining: Math.max(0, timeRemaining)
    });

    switchState('answered');
  }

  /* ---- answer result ---- */
  socket.on('answer-result', function (data) {
    if (data.isCorrect) {
      QuizSound.correct();
    } else {
      QuizSound.wrong();
    }
    if (data.isCorrect) {
      if (resultIconEl) {
        resultIconEl.textContent = '\u2714';
        resultIconEl.className = 'play-result__icon play-result__icon--correct';
      }
      if (resultTextEl) {
        resultTextEl.textContent = typeof t === 'function' ? t('play.correct') : 'Correct!';
        resultTextEl.className = 'play-result__text play-result__text--correct';
      }
    } else {
      if (resultIconEl) {
        resultIconEl.textContent = '\u2718';
        resultIconEl.className = 'play-result__icon play-result__icon--wrong';
      }
      if (resultTextEl) {
        resultTextEl.textContent = typeof t === 'function' ? t('play.wrong') : 'Wrong!';
        resultTextEl.className = 'play-result__text play-result__text--wrong';
      }
    }

    if (resultPointsEl) resultPointsEl.textContent = '+' + (data.scoreGained || 0);
    if (resultTotalEl) resultTotalEl.textContent = data.totalScore || 0;
    if (resultStreakEl) resultStreakEl.textContent = (data.streak || 0) + ' \uD83D\uDD25';

    switchState('result');
  });

  /* ---- time up (no answer submitted) ---- */
  socket.on('time-up', function () {
    clearInterval(timerInterval);
    QuizSound.stopMusic();
    QuizSound.timeUp();
    if (currentState === 'question') {
      // Player didn't answer in time
      if (resultIconEl) {
        resultIconEl.textContent = '\u23F0';
        resultIconEl.className = 'play-result__icon play-result__icon--wrong';
      }
      if (resultTextEl) {
        resultTextEl.textContent = typeof t === 'function' ? t('play.wrong') : 'Time\'s up!';
        resultTextEl.className = 'play-result__text play-result__text--wrong';
      }
      if (resultPointsEl) resultPointsEl.textContent = '+0';
      if (resultTotalEl) resultTotalEl.textContent = '-';
      if (resultStreakEl) resultStreakEl.textContent = '0';
      switchState('result');
    }
  });

  /* ---- halftime ---- */
  socket.on('halftime', function (data) {
    QuizSound.halftime();
    var rankings = data.rankings || [];
    var me = rankings.find(function (r) { return r.nickname === nickname; });
    if (halftimeRankEl) halftimeRankEl.textContent = me ? '#' + me.rank : '-';
    if (halftimeScoreEl) halftimeScoreEl.textContent = me ? me.score : '0';
    switchState('halftime');
  });

  /* ---- leaderboard ---- */
  socket.on('leaderboard', function (data) {
    QuizSound.leaderboard();
    var rankings = data.rankings || [];
    var me = rankings.find(function (r) { return r.nickname === nickname; });
    if (playRankEl) playRankEl.textContent = me ? '#' + me.rank : '-';
    if (playScoreEl) playScoreEl.textContent = me ? me.score : '0';
    switchState('leaderboard');
  });

  /* ---- game ended ---- */
  socket.on('game-ended', function (data) {
    QuizSound.stopMusic();
    QuizSound.victory();
    var rankings = data.rankings || [];
    var me = rankings.find(function (r) { return r.nickname === nickname; });

    if (finalRankEl) finalRankEl.textContent = me ? '#' + me.rank : '-';
    if (finalScoreEl) finalScoreEl.textContent = me ? me.score : '0';

    if (me && me.rank <= 3) {
      if (finalTop3Msg) finalTop3Msg.hidden = false;
      if (finalCelebration) {
        finalCelebration.hidden = false;
        var confettiArea = finalCelebration.querySelector('.confetti-area');
        if (confettiArea) spawnConfetti(confettiArea);
      }
    } else {
      if (finalTop3Msg) finalTop3Msg.hidden = true;
      if (finalCelebration) finalCelebration.hidden = true;
    }

    switchState('final');
  });

  /* ---- confetti ---- */
  function spawnConfetti(area) {
    if (!area) return;
    area.innerHTML = '';
    var colors = ['#E21B3C', '#1368CE', '#D89E00', '#26890C', '#FFD700', '#FF69B4', '#46178F'];
    for (var i = 0; i < 50; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 2) + 's';
      piece.style.animationDuration = (2 + Math.random() * 3) + 's';
      area.appendChild(piece);
    }
  }

  socket.on('error', function (data) {
    alert(data.message || data.error || 'Error');
  });

  /* ---- reaction bar ---- */
  var reactionBar = document.getElementById('reaction-bar');
  var reactionCooldown = false;

  // Show reaction bar during answered/result states
  function updateReactionBar() {
    if (!reactionBar) return;
    reactionBar.hidden = !(currentState === 'answered' || currentState === 'result');
  }

  // Override switchState to also update reaction bar
  var _origSwitchState = switchState;
  switchState = function (newState) {
    _origSwitchState(newState);
    updateReactionBar();
  };

  if (reactionBar) {
    reactionBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.reaction-btn');
      if (!btn || reactionCooldown) return;
      var emoji = btn.dataset.emoji;
      socket.emit('reaction', { pin: pin, emoji: emoji });
      reactionCooldown = true;
      btn.classList.add('reaction-btn--sent');
      setTimeout(function () {
        reactionCooldown = false;
        btn.classList.remove('reaction-btn--sent');
      }, 2000);
    });
  }

  /* ---- sound toggle ---- */
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', function () {
      var on = QuizSound.toggle();
      soundToggleBtn.textContent = on ? '\uD83D\uDD0A' : '\uD83D\uDD07';
      soundToggleBtn.classList.toggle('sound-toggle--muted', !on);
    });
  }

})();
