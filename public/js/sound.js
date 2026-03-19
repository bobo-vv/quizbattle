/* ============================================================
   QuizBattle – Sound Effects (Web Audio API)
   No external files needed – all synthesized in browser
   ============================================================ */
var QuizSound = (function () {
  'use strict';

  var ctx = null;
  var enabled = true;
  var musicGain = null;
  var sfxGain = null;
  var currentMusic = null; // track currently playing music nodes

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.3;
      musicGain.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.5;
      sfxGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playNote(freq, start, duration, type, gainNode, volume) {
    var c = getCtx();
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(volume || 0.3, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(g);
    g.connect(gainNode || sfxGain);
    osc.start(start);
    osc.stop(start + duration);
    return osc;
  }

  function playNoise(start, duration, gainNode, volume) {
    var c = getCtx();
    var bufferSize = c.sampleRate * duration;
    var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var source = c.createBufferSource();
    source.buffer = buffer;
    var g = c.createGain();
    g.gain.setValueAtTime(volume || 0.1, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(g);
    g.connect(gainNode || sfxGain);
    source.start(start);
    source.stop(start + duration);
  }

  /* ---- Sound Effects ---- */

  // Player joined - short cheerful ding
  function playerJoined() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    playNote(880, now, 0.15, 'sine', sfxGain, 0.25);
    playNote(1108, now + 0.1, 0.2, 'sine', sfxGain, 0.2);
  }

  // Correct answer - ascending happy chime
  function correct() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    playNote(523, now, 0.15, 'sine', sfxGain, 0.3);
    playNote(659, now + 0.1, 0.15, 'sine', sfxGain, 0.3);
    playNote(784, now + 0.2, 0.15, 'sine', sfxGain, 0.3);
    playNote(1047, now + 0.3, 0.4, 'sine', sfxGain, 0.35);
  }

  // Wrong answer - descending buzz
  function wrong() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    playNote(350, now, 0.2, 'sawtooth', sfxGain, 0.15);
    playNote(280, now + 0.15, 0.3, 'sawtooth', sfxGain, 0.12);
  }

  // Time's up - dramatic reveal
  function timeUp() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    playNote(600, now, 0.1, 'square', sfxGain, 0.15);
    playNote(500, now + 0.1, 0.1, 'square', sfxGain, 0.15);
    playNote(400, now + 0.2, 0.1, 'square', sfxGain, 0.15);
    playNoise(now + 0.3, 0.3, sfxGain, 0.15);
    playNote(700, now + 0.5, 0.5, 'sine', sfxGain, 0.25);
  }

  // Leaderboard reveal - fanfare
  function leaderboard() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    // Trumpet-like fanfare
    playNote(523, now, 0.2, 'square', sfxGain, 0.15);
    playNote(523, now + 0.2, 0.1, 'square', sfxGain, 0.12);
    playNote(523, now + 0.35, 0.1, 'square', sfxGain, 0.12);
    playNote(659, now + 0.5, 0.2, 'square', sfxGain, 0.15);
    playNote(784, now + 0.75, 0.4, 'square', sfxGain, 0.18);
    playNote(659, now + 1.1, 0.15, 'sine', sfxGain, 0.1);
    playNote(784, now + 1.3, 0.5, 'sine', sfxGain, 0.15);
  }

  // Mid-game leaderboard - special dramatic fanfare
  function halftime() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    // Dramatic build-up
    playNote(392, now, 0.15, 'square', sfxGain, 0.15);
    playNote(440, now + 0.15, 0.15, 'square', sfxGain, 0.15);
    playNote(523, now + 0.3, 0.15, 'square', sfxGain, 0.18);
    playNote(659, now + 0.45, 0.15, 'square', sfxGain, 0.18);
    playNote(784, now + 0.6, 0.3, 'sine', sfxGain, 0.25);
    playNote(1047, now + 0.9, 0.5, 'sine', sfxGain, 0.3);
    // Sparkle
    playNote(1568, now + 1.2, 0.15, 'sine', sfxGain, 0.1);
    playNote(2093, now + 1.35, 0.2, 'sine', sfxGain, 0.08);
  }

  // Victory / podium - celebratory melody
  function victory() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    var notes = [523, 587, 659, 784, 1047, 784, 1047];
    var durations = [0.15, 0.15, 0.15, 0.15, 0.3, 0.15, 0.5];
    var time = now;
    for (var i = 0; i < notes.length; i++) {
      playNote(notes[i], time, durations[i] + 0.05, 'sine', sfxGain, 0.25);
      playNote(notes[i] * 1.5, time, durations[i] + 0.03, 'sine', sfxGain, 0.1);
      time += durations[i];
    }
    // Sparkle cascade
    playNote(2093, time, 0.2, 'sine', sfxGain, 0.08);
    playNote(2349, time + 0.1, 0.2, 'sine', sfxGain, 0.06);
    playNote(2637, time + 0.2, 0.3, 'sine', sfxGain, 0.05);
  }

  // Game start - exciting countdown sound
  function gameStart() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    playNote(440, now, 0.2, 'square', sfxGain, 0.15);
    playNote(554, now + 0.25, 0.2, 'square', sfxGain, 0.15);
    playNote(659, now + 0.5, 0.2, 'square', sfxGain, 0.18);
    playNote(880, now + 0.75, 0.5, 'sine', sfxGain, 0.25);
  }

  /* ---- Background Music (looping) ---- */

  function stopMusic() {
    if (currentMusic) {
      try {
        currentMusic.forEach(function (node) { node.stop(); });
      } catch (e) { /* ignore */ }
      currentMusic = null;
    }
  }

  // Lobby music - upbeat repeating loop
  function lobbyMusic() {
    if (!enabled) return;
    stopMusic();
    var c = getCtx();
    var nodes = [];

    var melody = [
      { f: 523, d: 0.25 }, { f: 659, d: 0.25 }, { f: 784, d: 0.25 }, { f: 659, d: 0.25 },
      { f: 587, d: 0.25 }, { f: 740, d: 0.25 }, { f: 880, d: 0.25 }, { f: 740, d: 0.25 },
      { f: 523, d: 0.25 }, { f: 784, d: 0.25 }, { f: 1047, d: 0.5 },
      { f: 880, d: 0.25 }, { f: 784, d: 0.25 }, { f: 659, d: 0.5 },
    ];

    var bass = [
      { f: 131, d: 1 }, { f: 147, d: 1 }, { f: 131, d: 1 }, { f: 165, d: 1 },
    ];

    var loopDuration = 4; // seconds per loop
    var totalDuration = 120; // max 2 minutes
    var now = c.currentTime;

    for (var loop = 0; loop < totalDuration / loopDuration; loop++) {
      var loopStart = now + loop * loopDuration;

      // Melody
      var melodyTime = loopStart;
      for (var i = 0; i < melody.length; i++) {
        var osc = playNote(melody[i].f, melodyTime, melody[i].d * 0.9, 'sine', musicGain, 0.15);
        nodes.push(osc);
        melodyTime += melody[i].d;
      }

      // Bass
      var bassTime = loopStart;
      for (var j = 0; j < bass.length; j++) {
        var bassOsc = playNote(bass[j].f, bassTime, bass[j].d * 0.9, 'triangle', musicGain, 0.2);
        nodes.push(bassOsc);
        bassTime += bass[j].d;
      }
    }

    currentMusic = nodes;
    return { stop: stopMusic };
  }

  // Countdown/thinking music - ticking tension
  function countdownMusic(seconds) {
    if (!enabled) return { stop: function () {} };
    stopMusic();
    var c = getCtx();
    var nodes = [];
    var now = c.currentTime;

    for (var i = 0; i < seconds; i++) {
      var time = now + i;
      var pitch = 800;
      // Last 5 seconds get higher pitch and faster
      if (i >= seconds - 5) {
        pitch = 800 + (i - (seconds - 5)) * 100;
        // Double tick in last 5 sec
        var osc2 = playNote(pitch, time + 0.5, 0.08, 'sine', musicGain, 0.12);
        nodes.push(osc2);
      }
      // Last 3 seconds - even more urgent
      if (i >= seconds - 3) {
        pitch += 200;
      }
      var osc = playNote(pitch, time, 0.08, 'sine', musicGain, 0.15);
      nodes.push(osc);
    }

    // Background tension drone
    var drone = c.createOscillator();
    var droneGain = c.createGain();
    drone.type = 'sine';
    drone.frequency.value = 110;
    droneGain.gain.setValueAtTime(0.05, now);
    droneGain.gain.linearRampToValueAtTime(0.15, now + seconds);
    drone.connect(droneGain);
    droneGain.connect(musicGain);
    drone.start(now);
    drone.stop(now + seconds);
    nodes.push(drone);

    currentMusic = nodes;
    return { stop: stopMusic };
  }

  /* ---- Toggle ---- */

  function toggle() {
    enabled = !enabled;
    if (!enabled) stopMusic();
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function setEnabled(val) {
    enabled = !!val;
    if (!enabled) stopMusic();
  }

  /* ---- Public API ---- */
  return {
    playerJoined: playerJoined,
    correct: correct,
    wrong: wrong,
    timeUp: timeUp,
    leaderboard: leaderboard,
    halftime: halftime,
    victory: victory,
    gameStart: gameStart,
    lobbyMusic: lobbyMusic,
    countdownMusic: countdownMusic,
    stopMusic: stopMusic,
    toggle: toggle,
    isEnabled: isEnabled,
    setEnabled: setEnabled
  };
})();
