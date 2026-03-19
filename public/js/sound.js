/* ============================================================
   QuizBattle – Sound Effects (Web Audio API)
   Cute, warm, game-like sounds – no external files needed
   ============================================================ */
var QuizSound = (function () {
  'use strict';

  var ctx = null;
  var enabled = true;
  var musicGain = null;
  var sfxGain = null;
  var currentMusic = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.25;
      musicGain.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.4;
      sfxGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Rich note with harmonics + soft attack/decay (warm, cute tone)
  function playRichNote(freq, start, duration, dest, volume, opts) {
    var c = getCtx();
    opts = opts || {};
    var attack = opts.attack || 0.02;
    var decay = opts.decay || duration * 0.6;
    var sustain = opts.sustain || 0.6;
    var release = opts.release || duration * 0.3;

    // Fundamental
    var osc1 = c.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    // Soft overtone (octave up, quieter) - adds warmth
    var osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    // Gentle 5th harmonic - adds sparkle
    var osc3 = c.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;

    var g1 = c.createGain();
    var g2 = c.createGain();
    var g3 = c.createGain();

    // ADSR envelope for fundamental
    g1.gain.setValueAtTime(0, start);
    g1.gain.linearRampToValueAtTime(volume, start + attack);
    g1.gain.linearRampToValueAtTime(volume * sustain, start + attack + decay);
    g1.gain.linearRampToValueAtTime(0.001, start + duration);

    // Overtones quieter
    g2.gain.setValueAtTime(0, start);
    g2.gain.linearRampToValueAtTime(volume * 0.2, start + attack);
    g2.gain.linearRampToValueAtTime(0.001, start + duration * 0.7);

    g3.gain.setValueAtTime(0, start);
    g3.gain.linearRampToValueAtTime(volume * 0.07, start + attack);
    g3.gain.linearRampToValueAtTime(0.001, start + duration * 0.4);

    // Optional vibrato for warmth
    if (opts.vibrato) {
      var lfo = c.createOscillator();
      var lfoGain = c.createGain();
      lfo.frequency.value = 5;
      lfoGain.gain.value = freq * 0.008;
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start(start);
      lfo.stop(start + duration);
    }

    osc1.connect(g1); g1.connect(dest || sfxGain);
    osc2.connect(g2); g2.connect(dest || sfxGain);
    osc3.connect(g3); g3.connect(dest || sfxGain);

    osc1.start(start); osc1.stop(start + duration + 0.05);
    osc2.start(start); osc2.stop(start + duration + 0.05);
    osc3.start(start); osc3.stop(start + duration + 0.05);

    return [osc1, osc2, osc3];
  }

  // Simple sparkle/twinkle effect
  function sparkle(start, dest, volume) {
    var c = getCtx();
    var freqs = [2093, 2637, 3136, 2349, 2793];
    for (var i = 0; i < freqs.length; i++) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[i];
      g.gain.setValueAtTime(0, start + i * 0.06);
      g.gain.linearRampToValueAtTime((volume || 0.06) * (1 - i * 0.15), start + i * 0.06 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + i * 0.06 + 0.15);
      osc.connect(g);
      g.connect(dest || sfxGain);
      osc.start(start + i * 0.06);
      osc.stop(start + i * 0.06 + 0.2);
    }
  }

  // Cute "boop" sound
  function boop(freq, start, dest, volume) {
    var c = getCtx();
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.3, start);
    osc.frequency.exponentialRampToValueAtTime(freq, start + 0.08);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(volume || 0.2, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(start);
    osc.stop(start + 0.25);
    return osc;
  }

  /* ---- Sound Effects ---- */

  // Player joined - cute "pop-ding!" like a bubble
  function playerJoined() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    boop(880, now, sfxGain, 0.2);
    playRichNote(1319, now + 0.08, 0.25, sfxGain, 0.18);
    sparkle(now + 0.15, sfxGain, 0.03);
  }

  // Correct answer - happy ascending xylophone chime ✨
  function correct() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    var notes = [
      { f: 659, t: 0, d: 0.18 },    // E5
      { f: 784, t: 0.1, d: 0.18 },   // G5
      { f: 988, t: 0.2, d: 0.18 },   // B5
      { f: 1319, t: 0.3, d: 0.4 },   // E6 (hold)
    ];
    notes.forEach(function (n) {
      playRichNote(n.f, now + n.t, n.d, sfxGain, 0.22);
    });
    sparkle(now + 0.4, sfxGain, 0.05);
  }

  // Wrong answer - cute sad descending "wah-wah" (not harsh)
  function wrong() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    // Descending minor 2nds with vibrato - sounds sad but cute
    playRichNote(494, now, 0.25, sfxGain, 0.15, { vibrato: true });      // B4
    playRichNote(466, now + 0.2, 0.25, sfxGain, 0.13, { vibrato: true }); // Bb4
    playRichNote(440, now + 0.4, 0.35, sfxGain, 0.1, { vibrato: true });  // A4
  }

  // Time's up - cute alarm clock "ding-ding-ding!"
  function timeUp() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    // Three bell rings
    for (var i = 0; i < 3; i++) {
      playRichNote(1047, now + i * 0.15, 0.12, sfxGain, 0.2);
      playRichNote(1568, now + i * 0.15, 0.12, sfxGain, 0.08); // overtone
    }
    // Resolution note
    playRichNote(784, now + 0.5, 0.4, sfxGain, 0.18, { vibrato: true });
  }

  // Leaderboard reveal - cheerful fanfare 🎺
  function leaderboard() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    var melody = [
      { f: 523, t: 0, d: 0.15 },     // C5
      { f: 659, t: 0.12, d: 0.15 },   // E5
      { f: 784, t: 0.24, d: 0.15 },   // G5
      { f: 1047, t: 0.38, d: 0.35 },  // C6 (hold)
      { f: 988, t: 0.65, d: 0.12 },   // B5
      { f: 1047, t: 0.8, d: 0.45 },   // C6 (final)
    ];
    melody.forEach(function (n) {
      playRichNote(n.f, now + n.t, n.d, sfxGain, 0.2);
    });
    sparkle(now + 0.9, sfxGain, 0.04);
  }

  // Mid-game leaderboard - exciting halftime jingle ⭐
  function halftime() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    // Build-up scale
    var buildup = [392, 440, 494, 523, 587, 659, 784, 1047];
    buildup.forEach(function (f, i) {
      playRichNote(f, now + i * 0.08, 0.12, sfxGain, 0.12 + i * 0.012);
    });
    // Big finish chord
    playRichNote(1047, now + 0.7, 0.5, sfxGain, 0.25, { vibrato: true });
    playRichNote(1319, now + 0.7, 0.5, sfxGain, 0.15, { vibrato: true });
    playRichNote(1568, now + 0.7, 0.5, sfxGain, 0.1, { vibrato: true });
    // Sparkle cascade
    sparkle(now + 1.0, sfxGain, 0.06);
    sparkle(now + 1.3, sfxGain, 0.04);
  }

  // Victory / podium - celebration melody 🎉
  function victory() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    // Cheerful melody (like Mario star)
    var melody = [
      { f: 784, t: 0, d: 0.15 },     // G5
      { f: 988, t: 0.12, d: 0.15 },   // B5
      { f: 1175, t: 0.24, d: 0.15 },  // D6
      { f: 1568, t: 0.38, d: 0.12 },  // G6
      { f: 1319, t: 0.5, d: 0.12 },   // E6
      { f: 1568, t: 0.62, d: 0.15 },  // G6
      { f: 2093, t: 0.78, d: 0.55 },  // C7 (big finish)
    ];
    melody.forEach(function (n) {
      playRichNote(n.f, now + n.t, n.d, sfxGain, 0.2);
    });
    // Harmony on the big finish
    playRichNote(1568, now + 0.78, 0.55, sfxGain, 0.12, { vibrato: true });
    playRichNote(1047, now + 0.78, 0.55, sfxGain, 0.08, { vibrato: true });
    // Triple sparkle
    sparkle(now + 1.0, sfxGain, 0.06);
    sparkle(now + 1.2, sfxGain, 0.05);
    sparkle(now + 1.4, sfxGain, 0.04);
  }

  // Game start - exciting "let's go!" jingle
  function gameStart() {
    if (!enabled) return;
    var c = getCtx();
    var now = c.currentTime;
    playRichNote(523, now, 0.15, sfxGain, 0.2);         // C5
    playRichNote(659, now + 0.15, 0.15, sfxGain, 0.2);  // E5
    playRichNote(784, now + 0.3, 0.15, sfxGain, 0.22);  // G5
    playRichNote(1047, now + 0.48, 0.4, sfxGain, 0.25); // C6
    sparkle(now + 0.6, sfxGain, 0.04);
  }

  /* ---- Background Music ---- */

  function stopMusic() {
    if (currentMusic) {
      try {
        currentMusic.forEach(function (node) {
          if (node && node.stop) node.stop();
        });
      } catch (e) { /* ignore */ }
      currentMusic = null;
    }
  }

  // Lobby music - cute bouncy loop (like a music box)
  function lobbyMusic() {
    if (!enabled) return;
    stopMusic();
    var c = getCtx();
    var nodes = [];
    var now = c.currentTime;

    // Pentatonic melody (always sounds happy & cute)
    var melodyPattern = [
      { f: 784, d: 0.3 },   // G5
      { f: 880, d: 0.3 },   // A5
      { f: 1047, d: 0.3 },  // C6
      { f: 880, d: 0.3 },   // A5
      { f: 1175, d: 0.3 },  // D6
      { f: 1047, d: 0.3 },  // C6
      { f: 880, d: 0.3 },   // A5
      { f: 784, d: 0.3 },   // G5
      { f: 659, d: 0.3 },   // E5
      { f: 784, d: 0.3 },   // G5
      { f: 880, d: 0.6 },   // A5 (hold)
      { f: 0, d: 0.3 },     // rest
    ];

    var bassPattern = [
      { f: 196, d: 0.6 },  // G3
      { f: 220, d: 0.6 },  // A3
      { f: 262, d: 0.6 },  // C4
      { f: 196, d: 0.6 },  // G3
      { f: 175, d: 0.6 },  // F3
      { f: 196, d: 0.6 },  // G3
    ];

    var loopDuration = 0;
    melodyPattern.forEach(function (n) { loopDuration += n.d; });

    var totalDuration = 180; // 3 minutes max

    for (var loop = 0; loop < Math.ceil(totalDuration / loopDuration); loop++) {
      var loopStart = now + loop * loopDuration;

      // Melody (music box sound)
      var t = loopStart;
      for (var i = 0; i < melodyPattern.length; i++) {
        if (melodyPattern[i].f > 0) {
          var oscs = playRichNote(melodyPattern[i].f, t, melodyPattern[i].d * 0.85, musicGain, 0.1);
          oscs.forEach(function (o) { nodes.push(o); });
        }
        t += melodyPattern[i].d;
      }

      // Bass (soft pads)
      var bt = loopStart;
      for (var j = 0; j < bassPattern.length; j++) {
        var bassOscs = playRichNote(bassPattern[j].f, bt, bassPattern[j].d * 0.9, musicGain, 0.08, { vibrato: true });
        bassOscs.forEach(function (o) { nodes.push(o); });
        bt += bassPattern[j].d;
      }
    }

    currentMusic = nodes;
    return { stop: stopMusic };
  }

  // Countdown music - playful ticking with rising tension
  function countdownMusic(seconds) {
    if (!enabled) return { stop: function () {} };
    stopMusic();
    var c = getCtx();
    var nodes = [];
    var now = c.currentTime;

    // Cute tick-tock (alternating high-low)
    for (var i = 0; i < seconds; i++) {
      var time = now + i;
      var isEven = i % 2 === 0;
      var basePitch = isEven ? 660 : 550;

      // Raise pitch in last 5 seconds
      if (i >= seconds - 5) {
        basePitch += (i - (seconds - 5)) * 60;
      }
      // Extra urgency in last 3 seconds
      if (i >= seconds - 3) {
        basePitch += 100;
        // Double-tick
        boop(basePitch + 100, time + 0.5, musicGain, 0.08);
      }

      var tickOsc = boop(basePitch, time, musicGain, 0.1);
      nodes.push(tickOsc);
    }

    // Warm background pad (not scary drone)
    var pad = c.createOscillator();
    var padGain = c.createGain();
    pad.type = 'sine';
    pad.frequency.value = 220;
    padGain.gain.setValueAtTime(0.02, now);
    padGain.gain.linearRampToValueAtTime(0.06, now + seconds * 0.7);
    padGain.gain.linearRampToValueAtTime(0.02, now + seconds);
    pad.connect(padGain);
    padGain.connect(musicGain);
    pad.start(now);
    pad.stop(now + seconds + 0.1);
    nodes.push(pad);

    // Add gentle harmony pad
    var pad2 = c.createOscillator();
    var pad2Gain = c.createGain();
    pad2.type = 'sine';
    pad2.frequency.value = 330;
    pad2Gain.gain.setValueAtTime(0.01, now);
    pad2Gain.gain.linearRampToValueAtTime(0.03, now + seconds * 0.7);
    pad2Gain.gain.linearRampToValueAtTime(0.01, now + seconds);
    pad2.connect(pad2Gain);
    pad2Gain.connect(musicGain);
    pad2.start(now);
    pad2.stop(now + seconds + 0.1);
    nodes.push(pad2);

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
