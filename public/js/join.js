/* ============================================================
   QuizBattle – Join Game
   ============================================================ */
(function () {
  'use strict';

  var pinInput     = document.getElementById('game-pin');
  var nicknameInput = document.getElementById('nickname');
  var joinBtn      = document.getElementById('join-btn');
  var joinMessage  = document.getElementById('join-message');

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

  /* ---- join ---- */
  joinBtn.addEventListener('click', function () {
    var data = validate();
    if (!data) return;

    joinBtn.disabled = true;
    joinBtn.textContent = '...';

    var socket = io();

    socket.emit('join-game', { pin: data.pin, nickname: data.nickname });

    socket.on('game-joined', function () {
      // Store for play page
      sessionStorage.setItem('quizbattle_pin', data.pin);
      sessionStorage.setItem('quizbattle_nickname', data.nickname);
      window.location.href = '/play.html';
    });

    socket.on('error', function (err) {
      joinBtn.disabled = false;
      joinBtn.textContent = typeof t === 'function' ? t('join.joinBtn') : 'Join!';
      showMessage(err.message || err.error || 'Could not join game', 'error');
      socket.disconnect();
    });

    // Timeout after 5s
    setTimeout(function () {
      if (joinBtn.disabled) {
        joinBtn.disabled = false;
        joinBtn.textContent = typeof t === 'function' ? t('join.joinBtn') : 'Join!';
        showMessage('Connection timeout', 'error');
        socket.disconnect();
      }
    }, 5000);
  });

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
