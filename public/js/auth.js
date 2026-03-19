/* ============================================================
   QuizBattle – Auth (Login / Register)
   ============================================================ */
(function () {
  'use strict';

  /* ---- DOM refs ---- */
  var loginForm    = document.getElementById('login-form');
  var registerForm = document.getElementById('register-form');
  var tabs         = document.querySelectorAll('.auth-tab');
  var authMessage  = document.getElementById('auth-message');

  /* ---- helpers ---- */

  function showMessage(text, type) {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = 'auth-message auth-message--' + (type || 'error');
    authMessage.hidden = false;
    setTimeout(function () { authMessage.hidden = true; }, 4000);
  }

  function showForm(name) {
    tabs.forEach(function (tab) {
      tab.classList.toggle('auth-tab--active', tab.dataset.tab === name);
    });
    document.querySelectorAll('.auth-form').forEach(function (form) {
      form.classList.toggle('auth-form--active', form.dataset.form === name);
    });
    if (authMessage) authMessage.hidden = true;
  }

  /* ---- tab switching ---- */
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showForm(tab.dataset.tab);
    });
  });

  /* ---- login ---- */
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = document.getElementById('login-username').value.trim();
      var password = document.getElementById('login-password').value;

      if (!username || !password) {
        showMessage(t('auth.username') + ' / ' + t('auth.password') + ' required', 'error');
        return;
      }

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) {
            showMessage(result.data.error || result.data.message || 'Login failed', 'error');
            return;
          }
          window.location.href = '/dashboard.html';
        })
        .catch(function () {
          showMessage('Network error', 'error');
        });
    });
  }

  /* ---- register ---- */
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = document.getElementById('reg-username').value.trim();
      var password = document.getElementById('reg-password').value;
      var confirm  = document.getElementById('reg-confirm').value;

      if (!username || !password) {
        showMessage(t('auth.username') + ' / ' + t('auth.password') + ' required', 'error');
        return;
      }
      if (password !== confirm) {
        showMessage('Passwords do not match', 'error');
        return;
      }

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) {
            showMessage(result.data.error || result.data.message || 'Registration failed', 'error');
            return;
          }
          window.location.href = '/dashboard.html';
        })
        .catch(function () {
          showMessage('Network error', 'error');
        });
    });
  }
})();
