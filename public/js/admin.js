/* ============================================================
   QuizBattle – Admin Panel
   ============================================================ */
(function () {
  'use strict';

  var currentTab = 'pending';
  var allUsers = [];

  /* ---- DOM refs ---- */
  var statTotal   = document.getElementById('stat-total');
  var statPending = document.getElementById('stat-pending');
  var statQuizzes = document.getElementById('stat-quizzes');
  var statPremium = document.getElementById('stat-premium');
  var pendingBadge = document.getElementById('pending-badge');
  var usersTbody  = document.getElementById('users-tbody');
  var noUsersEl   = document.getElementById('no-users');
  var searchInput = document.getElementById('search-input');
  var tabs        = document.querySelectorAll('.admin-tab');
  var resetModal  = document.getElementById('reset-modal');
  var resetModalUser = document.getElementById('reset-modal-user');
  var resetModalPw   = document.getElementById('reset-modal-password');
  var resetModalClose = document.getElementById('reset-modal-close');

  /* ---- Auth check ---- */
  fetch('/api/auth/me')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data.user || data.user.role !== 'admin') {
        window.location.href = '/dashboard.html';
        return;
      }
      loadStats();
      loadUsers();
    })
    .catch(function () {
      window.location.href = '/login.html';
    });

  /* ---- Load stats ---- */
  function loadStats() {
    fetch('/api/admin/stats')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (statTotal) statTotal.textContent = data.total_users || 0;
        if (statPending) statPending.textContent = data.pending_count || 0;
        if (statQuizzes) statQuizzes.textContent = data.total_quizzes || 0;
        if (statPremium) statPremium.textContent = data.premium_count || 0;
        if (pendingBadge) {
          pendingBadge.textContent = data.pending_count || 0;
          pendingBadge.hidden = !data.pending_count;
        }
      });
  }

  /* ---- Load users ---- */
  function loadUsers() {
    var url = '/api/admin/users';
    if (currentTab === 'pending') url += '?status=pending';

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (users) {
        allUsers = users;
        renderUsers(users);
      });
  }

  /* ---- Render users table ---- */
  function renderUsers(users) {
    if (!usersTbody) return;

    var search = (searchInput && searchInput.value || '').toLowerCase();
    var filtered = users;
    if (search) {
      filtered = users.filter(function (u) {
        return (u.username || '').toLowerCase().indexOf(search) >= 0 ||
               (u.email || '').toLowerCase().indexOf(search) >= 0;
      });
    }

    usersTbody.innerHTML = '';
    if (noUsersEl) noUsersEl.hidden = filtered.length > 0;

    filtered.forEach(function (user) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="admin-table__user">' + esc(user.username) + '</td>' +
        '<td>' + esc(user.email || '-') + '</td>' +
        '<td>' + roleBadge(user.role) + '</td>' +
        '<td>' + statusBadge(user.status) + '</td>' +
        '<td>' + (user.quiz_count || 0) + '</td>' +
        '<td>' + formatDate(user.last_login) + '</td>' +
        '<td class="admin-table__actions">' + renderActions(user) + '</td>';
      usersTbody.appendChild(tr);
    });

    // Bind action buttons
    usersTbody.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleAction(btn.dataset.action, btn.dataset.id, btn.dataset.value);
      });
    });
  }

  /* ---- Role badge ---- */
  function roleBadge(role) {
    var cls = 'role-badge role-badge--' + (role || 'member');
    var label = (role || 'member').charAt(0).toUpperCase() + (role || 'member').slice(1);
    return '<span class="' + cls + '">' + label + '</span>';
  }

  /* ---- Status badge ---- */
  function statusBadge(status) {
    var cls = 'status-badge status-badge--' + (status || 'pending');
    var label = (status || 'pending').charAt(0).toUpperCase() + (status || 'pending').slice(1);
    return '<span class="' + cls + '">' + label + '</span>';
  }

  /* ---- Render action buttons ---- */
  function renderActions(user) {
    var html = '';

    if (user.status === 'pending') {
      html += '<button class="btn btn--sm btn--green" data-action="approve" data-id="' + user.id + '">' +
              (typeof t === 'function' ? t('admin.approve') : 'Approve') + '</button> ';
      html += '<button class="btn btn--sm btn--red" data-action="reject" data-id="' + user.id + '">' +
              (typeof t === 'function' ? t('admin.reject') : 'Reject') + '</button> ';
    }

    if (user.role !== 'admin') {
      html += '<select class="admin-role-select" data-action="role" data-id="' + user.id + '">';
      html += '<option value="member"' + (user.role === 'member' ? ' selected' : '') + '>Member</option>';
      html += '<option value="premium"' + (user.role === 'premium' ? ' selected' : '') + '>Premium</option>';
      html += '</select> ';

      html += '<button class="btn btn--sm btn--outline" data-action="reset" data-id="' + user.id + '">' +
              (typeof t === 'function' ? t('admin.resetPassword') : 'Reset PW') + '</button>';
    }

    return html || '-';
  }

  /* ---- Handle actions ---- */
  function handleAction(action, userId, value) {
    if (action === 'approve') {
      if (!confirm(typeof t === 'function' ? t('admin.confirmApprove') : 'Approve this user?')) return;
      fetch('/api/admin/users/' + userId + '/approve', { method: 'PUT' })
        .then(function (res) { return res.json(); })
        .then(function () { loadStats(); loadUsers(); });
    }

    if (action === 'reject') {
      if (!confirm(typeof t === 'function' ? t('admin.confirmReject') : 'Reject this user?')) return;
      fetch('/api/admin/users/' + userId + '/reject', { method: 'PUT' })
        .then(function (res) { return res.json(); })
        .then(function () { loadStats(); loadUsers(); });
    }

    if (action === 'reset') {
      if (!confirm(typeof t === 'function' ? t('admin.confirmReset') : 'Reset password for this user?')) return;
      fetch('/api/admin/users/' + userId + '/reset-password', { method: 'POST' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.newPassword) {
            showResetModal(data.username, data.newPassword);
          }
        });
    }
  }

  /* ---- Role select change ---- */
  if (usersTbody) {
    usersTbody.addEventListener('change', function (e) {
      var select = e.target.closest('.admin-role-select');
      if (!select) return;
      var userId = select.dataset.id;
      var newRole = select.value;
      fetch('/api/admin/users/' + userId + '/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
        .then(function (res) { return res.json(); })
        .then(function () { loadStats(); loadUsers(); });
    });
  }

  /* ---- Reset password modal ---- */
  function showResetModal(username, password) {
    if (resetModalUser) resetModalUser.textContent = username;
    if (resetModalPw) resetModalPw.textContent = password;
    if (resetModal) resetModal.hidden = false;
  }

  if (resetModalClose) {
    resetModalClose.addEventListener('click', function () {
      if (resetModal) resetModal.hidden = true;
    });
  }
  if (resetModal) {
    resetModal.querySelector('.modal__backdrop').addEventListener('click', function () {
      resetModal.hidden = true;
    });
  }

  /* ---- Tabs ---- */
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('admin-tab--active'); });
      tab.classList.add('admin-tab--active');
      currentTab = tab.dataset.tab;
      loadUsers();
    });
  });

  /* ---- Search ---- */
  if (searchInput) {
    var searchTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        renderUsers(allUsers);
      }, 300);
    });
  }

  /* ---- Helpers ---- */
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
})();
