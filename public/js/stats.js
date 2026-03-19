/* ============================================================
   ZapQuiz – Quiz Statistics
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var quizId = params.get('id');
  if (!quizId) { window.location.href = '/dashboard.html'; return; }

  var titleEl       = document.getElementById('stats-title');
  var emptyEl       = document.getElementById('stats-empty');
  var contentEl     = document.getElementById('stats-content');
  var timesEl       = document.getElementById('stat-times-played');
  var playersEl     = document.getElementById('stat-total-players');
  var avgScoreEl    = document.getElementById('stat-avg-score');
  var avgCorrectEl  = document.getElementById('stat-avg-correct');
  var barListEl     = document.getElementById('stats-bar-list');

  // Auth guard
  fetch('/api/auth/me').then(function (r) {
    if (!r.ok) window.location.href = '/login.html';
    else loadStats();
  });

  function loadStats() {
    fetch('/api/quizzes/' + quizId + '/stats')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.timesPlayed === 0) {
          if (emptyEl) emptyEl.hidden = false;
          return;
        }

        if (titleEl) titleEl.textContent = (typeof t === 'function' ? t('stats.title') : 'สถิติ Quiz') + ' — ' + data.title;
        if (contentEl) contentEl.hidden = false;

        if (timesEl) timesEl.textContent = data.timesPlayed;
        if (playersEl) playersEl.textContent = data.totalPlayers;
        if (avgScoreEl) avgScoreEl.textContent = data.avgScore;
        if (avgCorrectEl) avgCorrectEl.textContent = data.avgCorrectRate + '%';

        renderBars(data.questions || []);
      });
  }

  function renderBars(questions) {
    if (!barListEl) return;
    barListEl.innerHTML = '';

    questions.forEach(function (q, i) {
      var rate = q.correctRate;
      var colorClass = rate >= 70 ? 'stats-bar-item__bar--high' :
                       rate >= 40 ? 'stats-bar-item__bar--medium' :
                                    'stats-bar-item__bar--low';

      var div = document.createElement('div');
      div.className = 'stats-bar-item';
      div.innerHTML =
        '<div class="stats-bar-item__question">' +
          (i + 1) + '. ' + escapeHtml(q.questionText) +
        '</div>' +
        '<div class="stats-bar-item__bar-wrap">' +
          '<div class="stats-bar-item__bar ' + colorClass + '" style="width:' + Math.max(5, rate) + '%">' +
            rate + '%' +
          '</div>' +
        '</div>';
      barListEl.appendChild(div);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
