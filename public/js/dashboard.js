/* ============================================================
   QuizBattle – Dashboard
   ============================================================ */
(function () {
  'use strict';

  var quizList     = document.getElementById('quiz-list');
  var emptyState   = document.getElementById('empty-state');
  var usernameEl   = document.getElementById('display-username');
  var logoutBtn    = document.getElementById('logout-btn');
  var template     = document.getElementById('quiz-card-template');

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
    fetch('/api/quizzes')
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

          // Edit
          card.querySelector('.quiz-card__edit').addEventListener('click', function () {
            window.location.href = '/create.html?id=' + quiz.id;
          });

          // Play (host a game)
          card.querySelector('.quiz-card__play').addEventListener('click', function () {
            fetch('/api/games/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quizId: quiz.id })
            })
              .then(function (res) { return res.json(); })
              .then(function (data) {
                if (data.pin) {
                  window.location.href = '/host.html?pin=' + data.pin;
                }
              })
              .catch(function (err) { alert('Error creating game: ' + err.message); });
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
      })
      .catch(function (err) {
        console.error('Failed to load quizzes:', err);
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

  /* ---- init ---- */
  checkAuth().then(function (user) {
    if (!user) return;
    if (usernameEl && user.username) {
      var lang = getCurrentLang();
      usernameEl.textContent = lang === 'th'
        ? 'สวัสดี, ' + user.username
        : 'Hello, ' + user.username;
    }
    loadQuizzes();
  });
})();
