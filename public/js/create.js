/* ============================================================
   QuizBattle – Create / Edit Quiz
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

  /* ---- init ---- */
  checkAuth().then(function (ok) {
    if (!ok) return;
    quizId = getUrlParam('id');
    if (quizId) {
      loadQuiz(quizId);
    }
  });

})();
