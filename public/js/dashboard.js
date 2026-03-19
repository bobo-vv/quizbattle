/* ============================================================
   ZapQuiz – Dashboard
   ============================================================ */
(function () {
  'use strict';

  var quizList     = document.getElementById('quiz-list');
  var emptyState   = document.getElementById('empty-state');
  var usernameEl   = document.getElementById('display-username');
  var logoutBtn    = document.getElementById('logout-btn');
  var template     = document.getElementById('quiz-card-template');
  var roleBadgeEl  = document.getElementById('role-badge');
  var adminLink    = document.getElementById('admin-link');
  var adminBadge   = document.getElementById('admin-pending-badge');
  var quizLimitEl  = document.getElementById('quiz-limit-display');
  var welcomeBanner = document.getElementById('welcome-banner');
  var welcomeClose  = document.getElementById('welcome-close');

  /* ---- auth guard ---- */
  function checkAuth() {
    return fetch('/api/auth/me')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var user = data.user || null;
        if (!user) {
          window.location.href = '/login.html';
          return null;
        }
        return user;
      });
  }

  /* ---- render quizzes ---- */
  function loadQuizzes() {
    return fetch('/api/quizzes')
      .then(function (res) { return res.json(); })
      .then(function (quizzes) {
        quizList.innerHTML = '';

        if (!quizzes || quizzes.length === 0) {
          quizList.hidden = true;
          emptyState.hidden = false;
          return;
        }

        quizList.hidden = false;
        emptyState.hidden = true;

        quizzes.forEach(function (quiz) {
          var clone = template.content.cloneNode(true);
          var card = clone.querySelector('.quiz-card');

          card.querySelector('.quiz-card__title').textContent = quiz.title;
          card.querySelector('.quiz-card__desc').textContent = quiz.description || '';
          card.querySelector('.quiz-card__count-num').textContent = quiz.question_count || 0;
          card.querySelector('.quiz-card__date').textContent = new Date(quiz.created_at).toLocaleDateString();

          // Preview
          card.querySelector('.quiz-card__preview').addEventListener('click', function () {
            window.location.href = '/preview.html?id=' + quiz.id;
          });

          // Edit
          card.querySelector('.quiz-card__edit').addEventListener('click', function () {
            window.location.href = '/create.html?id=' + quiz.id;
          });

          // Play (host a game) — open mode modal
          card.querySelector('.quiz-card__play').addEventListener('click', function () {
            openGameModeModal(quiz.id);
          });

          // Stats
          card.querySelector('.quiz-card__stats').addEventListener('click', function () {
            window.location.href = '/stats.html?id=' + quiz.id;
          });

          // Duplicate
          card.querySelector('.quiz-card__duplicate').addEventListener('click', function () {
            fetch('/api/quizzes/' + quiz.id + '/duplicate', { method: 'POST' })
              .then(function () { loadQuizzes(); })
              .catch(function (err) { alert('Error: ' + err.message); });
          });

          // Delete
          card.querySelector('.quiz-card__delete').addEventListener('click', function () {
            if (!confirm(t('dashboard.delete') + ' "' + quiz.title + '"?')) return;
            fetch('/api/quizzes/' + quiz.id, { method: 'DELETE' })
              .then(function () { loadQuizzes(); })
              .catch(function (err) { alert('Error: ' + err.message); });
          });

          quizList.appendChild(clone);
        });

        // Reapply translations on dynamically-created elements
        applyTranslations();
        return quizzes.length;
      })
      .catch(function (err) {
        console.error('Failed to load quizzes:', err);
        return 0;
      });
  }

  /* ---- logout ---- */
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch('/api/auth/logout', { method: 'POST' })
        .then(function () { window.location.href = '/'; })
        .catch(function () { window.location.href = '/'; });
    });
  }

  /* ---- Show role badge ---- */
  function showRoleBadge(role) {
    if (!roleBadgeEl) return;
    var r = role || 'member';
    roleBadgeEl.className = 'role-badge role-badge--' + r;
    roleBadgeEl.textContent = r.charAt(0).toUpperCase() + r.slice(1);
    roleBadgeEl.hidden = false;
  }

  /* ---- Show admin link + pending count ---- */
  function setupAdmin() {
    if (!adminLink) return;
    adminLink.hidden = false;
    fetch('/api/admin/stats')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (adminBadge && data.pending_count) {
          adminBadge.textContent = data.pending_count;
          adminBadge.hidden = false;
        }
      });
  }

  /* ---- Quiz limit display ---- */
  function showQuizLimit(role, quizCount) {
    if (!quizLimitEl) return;
    if (role === 'admin' || role === 'premium') {
      quizLimitEl.textContent = quizCount + ' Quiz (Unlimited)';
    } else {
      quizLimitEl.textContent = quizCount + '/5 Quiz';
    }
    quizLimitEl.hidden = false;
  }

  /* ---- Welcome banner ---- */
  function checkWelcome(user) {
    var key = 'zapquiz_welcomed_' + user.username;
    if (localStorage.getItem(key)) return;
    if (user.status === 'approved') {
      if (welcomeBanner) welcomeBanner.hidden = false;
      localStorage.setItem(key, '1');
    }
  }
  if (welcomeClose) {
    welcomeClose.addEventListener('click', function () {
      if (welcomeBanner) welcomeBanner.hidden = true;
    });
  }

  /* ---- Game Mode Modal ---- */
  var gameModeModal  = document.getElementById('game-mode-modal');
  var teamCountSec   = document.getElementById('team-count-section');
  var gameModeStart  = document.getElementById('game-mode-start');
  var gameModeCancel = document.getElementById('game-mode-cancel');
  var selectedMode   = 'individual';
  var selectedTeamCount = 2;
  var pendingQuizId  = null;

  function openGameModeModal(quizId) {
    pendingQuizId = quizId;
    selectedMode = 'individual';
    selectedTeamCount = 2;
    if (gameModeModal) {
      gameModeModal.hidden = false;
      // Reset UI
      gameModeModal.querySelectorAll('.mode-option').forEach(function (el) {
        el.classList.toggle('mode-option--selected', el.dataset.mode === 'individual');
      });
      if (teamCountSec) teamCountSec.hidden = true;
      gameModeModal.querySelectorAll('.team-count-btn').forEach(function (btn) {
        btn.classList.toggle('team-count-btn--selected', btn.dataset.count === '2');
      });
    }
  }

  if (gameModeModal) {
    gameModeModal.querySelectorAll('.mode-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        selectedMode = opt.dataset.mode;
        gameModeModal.querySelectorAll('.mode-option').forEach(function (o) {
          o.classList.toggle('mode-option--selected', o === opt);
        });
        if (teamCountSec) teamCountSec.hidden = selectedMode !== 'team';
      });
    });

    gameModeModal.querySelectorAll('.team-count-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedTeamCount = parseInt(btn.dataset.count, 10);
        gameModeModal.querySelectorAll('.team-count-btn').forEach(function (b) {
          b.classList.toggle('team-count-btn--selected', b === btn);
        });
      });
    });

    gameModeModal.querySelector('.modal__backdrop').addEventListener('click', function () {
      gameModeModal.hidden = true;
    });
  }

  if (gameModeCancel) {
    gameModeCancel.addEventListener('click', function () {
      if (gameModeModal) gameModeModal.hidden = true;
    });
  }

  if (gameModeStart) {
    gameModeStart.addEventListener('click', function () {
      if (!pendingQuizId) return;
      var body = { quizId: pendingQuizId };
      if (selectedMode === 'team') {
        body.teamMode = true;
        body.teamCount = selectedTeamCount;
      }
      fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.pin) {
            window.location.href = '/host.html?pin=' + data.pin;
          } else if (data.error) {
            alert(data.error);
          }
        })
        .catch(function (err) { alert('Error creating game: ' + err.message); });
      if (gameModeModal) gameModeModal.hidden = true;
    });
  }

  /* ---- init ---- */
  checkAuth().then(function (user) {
    if (!user) return;
    if (usernameEl && user.username) {
      var lang = getCurrentLang();
      usernameEl.textContent = lang === 'th'
        ? 'สวัสดี, ' + user.username
        : 'Hello, ' + user.username;
    }

    showRoleBadge(user.role);
    if (user.role === 'admin') setupAdmin();
    checkWelcome(user);

    loadQuizzes().then(function (count) {
      showQuizLimit(user.role, count || 0);
    });
  });
})();
