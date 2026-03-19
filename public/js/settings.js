/* ============================================================
   QuizBattle – Account Settings
   ============================================================ */
(function () {
  'use strict';

  var infoUsername = document.getElementById('info-username');
  var infoEmail   = document.getElementById('info-email');
  var infoRole    = document.getElementById('info-role');
  var infoSince   = document.getElementById('info-since');

  var emailForm   = document.getElementById('email-form');
  var emailMsg    = document.getElementById('email-msg');
  var pwForm      = document.getElementById('password-form');
  var pwMsg       = document.getElementById('password-msg');

  var deleteBtn   = document.getElementById('delete-account-btn');
  var deleteModal = document.getElementById('delete-modal');
  var deleteConfirm = document.getElementById('delete-confirm');
  var deleteCancel  = document.getElementById('delete-cancel');
  var deleteMsg   = document.getElementById('delete-msg');

  /* ---- Auth check + load profile ---- */
  fetch('/api/auth/me')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data.user) {
        window.location.href = '/login.html';
        return;
      }
      var u = data.user;
      if (infoUsername) infoUsername.textContent = u.username;
      if (infoEmail) infoEmail.textContent = u.email || '-';
      if (infoRole) {
        var role = u.role || 'member';
        infoRole.innerHTML = '<span class="role-badge role-badge--' + role + '">' +
          role.charAt(0).toUpperCase() + role.slice(1) + '</span>';
      }
      if (infoSince) {
        infoSince.textContent = u.created_at ? new Date(u.created_at).toLocaleDateString() : '-';
      }
      // Pre-fill email
      var newEmailInput = document.getElementById('new-email');
      if (newEmailInput && u.email) newEmailInput.value = u.email;

      // Hide delete for admin
      if (u.role === 'admin' && deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = typeof t === 'function' ? t('settings.adminCantDelete') : 'Admin cannot delete own account';
      }
    })
    .catch(function () {
      window.location.href = '/login.html';
    });

  /* ---- Show message helper ---- */
  function showMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'settings-msg settings-msg--' + (type || 'error');
    el.hidden = false;
    if (type !== 'success') {
      setTimeout(function () { el.hidden = true; }, 4000);
    } else {
      setTimeout(function () { el.hidden = true; }, 3000);
    }
  }

  /* ---- Change email ---- */
  if (emailForm) {
    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('new-email').value.trim();
      if (!email) return;

      fetch('/api/auth/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
        .then(function (result) {
          if (!result.ok) {
            showMsg(emailMsg, result.data.error || 'Failed', 'error');
            return;
          }
          showMsg(emailMsg, typeof t === 'function' ? t('settings.emailSaved') : 'Email updated!', 'success');
          if (infoEmail) infoEmail.textContent = email;
        })
        .catch(function () { showMsg(emailMsg, 'Network error', 'error'); });
    });
  }

  /* ---- Change password ---- */
  if (pwForm) {
    pwForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var oldPw = document.getElementById('old-password').value;
      var newPw = document.getElementById('new-password').value;
      var confirmPw = document.getElementById('confirm-password').value;

      if (!oldPw || !newPw) {
        showMsg(pwMsg, typeof t === 'function' ? t('settings.allFieldsRequired') : 'All fields required', 'error');
        return;
      }
      if (newPw !== confirmPw) {
        showMsg(pwMsg, typeof t === 'function' ? t('auth.passwordMismatch') : 'Passwords do not match', 'error');
        return;
      }
      if (newPw.length < 4) {
        showMsg(pwMsg, typeof t === 'function' ? t('settings.passwordTooShort') : 'Min 4 characters', 'error');
        return;
      }

      fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
        .then(function (result) {
          if (!result.ok) {
            showMsg(pwMsg, result.data.error || 'Failed', 'error');
            return;
          }
          showMsg(pwMsg, typeof t === 'function' ? t('settings.passwordSaved') : 'Password changed!', 'success');
          pwForm.reset();
        })
        .catch(function () { showMsg(pwMsg, 'Network error', 'error'); });
    });
  }

  /* ---- Delete account ---- */
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function () {
      if (deleteModal) deleteModal.hidden = false;
    });
  }
  if (deleteCancel) {
    deleteCancel.addEventListener('click', function () {
      if (deleteModal) deleteModal.hidden = true;
    });
  }
  if (deleteModal) {
    var backdrop = deleteModal.querySelector('.modal__backdrop');
    if (backdrop) backdrop.addEventListener('click', function () { deleteModal.hidden = true; });
  }
  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', function () {
      var pw = document.getElementById('delete-password').value;
      if (!pw) {
        showMsg(deleteMsg, typeof t === 'function' ? t('auth.password') + ' required' : 'Password required', 'error');
        return;
      }

      fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
        .then(function (result) {
          if (!result.ok) {
            showMsg(deleteMsg, result.data.error || 'Failed', 'error');
            return;
          }
          window.location.href = '/';
        })
        .catch(function () { showMsg(deleteMsg, 'Network error', 'error'); });
    });
  }
})();
