/* ============================================================
   ZapQuiz – Quiz Preview
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var quizId = params.get('id');
  if (!quizId) { window.location.href = '/dashboard.html'; return; }

  var titleEl   = document.getElementById('preview-title');
  var emptyEl   = document.getElementById('preview-empty');
  var cardEl    = document.getElementById('preview-card');
  var qNumEl    = document.getElementById('preview-question-num');
  var qTextEl   = document.getElementById('preview-question-text');
  var imageEl   = document.getElementById('preview-image');
  var timeEl    = document.getElementById('preview-time');
  var pointsEl  = document.getElementById('preview-points');
  var optionsEl = document.getElementById('preview-options');
  var counterEl = document.getElementById('preview-counter');
  var prevBtn   = document.getElementById('preview-prev');
  var nextBtn   = document.getElementById('preview-next');

  var questions = [];
  var currentIndex = 0;

  var shapes = ['\u25B2', '\u25C6', '\u25CF', '\u25A0'];
  var colors = ['answer-red', 'answer-blue', 'answer-yellow', 'answer-green'];
  var colorsBg = ['var(--answer-red)', 'var(--answer-blue)', 'var(--answer-yellow)', 'var(--answer-green)'];

  // Auth guard
  fetch('/api/auth/me').then(function (r) {
    if (!r.ok) window.location.href = '/login.html';
    else loadQuiz();
  });

  function loadQuiz() {
    fetch('/api/quizzes/' + quizId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (titleEl) titleEl.textContent = (typeof t === 'function' ? t('preview.title') : 'ตัวอย่าง Quiz') + ' — ' + data.title;
        questions = data.questions || [];
        if (questions.length === 0) {
          if (emptyEl) emptyEl.hidden = false;
          return;
        }
        if (cardEl) cardEl.hidden = false;
        renderQuestion();
      });
  }

  function renderQuestion() {
    var q = questions[currentIndex];
    if (!q) return;

    qNumEl.textContent = (typeof t === 'function' ? t('preview.question') : 'คำถามที่') + ' ' + (currentIndex + 1);
    qTextEl.textContent = q.question_text;

    if (q.image_url) {
      imageEl.src = q.image_url;
      imageEl.hidden = false;
    } else {
      imageEl.hidden = true;
    }

    timeEl.textContent = q.time_limit;
    pointsEl.textContent = q.points;

    // Options
    optionsEl.innerHTML = '';
    (q.options || []).forEach(function (opt, i) {
      var div = document.createElement('div');
      div.className = 'preview-option' + (opt.is_correct ? ' preview-option--correct' : '');
      div.style.background = colorsBg[i % 4];
      div.innerHTML =
        '<span class="preview-option__shape">' + shapes[i % 4] + '</span>' +
        '<span class="preview-option__text">' + escapeHtml(opt.option_text) + '</span>' +
        (opt.is_correct ? '<span class="preview-option__badge">' + (typeof t === 'function' ? t('preview.correctAnswer') : '✓') + '</span>' : '');
      optionsEl.appendChild(div);
    });

    counterEl.textContent = (currentIndex + 1) + ' / ' + questions.length;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === questions.length - 1;
  }

  if (prevBtn) prevBtn.addEventListener('click', function () {
    if (currentIndex > 0) { currentIndex--; renderQuestion(); }
  });
  if (nextBtn) nextBtn.addEventListener('click', function () {
    if (currentIndex < questions.length - 1) { currentIndex++; renderQuestion(); }
  });

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
