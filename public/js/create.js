/* ============================================================
   ZapQuiz – Create / Edit Quiz
   ============================================================ */
(function () {
  'use strict';

  /* ---- state ---- */
  var quizId            = null;
  var questions         = [];    // array of question objects
  var selectedIndex     = -1;    // currently selected question index
  var dirty             = false; // unsaved changes to current question

  /* ---- DOM refs ---- */
  var quizTitleInput    = document.getElementById('quiz-title');
  var quizDescInput     = document.getElementById('quiz-description');
  var saveQuizBtn       = document.getElementById('save-quiz-btn');
  var questionListEl    = document.getElementById('question-list');
  var addQuestionBtn    = document.getElementById('add-question-btn');
  var editorEmpty       = document.getElementById('editor-empty');
  var editorForm        = document.getElementById('editor-form');
  var questionTextEl    = document.getElementById('question-text');
  var questionImageEl   = document.getElementById('question-image');
  var timeLimitEl       = document.getElementById('time-limit');
  var pointsEl          = document.getElementById('points');
  var mcOptions         = document.getElementById('mc-options');
  var tfOptions         = document.getElementById('tf-options');
  var typeButtons       = document.querySelectorAll('.type-btn');
  var deleteQuestionBtn = document.getElementById('delete-question-btn');
  var optionInputs      = mcOptions.querySelectorAll('.answer-option__input');

  /* ---- helpers ---- */

  function getUrlParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function showToast(msg, type) {
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('toast--visible'); }, 10);
    setTimeout(function () {
      el.classList.remove('toast--visible');
      setTimeout(function () { el.remove(); }, 400);
    }, 2500);
  }

  /* ---- auth guard ---- */
  function checkAuth() {
    return fetch('/api/auth/me')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.id && (!d.user || d.user === null)) {
          window.location.href = '/login.html';
          return false;
        }
        return true;
      });
  }

  /* ---- render question list ---- */
  function renderQuestionList() {
    questionListEl.innerHTML = '';
    questions.forEach(function (q, i) {
      var li = document.createElement('li');
      li.className = 'question-list__item' + (i === selectedIndex ? ' question-list__item--active' : '');
      li.textContent = (i + 1) + '. ' + (q.question_text || t('create.questionText'));
      li.addEventListener('click', function () { selectQuestion(i); });
      questionListEl.appendChild(li);
    });
  }

  /* ---- select question ---- */
  function selectQuestion(index) {
    // auto-save previous question
    if (selectedIndex >= 0 && dirty) {
      saveCurrentQuestion(true);
    }

    selectedIndex = index;
    dirty = false;

    if (index < 0 || index >= questions.length) {
      editorEmpty.hidden = false;
      editorForm.hidden = true;
      renderQuestionList();
      return;
    }

    editorEmpty.hidden = true;
    editorForm.hidden = false;

    var q = questions[index];

    // Type
    var qType = q.type || 'multiple-choice';
    typeButtons.forEach(function (btn) {
      btn.classList.toggle('type-btn--active', btn.dataset.type === qType);
    });
    toggleOptionsPanel(qType);

    questionTextEl.value = q.question_text || '';
    questionImageEl.value = q.image_url || '';
    timeLimitEl.value = q.time_limit || 20;
    pointsEl.value = q.points || 1000;

    // MC options
    var opts = q.options || [];
    for (var i = 0; i < 4; i++) {
      var opt = opts[i] || {};
      optionInputs[i].value = opt.option_text || '';
      var radio = document.getElementById('correct-' + i);
      if (radio) radio.checked = !!opt.is_correct;
    }

    // TF options
    if (qType === 'true-false') {
      var trueCorrect = opts.find(function (o) { return o.option_text === 'True' || o.option_text === 'true'; });
      document.getElementById('correct-true').checked = !!(trueCorrect && trueCorrect.is_correct);
      document.getElementById('correct-false').checked = !trueCorrect || !trueCorrect.is_correct;
    }

    renderQuestionList();
  }

  function toggleOptionsPanel(type) {
    if (type === 'true-false') {
      mcOptions.hidden = true;
      tfOptions.hidden = false;
    } else {
      mcOptions.hidden = false;
      tfOptions.hidden = true;
    }
  }

  /* ---- gather current question data from form ---- */
  function gatherQuestionData() {
    var activeType = 'multiple-choice';
    typeButtons.forEach(function (btn) {
      if (btn.classList.contains('type-btn--active')) activeType = btn.dataset.type;
    });

    var options = [];
    if (activeType === 'true-false') {
      var trueChecked = document.getElementById('correct-true').checked;
      options = [
        { option_text: 'True', is_correct: trueChecked, sort_order: 0 },
        { option_text: 'False', is_correct: !trueChecked, sort_order: 1 }
      ];
    } else {
      for (var i = 0; i < 4; i++) {
        options.push({
          option_text: optionInputs[i].value.trim(),
          is_correct: document.getElementById('correct-' + i).checked,
          sort_order: i
        });
      }
    }

    return {
      type: activeType,
      question_text: questionTextEl.value.trim(),
      image_url: questionImageEl.value.trim() || null,
      time_limit: parseInt(timeLimitEl.value, 10) || 20,
      points: parseInt(pointsEl.value, 10) || 1000,
      sort_order: selectedIndex,
      options: options
    };
  }

  /* ---- save current question to server ---- */
  function saveCurrentQuestion(silent) {
    if (selectedIndex < 0 || selectedIndex >= questions.length) return Promise.resolve();

    var q = questions[selectedIndex];
    var data = gatherQuestionData();

    // update local
    Object.assign(q, data);

    var url, method;
    if (q.id) {
      url = '/api/quizzes/questions/' + q.id;
      method = 'PUT';
    } else {
      url = '/api/quizzes/' + quizId + '/questions';
      method = 'POST';
    }

    return fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) { return res.json(); })
      .then(function (saved) {
        if (saved.id) q.id = saved.id;
        if (saved.options) {
          q.options = saved.options;
        }
        dirty = false;
        if (!silent) showToast(t('create.save') + ' OK', 'success');
      })
      .catch(function (err) {
        if (!silent) showToast('Error: ' + err.message, 'error');
      });
  }

  /* ---- add question ---- */
  addQuestionBtn.addEventListener('click', function () {
    var newQ = {
      id: null,
      type: 'multiple-choice',
      question_text: '',
      image_url: null,
      time_limit: 20,
      points: 1000,
      sort_order: questions.length,
      options: [
        { option_text: '', is_correct: true, sort_order: 0 },
        { option_text: '', is_correct: false, sort_order: 1 },
        { option_text: '', is_correct: false, sort_order: 2 },
        { option_text: '', is_correct: false, sort_order: 3 }
      ]
    };
    questions.push(newQ);
    selectQuestion(questions.length - 1);
  });

  /* ---- delete question ---- */
  deleteQuestionBtn.addEventListener('click', function () {
    if (selectedIndex < 0) return;
    var q = questions[selectedIndex];
    if (!confirm(t('create.deleteQuestion') + '?')) return;

    if (q.id) {
      fetch('/api/quizzes/questions/' + q.id, { method: 'DELETE' })
        .then(function () {
          questions.splice(selectedIndex, 1);
          selectedIndex = -1;
          selectQuestion(questions.length > 0 ? 0 : -1);
        })
        .catch(function (err) { showToast('Error: ' + err.message, 'error'); });
    } else {
      questions.splice(selectedIndex, 1);
      selectedIndex = -1;
      selectQuestion(questions.length > 0 ? 0 : -1);
    }
  });

  /* ---- type buttons ---- */
  typeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      typeButtons.forEach(function (b) { b.classList.remove('type-btn--active'); });
      btn.classList.add('type-btn--active');
      toggleOptionsPanel(btn.dataset.type);
      dirty = true;
    });
  });

  /* ---- mark dirty on input changes ---- */
  [questionTextEl, questionImageEl, timeLimitEl, pointsEl].forEach(function (el) {
    el.addEventListener('input', function () { dirty = true; });
  });
  optionInputs.forEach(function (el) {
    el.addEventListener('input', function () { dirty = true; });
  });
  document.querySelectorAll('input[name="correct-answer"], input[name="correct-tf"]').forEach(function (el) {
    el.addEventListener('change', function () { dirty = true; });
  });

  /* ---- save quiz metadata ---- */
  saveQuizBtn.addEventListener('click', function () {
    var title = quizTitleInput.value.trim();
    var description = quizDescInput.value.trim();

    if (!title) {
      showToast(t('create.quizTitlePlaceholder') + ' required', 'error');
      return;
    }

    saveQuizBtn.disabled = true;

    // Step 1: Save quiz metadata first (must get quizId before saving questions)
    var saveMetaPromise;
    if (quizId) {
      saveMetaPromise = fetch('/api/quizzes/' + quizId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, description: description })
      });
    } else {
      saveMetaPromise = fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, description: description })
      }).then(function (res) { return res.json(); })
        .then(function (data) {
          quizId = data.id;
          window.history.replaceState(null, '', '/create.html?id=' + quizId);
          return data;
        });
    }

    // Step 2: AFTER quiz is saved, sync current form data to array, then save all
    saveMetaPromise
      .then(function () {
        // Sync current question's DOM form data back into the questions array
        if (selectedIndex >= 0 && selectedIndex < questions.length) {
          var formData = gatherQuestionData();
          Object.assign(questions[selectedIndex], formData);
        }
        return saveAllQuestions();
      })
      .then(function () {
        showToast(t('create.save') + ' OK', 'success');
      })
      .catch(function (err) {
        showToast('Error: ' + (err.message || 'Save failed'), 'error');
      })
      .finally(function () {
        saveQuizBtn.disabled = false;
      });
  });

  /* ---- save ALL questions to server ---- */
  function saveAllQuestions() {
    var chain = Promise.resolve();
    questions.forEach(function (q, i) {
      chain = chain.then(function () {
        var data = {
          type: q.type || 'multiple-choice',
          question_text: q.question_text || '',
          image_url: q.image_url || null,
          time_limit: q.time_limit || 20,
          points: q.points || 1000,
          sort_order: i,
          options: q.options || []
        };

        // Skip questions with no text
        if (!data.question_text.trim()) return Promise.resolve();

        var url, method;
        if (q.id) {
          url = '/api/quizzes/questions/' + q.id;
          method = 'PUT';
        } else {
          url = '/api/quizzes/' + quizId + '/questions';
          method = 'POST';
        }

        return fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (res) { return res.json(); })
          .then(function (saved) {
            if (saved.id) q.id = saved.id;
            if (saved.options) q.options = saved.options;
          });
      });
    });
    dirty = false;
    return chain;
  }

  /* ---- load existing quiz ---- */
  function loadQuiz(id) {
    return fetch('/api/quizzes/' + id)
      .then(function (res) { return res.json(); })
      .then(function (quiz) {
        quizTitleInput.value = quiz.title || '';
        quizDescInput.value = quiz.description || '';
        questions = (quiz.questions || []).sort(function (a, b) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        renderQuestionList();
        if (questions.length > 0) {
          selectQuestion(0);
        }
      });
  }

  /* ---- import: DOM refs ---- */
  var importBtn         = document.getElementById('import-btn');
  var downloadTemplBtn  = document.getElementById('download-template-btn');
  var importFileInput   = document.getElementById('import-file');
  var importPreviewEl   = document.getElementById('import-preview');

  /* ---- import: download template ---- */
  downloadTemplBtn.addEventListener('click', function () {
    var headers = [
      '\u0E04\u0E33\u0E16\u0E32\u0E21 (Question)',
      '\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17 (Type)',
      '\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01 A (Option A)',
      '\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01 B (Option B)',
      '\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01 C (Option C)',
      '\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01 D (Option D)',
      '\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01 (Correct Answer)',
      '\u0E40\u0E27\u0E25\u0E32 (Time Limit)',
      '\u0E04\u0E30\u0E41\u0E19\u0E19 (Points)'
    ];

    var rows = [
      headers,
      ['1+1 \u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E40\u0E17\u0E48\u0E32\u0E44\u0E2B\u0E23\u0E48?', 'mc', '1', '2', '3', '4', 'B', 20, 1000],
      ['\u0E42\u0E25\u0E01\u0E40\u0E1B\u0E47\u0E19\u0E14\u0E32\u0E27\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E14\u0E27\u0E07\u0E17\u0E35\u0E48 3 \u0E08\u0E32\u0E01\u0E14\u0E27\u0E07\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C', 'tf', '', '', '', '', 'true', 15, 1000],
      ['\u0E2A\u0E35\u0E02\u0E2D\u0E07\u0E17\u0E49\u0E2D\u0E07\u0E1F\u0E49\u0E32\u0E04\u0E37\u0E2D\u0E2A\u0E35\u0E2D\u0E30\u0E44\u0E23?', 'mc', '\u0E41\u0E14\u0E07', '\u0E40\u0E02\u0E35\u0E22\u0E27', '\u0E19\u0E49\u0E33\u0E40\u0E07\u0E34\u0E19', '\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E07', 'C', 20, 1000]
    ];

    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }
    ];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'zapquiz_template.xlsx');
  });

  /* ---- import: trigger file input ---- */
  importBtn.addEventListener('click', function () {
    importFileInput.value = '';
    importFileInput.click();
  });

  /* ---- import: parse file ---- */
  var parsedImportQuestions = [];

  importFileInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (evt) {
      try {
        var data = new Uint8Array(evt.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Skip header row
        parsedImportQuestions = [];
        for (var r = 1; r < json.length; r++) {
          var row = json[r];
          if (!row || !row[0]) continue;

          var qText = String(row[0] || '').trim();
          var qType = String(row[1] || 'mc').trim().toLowerCase();
          var optA = String(row[2] || '');
          var optB = String(row[3] || '');
          var optC = String(row[4] || '');
          var optD = String(row[5] || '');
          var correct = String(row[6] || '').trim();
          var timeLimit = parseInt(row[7], 10) || 20;
          var points = parseInt(row[8], 10) || 1000;

          var type = qType === 'tf' ? 'true-false' : 'multiple-choice';
          var options = [];

          if (type === 'true-false') {
            var isTrue = correct.toLowerCase() === 'true';
            options = [
              { option_text: 'True', is_correct: isTrue, sort_order: 0 },
              { option_text: 'False', is_correct: !isTrue, sort_order: 1 }
            ];
          } else {
            var answerMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            var correctIdx = answerMap[correct.toUpperCase()];
            if (correctIdx === undefined) correctIdx = 0;
            var optTexts = [optA, optB, optC, optD];
            for (var oi = 0; oi < 4; oi++) {
              options.push({
                option_text: optTexts[oi],
                is_correct: oi === correctIdx,
                sort_order: oi
              });
            }
          }

          parsedImportQuestions.push({
            question_text: qText,
            type: type,
            time_limit: timeLimit,
            points: points,
            options: options,
            _correctLabel: correct
          });
        }

        showImportPreview();
      } catch (err) {
        showToast(t('create.importError'), 'error');
        console.error('Import parse error:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  });

  /* ---- import: show preview ---- */
  function showImportPreview() {
    if (parsedImportQuestions.length === 0) {
      importPreviewEl.hidden = true;
      return;
    }

    var html = '<h3>' + t('create.importPreview') + '</h3>';
    html += '<p class="import-preview__count">' + t('create.importFound').replace('{0}', parsedImportQuestions.length) + '</p>';
    html += '<table><thead><tr><th>#</th><th>' + t('create.questionText') + '</th><th>' + t('create.questionType') + '</th><th>' + t('create.correct') + '</th></tr></thead><tbody>';

    for (var i = 0; i < parsedImportQuestions.length; i++) {
      var q = parsedImportQuestions[i];
      var typeLabel = q.type === 'true-false' ? t('create.trueFalse') : t('create.multipleChoice');
      html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(q.question_text) + '</td><td>' + typeLabel + '</td><td>' + escapeHtml(q._correctLabel) + '</td></tr>';
    }

    html += '</tbody></table>';
    html += '<div class="import-preview__actions">';
    html += '<button id="confirm-import-btn" class="btn btn--primary btn--full">' + t('create.importAll') + '</button>';
    html += '<button id="cancel-import-btn" class="btn btn--outline btn--full">' + t('create.importCancel') + '</button>';
    html += '</div>';

    importPreviewEl.innerHTML = html;
    importPreviewEl.hidden = false;

    document.getElementById('confirm-import-btn').addEventListener('click', doImport);
    document.getElementById('cancel-import-btn').addEventListener('click', function () {
      importPreviewEl.hidden = true;
      parsedImportQuestions = [];
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---- import: confirm import ---- */
  function doImport() {
    var confirmBtn = document.getElementById('confirm-import-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    var ensureQuiz;
    if (quizId) {
      ensureQuiz = Promise.resolve();
    } else {
      // Create quiz first
      var title = quizTitleInput.value.trim() || 'Untitled Quiz';
      var description = quizDescInput.value.trim();
      ensureQuiz = fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, description: description })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          quizId = data.id;
          window.history.replaceState(null, '', '/create.html?id=' + quizId);
        });
    }

    ensureQuiz
      .then(function () {
        // Build payload without _correctLabel
        var payload = parsedImportQuestions.map(function (q) {
          return {
            question_text: q.question_text,
            type: q.type,
            time_limit: q.time_limit,
            points: q.points,
            options: q.options
          };
        });

        return fetch('/api/quizzes/' + quizId + '/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: payload })
        });
      })
      .then(function (res) { return res.json(); })
      .then(function (created) {
        if (Array.isArray(created)) {
          showToast(t('create.importSuccess').replace('{0}', created.length), 'success');
        }
        importPreviewEl.hidden = true;
        parsedImportQuestions = [];
        // Reload quiz to show all questions
        return loadQuiz(quizId);
      })
      .catch(function (err) {
        showToast('Error: ' + (err.message || 'Import failed'), 'error');
        if (confirmBtn) confirmBtn.disabled = false;
      });
  }

  /* ---- init ---- */
  checkAuth().then(function (ok) {
    if (!ok) return;
    quizId = getUrlParam('id');
    if (quizId) {
      loadQuiz(quizId);
    }
  });

})();
