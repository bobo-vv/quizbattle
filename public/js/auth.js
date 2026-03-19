/* ============================================================
   ZapQuiz – Auth (Login / Register)
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
    if (type !== 'success') {
      setTimeout(function () { authMessage.hidden = true; }, 5000);
    }
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
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); })
        .then(function (result) {
          if (!result.ok) {
            // Show specific messages for pending/rejected
            if (result.status === 403 && result.data.status === 'pending') {
              showMessage(typeof t === 'function' ? t('auth.pendingApproval') : 'Your account is pending admin approval', 'warning');
            } else if (result.status === 403 && result.data.status === 'rejected') {
              showMessage(typeof t === 'function' ? t('auth.rejectedAccount') : 'Your account has been rejected', 'error');
            } else {
              showMessage(result.data.error || 'Login failed', 'error');
            }
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
      var email    = document.getElementById('reg-email').value.trim();
      var password = document.getElementById('reg-password').value;
      var confirm  = document.getElementById('reg-confirm').value;
      var terms    = document.getElementById('reg-terms').checked;

      if (!username || !email || !password) {
        showMessage(typeof t === 'function' ? t('auth.allFieldsRequired') : 'All fields are required', 'error');
        return;
      }
      if (password !== confirm) {
        showMessage(typeof t === 'function' ? t('auth.passwordMismatch') : 'Passwords do not match', 'error');
        return;
      }
      if (!terms) {
        showMessage(typeof t === 'function' ? t('auth.mustAcceptTerms') : 'You must accept the terms', 'error');
        return;
      }

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
          acceptedTerms: terms
        })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) {
            showMessage(result.data.error || 'Registration failed', 'error');
            return;
          }
          // Show success message — do NOT redirect (must wait for admin approval)
          showMessage(typeof t === 'function' ? t('auth.registerSuccess') : 'Registration successful! Please wait for admin approval.', 'success');
          // Clear form
          registerForm.reset();
        })
        .catch(function () {
          showMessage('Network error', 'error');
        });
    });
  }
})();
