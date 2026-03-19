/* ============================================================
   ZapQuiz – Game History
   ============================================================ */
(function () {
  'use strict';

  var listEl = document.getElementById('history-list');
  var emptyEl = document.getElementById('history-empty');
  var detailEl = document.getElementById('history-detail');
  var backBtn = document.getElementById('history-back');

  // Auth guard
  fetch('/api/auth/me').then(function (r) {
    if (!r.ok) window.location.href = '/login.html';
    else loadHistory();
  });

  function loadHistory() {
    fetch('/api/games/history')
      .then(function (r) { return r.json(); })
      .then(function (sessions) {
        if (!sessions || sessions.length === 0) {
          if (emptyEl) emptyEl.hidden = false;
          return;
        }
        if (emptyEl) emptyEl.hidden = true;
        renderList(sessions);
      });
  }

  function renderList(sessions) {
    if (!listEl) return;
    listEl.innerHTML = '';
    sessions.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'history-card';
      var dateStr = new Date(s.ended_at).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      card.innerHTML =
        '<div class="history-card__body">' +
          '<h3 class="history-card__title">' + escapeHtml(s.quiz_title) + '</h3>' +
          '<div class="history-card__meta">' +
            '<span>' + s.player_count + ' ' + (typeof t === 'function' ? t('history.players') : 'ผู้เล่น') + '</span>' +
            '<span>PIN: ' + s.pin + '</span>' +
            (s.team_mode ? '<span class="history-card__team-badge">Team</span>' : '') +
            '<span>' + dateStr + '</span>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn--sm btn--outline">' + (typeof t === 'function' ? t('history.viewDetail') : 'ดูรายละเอียด') + '</button>';
      card.querySelector('button').addEventListener('click', function () {
        loadDetail(s.id, s.quiz_title, s.pin, dateStr, s.player_count);
      });
      listEl.appendChild(card);
    });
  }

  function loadDetail(id, title, pin, dateStr, playerCount) {
    fetch('/api/games/history/' + id)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderDetail(data, title, pin, dateStr, playerCount);
      });
  }

  function renderDetail(data, title, pin, dateStr, playerCount) {
    if (listEl) listEl.hidden = true;
    if (detailEl) detailEl.hidden = false;

    document.getElementById('detail-title').textContent = title;
    document.getElementById('detail-date').textContent = dateStr;
    document.getElementById('detail-players').textContent = playerCount + ' ' + (typeof t === 'function' ? t('history.players') : 'ผู้เล่น');
    document.getElementById('detail-pin').textContent = 'PIN: ' + pin;

    // Players table
    var tbody = document.getElementById('detail-players-body');
    tbody.innerHTML = '';
    (data.players || []).forEach(function (p) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>#' + p.final_rank + '</td>' +
        '<td>' + (p.avatar ? '<span class="player-avatar">' + p.avatar + '</span>' : '') + escapeHtml(p.nickname) + '</td>' +
        '<td>' + p.final_score + '</td>' +
        '<td>' + p.total_correct + '/' + p.total_questions + '</td>';
      tbody.appendChild(tr);
    });

    // Answers table
    var abody = document.getElementById('detail-answers-body');
    abody.innerHTML = '';
    (data.answers || []).forEach(function (a) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(a.nickname) + '</td>' +
        '<td class="history-detail__question-text">' + escapeHtml(a.question_text) + '</td>' +
        '<td>' + (a.is_correct ? '<span class="history-correct">✔</span>' : '<span class="history-wrong">✘</span>') + '</td>' +
        '<td>+' + a.score_gained + '</td>';
      abody.appendChild(tr);
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (detailEl) detailEl.hidden = true;
      if (listEl) listEl.hidden = false;
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

})();
