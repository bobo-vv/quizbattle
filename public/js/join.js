/* ============================================================
   ZapQuiz – Join Game
   Uses REST API to validate PIN, then redirects to play.html
   where the actual socket connection happens (only once).
   ============================================================ */
(function () {
  'use strict';

  var pinInput      = document.getElementById('game-pin');
  var nicknameInput = document.getElementById('nickname');
  var joinBtn       = document.getElementById('join-btn');
  var joinMessage   = document.getElementById('join-message');
  var avatarGrid    = document.getElementById('avatar-grid');
  var avatars       = ['🐱','🐶','🐻','🐼','🦊','🐸','🐵','🐰','🐯','🦁','🐲','🦄','🐧','🐥','🦋','🐙','🦀','🐳','🦉','🐺'];
  var selectedAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  function showMessage(text, type) {
    if (!joinMessage) return;
    joinMessage.textContent = text;
    joinMessage.className = 'join-message join-message--' + (type || 'error');
    joinMessage.hidden = false;
    setTimeout(function () { joinMessage.hidden = true; }, 4000);
  }

  /* ---- validate ---- */
  function validate() {
    var pin = (pinInput.value || '').trim();
    var nick = (nicknameInput.value || '').trim();

    if (!/^\d{6}$/.test(pin)) {
      showMessage('Game PIN must be 6 digits', 'error');
      return null;
    }
    if (!nick || nick.length > 20) {
      showMessage('Nickname is required (max 20 characters)', 'error');
      return null;
    }
    return { pin: pin, nickname: nick };
  }

  /* ---- join via REST API (no socket here) ---- */
  joinBtn.addEventListener('click', function () {
    var data = validate();
    if (!data) return;

    joinBtn.disabled = true;
    joinBtn.textContent = '...';

    // Validate PIN via REST API - no socket connection needed
    fetch('/api/games/' + data.pin)
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) { throw new Error(err.error || 'Game not found'); });
        }
        return res.json();
      })
      .then(function (game) {
        if (game.state !== 'lobby') {
          throw new Error('Game has already started');
        }

        // Store for play page - socket join happens there
        sessionStorage.setItem('zapquiz_pin', data.pin);
        sessionStorage.setItem('zapquiz_nickname', data.nickname);
        sessionStorage.setItem('zapquiz_avatar', selectedAvatar);
        window.location.href = '/play.html';
      })
      .catch(function (err) {
        joinBtn.disabled = false;
        joinBtn.textContent = typeof t === 'function' ? t('join.joinBtn') : 'Join!';
        showMessage(err.message || 'Could not join game', 'error');
      });
  });

  /* ---- avatar selection ---- */
  // Highlight default random avatar
  if (avatarGrid) {
    var allAvatarBtns = avatarGrid.querySelectorAll('.avatar-option');
    allAvatarBtns.forEach(function (btn) {
      if (btn.dataset.avatar === selectedAvatar) btn.classList.add('avatar-option--selected');
      btn.addEventListener('click', function () {
        allAvatarBtns.forEach(function (b) { b.classList.remove('avatar-option--selected'); });
        btn.classList.add('avatar-option--selected');
        selectedAvatar = btn.dataset.avatar;
      });
    });
  }

  /* ---- auto-fill PIN from URL query ---- */
  var urlPin = new URLSearchParams(window.location.search).get('pin');
  if (urlPin && /^\d{6}$/.test(urlPin)) {
    pinInput.value = urlPin;
    if (nicknameInput) nicknameInput.focus();
  }

  /* ---- auto-format PIN input ---- */
  pinInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
  });

  /* ---- enter key ---- */
  [pinInput, nicknameInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') joinBtn.click();
    });
  });

})();
