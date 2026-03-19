/* ============================================================
   QuizBattle – Sound Effects (Web Audio API)
   Exciting & Cute – thrilling but adorable game sounds
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
      musicGain.gain.value = 0.3;
      musicGain.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.45;
      sfxGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---- Core building blocks ---- */

  // Cute bell tone: triangle + sine harmonics = warm & bright
  function bell(freq, start, duration, dest, vol, opts) {
    var c = getCtx();
    opts = opts || {};
    var d = dest || sfxGain;
    var v = vol || 0.15;

    // Triangle base = warm & round
    var osc1 = c.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    var g1 = c.createGain();
    g1.gain.setValueAtTime(0, start);
    g1.gain.linearRampToValueAtTime(v, start + 0.012);
    g1.gain.setValueAtTime(v, start + duration * 0.15);
    g1.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc1.connect(g1); g1.connect(d);
    osc1.start(start); osc1.stop(start + duration + 0.05);

    // Sine sparkle overtone (octave + 5th)
    var osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 3;
    var g2 = c.createGain();
    g2.gain.setValueAtTime(0, start);
    g2.gain.linearRampToValueAtTime(v * 0.12, start + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, start + duration * 0.35);
    osc2.connect(g2); g2.connect(d);
    osc2.start(start); osc2.stop(start + duration * 0.4);

    // Optional pitch slide (bouncy feel)
    if (opts.slide) {
      osc1.frequency.setValueAtTime(freq * opts.slide, start);
      osc1.frequency.exponentialRampToValueAtTime(freq, start + 0.06);
    }

    // Optional vibrato
    if (opts.vibrato) {
      var lfo = c.createOscillator();
      var lfoG = c.createGain();
      lfo.frequency.value = opts.vibratoSpeed || 5.5;
      lfoG.gain.value = freq * (opts.vibratoDepth || 0.012);
      lfo.connect(lfoG); lfoG.connect(osc1.frequency);
      lfo.start(start); lfo.stop(start + duration);
    }

    return [osc1, osc2];
  }

  // Bouncy pop — pitch drops down like a bubble
  function pop(freq, start, dest, vol) {
    var c = getCtx();
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, start);
    osc.frequency.exponentialRampToValueAtTime(freq, start + 0.07);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol || 0.2, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    osc.connect(g); g.connect(dest || sfxGain);
    osc.start(start); osc.stop(start + 0.22);
    return osc;
  }

  // Twinkle cascade — magical sparkle ✨
  function twinkle(start, dest, vol, count) {
    var c = getCtx();
    var notes = [2637, 3136, 3520, 2794, 3322];
    var n = count || 5;
    for (var i = 0; i < n; i++) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i % notes.length] + Math.random() * 200;
      var t = start + i * 0.05;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime((vol || 0.05) * (1 - i * 0.12), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g); g.connect(dest || sfxGain);
      osc.start(t); osc.stop(t + 0.15);
    }
  }

  // Soft whoosh — rising excitement sweep
  function whoosh(start, dest, vol, duration) {
    var c = getCtx();
    var osc = c.createOscillator();
    var g = c.createGain();
    var dur = duration || 0.3;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, start);
    osc.frequency.exponentialRampToValueAtTime(1800, start + dur);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol || 0.04, start + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(g); g.connect(dest || sfxGain);
    osc.start(start); osc.stop(start + dur + 0.05);

    // Noise-like shimmer
    var osc2 = c.createOscillator();
    var g2 = c.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(4000, start);
    osc2.frequency.exponentialRampToValueAtTime(8000, start + dur);
    g2.gain.setValueAtTime(0, start);
    g2.gain.linearRampToValueAtTime((vol || 0.04) * 0.15, start + dur * 0.6);
    g2.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc2.connect(g2); g2.connect(dest || sfxGain);
    osc2.start(start); osc2.stop(start + dur + 0.05);
  }

  // Chord stab — exciting reveal accent
  function chord(freqs, start, duration, dest, vol) {
    var nodes = [];
    for (var i = 0; i < freqs.length; i++) {
      var n = bell(freqs[i], start, duration, dest, vol * (i === 0 ? 1 : 0.6), { vibrato: true, vibratoSpeed: 4 });
      nodes = nodes.concat(n);
    }
    return nodes;
  }

  /* ============================================================
     Sound Effects
     ============================================================ */

  // Player joined — bouncy "pop-bling!" 🫧
  function playerJoined() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;
    pop(932, now, sfxGain, 0.18);                 // Bb5 bubble pop
    bell(1397, now + 0.08, 0.22, sfxGain, 0.16, { slide: 1.2 }); // F6 bling
    pop(1760, now + 0.18, sfxGain, 0.08);         // tiny sparkle pop
  }

  // Correct answer — excited ascending chime with celebration ✨🎉
  function correct() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;
    // Quick excited run up
    bell(784, now, 0.12, sfxGain, 0.2, { slide: 1.15 });        // G5
    bell(988, now + 0.08, 0.12, sfxGain, 0.22, { slide: 1.1 }); // B5
    bell(1319, now + 0.16, 0.12, sfxGain, 0.24, { slide: 1.1 });// E6
    // Big sparkly finish note
    bell(1568, now + 0.25, 0.45, sfxGain, 0.25, { vibrato: true, vibratoSpeed: 6, vibratoDepth: 0.008 }); // G6
    bell(1175, now + 0.25, 0.4, sfxGain, 0.1);                   // D6 harmony
    // Twinkle shower
    twinkle(now + 0.4, sfxGain, 0.05, 6);
    whoosh(now, sfxGain, 0.02, 0.25);
  }

  // Wrong answer — cute sad slide "wah-womp" (not harsh!) 😢
  function wrong() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;
    // Descending slide — like a cartoon slip
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587, now);        // D5
    osc.frequency.exponentialRampToValueAtTime(370, now + 0.2);  // slide down
    osc.frequency.exponentialRampToValueAtTime(277, now + 0.45); // womp
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.015);
    g.gain.setValueAtTime(0.15, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g); g.connect(sfxGain);
    osc.start(now); osc.stop(now + 0.6);

    // Sad little wobble on the low note
    var osc2 = c.createOscillator();
    var g2 = c.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 220;
    var lfo = c.createOscillator();
    var lfoG = c.createGain();
    lfo.frequency.value = 8;
    lfoG.gain.value = 15;
    lfo.connect(lfoG); lfoG.connect(osc2.frequency);
    g2.gain.setValueAtTime(0, now + 0.25);
    g2.gain.linearRampToValueAtTime(0.08, now + 0.3);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(g2); g2.connect(sfxGain);
    osc2.start(now + 0.25); osc2.stop(now + 0.65);
    lfo.start(now + 0.25); lfo.stop(now + 0.65);
  }

  // Time's up — cute urgent "ding-ding-ding-DONG!" ⏰
  function timeUp() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;
    // Quick triple bell (excited)
    bell(1319, now, 0.1, sfxGain, 0.2, { slide: 1.2 });
    bell(1319, now + 0.12, 0.1, sfxGain, 0.2, { slide: 1.2 });
    bell(1319, now + 0.24, 0.1, sfxGain, 0.22, { slide: 1.2 });
    // Big resolution DONG
    bell(880, now + 0.4, 0.5, sfxGain, 0.22, { vibrato: true });
    bell(1319, now + 0.4, 0.4, sfxGain, 0.1); // harmony
    pop(1760, now + 0.42, sfxGain, 0.06);
  }

  // Leaderboard reveal — dramatic buildup then cheerful fanfare 🏆
  function leaderboard() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;

    // Quick drum-roll build (exciting!)
    var rollNotes = [392, 440, 494, 523, 587, 659];
    for (var i = 0; i < rollNotes.length; i++) {
      pop(rollNotes[i], now + i * 0.06, sfxGain, 0.08 + i * 0.015);
    }

    // Fanfare reveal!
    bell(784, now + 0.4, 0.15, sfxGain, 0.22, { slide: 1.15 });  // G5
    bell(988, now + 0.52, 0.15, sfxGain, 0.22, { slide: 1.1 });   // B5
    bell(1175, now + 0.64, 0.15, sfxGain, 0.24, { slide: 1.1 });  // D6

    // Big triumphant chord
    chord([1568, 1175, 784], now + 0.8, 0.55, sfxGain, 0.18);

    whoosh(now + 0.35, sfxGain, 0.03, 0.2);
    twinkle(now + 1.0, sfxGain, 0.05, 6);
  }

  // Halftime — epic buildup + explosion of excitement ⭐🔥
  function halftime() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;

    // Rising scale buildup (tension!)
    var scale = [330, 392, 440, 494, 523, 587, 659, 784, 880, 988, 1047, 1175];
    for (var i = 0; i < scale.length; i++) {
      var t = now + i * 0.065;
      pop(scale[i], t, sfxGain, 0.06 + i * 0.012);
    }

    // Whoosh up
    whoosh(now + 0.3, sfxGain, 0.04, 0.4);

    // BIG reveal chord
    var revealTime = now + 0.85;
    chord([1319, 1047, 784, 659], revealTime, 0.65, sfxGain, 0.2);

    // Excitement pops
    for (var j = 0; j < 4; j++) {
      pop(1568 + j * 200, revealTime + 0.1 + j * 0.08, sfxGain, 0.08);
    }

    // Double sparkle cascade
    twinkle(revealTime + 0.3, sfxGain, 0.06, 7);
    twinkle(revealTime + 0.6, sfxGain, 0.04, 5);
  }

  // Victory / podium — triumphant celebration 🎉🏅
  function victory() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;

    // Heroic melody
    var melody = [
      { f: 784, t: 0, d: 0.12 },     // G5
      { f: 784, t: 0.1, d: 0.08 },    // G5 (repeat bounce)
      { f: 1175, t: 0.18, d: 0.15 },   // D6
      { f: 1047, t: 0.32, d: 0.08 },   // C6
      { f: 1175, t: 0.4, d: 0.08 },    // D6
      { f: 1568, t: 0.5, d: 0.12 },    // G6
      { f: 1397, t: 0.62, d: 0.08 },   // F6
      { f: 1568, t: 0.72, d: 0.15 },   // G6
      { f: 2093, t: 0.9, d: 0.65 },    // C7 (BIG finish!)
    ];
    melody.forEach(function (n) {
      bell(n.f, now + n.t, n.d, sfxGain, 0.22, { slide: n.d < 0.1 ? 1.12 : 0 });
    });

    // Finish harmony
    bell(1568, now + 0.9, 0.6, sfxGain, 0.12, { vibrato: true });
    bell(1175, now + 0.9, 0.55, sfxGain, 0.08, { vibrato: true });

    // Celebration effects
    whoosh(now + 0.8, sfxGain, 0.03, 0.2);
    twinkle(now + 1.0, sfxGain, 0.06, 7);
    twinkle(now + 1.25, sfxGain, 0.05, 5);
    twinkle(now + 1.5, sfxGain, 0.04, 4);

    // Bonus celebration pops (like fireworks)
    for (var i = 0; i < 6; i++) {
      pop(1200 + Math.random() * 1000, now + 1.1 + i * 0.12, sfxGain, 0.05);
    }
  }

  // Game start — exciting "Let's Go!" jingle 🚀
  function gameStart() {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;

    // Quick exciting buildup
    pop(523, now, sfxGain, 0.15);
    pop(659, now + 0.08, sfxGain, 0.17);
    pop(784, now + 0.16, sfxGain, 0.19);

    // Whoosh!
    whoosh(now + 0.1, sfxGain, 0.03, 0.25);

    // Landing chord — exciting!
    bell(1047, now + 0.3, 0.35, sfxGain, 0.25, { slide: 1.15 }); // C6
    bell(784, now + 0.3, 0.3, sfxGain, 0.12);                     // G5
    bell(1319, now + 0.3, 0.3, sfxGain, 0.1);                     // E6

    twinkle(now + 0.45, sfxGain, 0.04, 4);
  }

  /* ============================================================
     Background Music
     ============================================================ */

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

  // Lobby — dreamy arpeggio + groovy rhythm (exciting & cute, NOT silly) 🎵
  function lobbyMusic() {
    if (!enabled) return;
    stopMusic();
    var c = getCtx();
    var nodes = [];
    var now = c.currentTime;

    // Gentle arpeggio pattern — chord tones flowing up and down (dreamy)
    var arpeggio = [
      { f: 523, d: 0.25 }, { f: 659, d: 0.25 }, { f: 784, d: 0.25 }, { f: 1047, d: 0.25 },
      { f: 784, d: 0.25 }, { f: 659, d: 0.25 },
      { f: 587, d: 0.25 }, { f: 740, d: 0.25 }, { f: 880, d: 0.25 }, { f: 1175, d: 0.25 },
      { f: 880, d: 0.25 }, { f: 740, d: 0.25 },
      { f: 494, d: 0.25 }, { f: 622, d: 0.25 }, { f: 740, d: 0.25 }, { f: 988, d: 0.25 },
      { f: 740, d: 0.25 }, { f: 622, d: 0.25 },
      { f: 440, d: 0.25 }, { f: 554, d: 0.25 }, { f: 659, d: 0.25 }, { f: 880, d: 0.25 },
      { f: 659, d: 0.25 }, { f: 554, d: 0.25 },
    ];

    // Warm bass — steady pulse (groovy, not bouncy)
    var bass = [
      { f: 131, d: 0.5 }, { f: 131, d: 0.5 }, { f: 131, d: 0.5 },
      { f: 147, d: 0.5 }, { f: 147, d: 0.5 }, { f: 147, d: 0.5 },
      { f: 124, d: 0.5 }, { f: 124, d: 0.5 }, { f: 124, d: 0.5 },
      { f: 110, d: 0.5 }, { f: 110, d: 0.5 }, { f: 110, d: 0.5 },
    ];

    // Soft rhythmic taps — gentle groove pulse
    var rhythm = [
      { f: 1200, d: 0.08 }, { f: 0, d: 0.42 },
      { f: 900, d: 0.06 }, { f: 0, d: 0.19 },
      { f: 1200, d: 0.08 }, { f: 0, d: 0.42 },
      { f: 900, d: 0.06 }, { f: 0, d: 0.19 },
      { f: 1200, d: 0.08 }, { f: 0, d: 0.42 },
      { f: 1400, d: 0.06 }, { f: 0, d: 0.19 },
    ];

    var loopLen = 0;
    arpeggio.forEach(function (n) { loopLen += n.d; });
    var totalTime = 180;

    for (var loop = 0; loop < Math.ceil(totalTime / loopLen); loop++) {
      var ls = now + loop * loopLen;

      // Arpeggio melody — gentle bell tones
      var mt = ls;
      for (var i = 0; i < arpeggio.length; i++) {
        if (arpeggio[i].f > 0) {
          var mn = bell(arpeggio[i].f, mt, arpeggio[i].d * 1.2, musicGain, 0.06, { vibrato: true, vibratoSpeed: 4, vibratoDepth: 0.006 });
          mn.forEach(function (o) { nodes.push(o); });
        }
        mt += arpeggio[i].d;
      }

      // Bass — warm triangle tones
      var bt = ls;
      for (var j = 0; j < bass.length; j++) {
        if (bass[j].f > 0) {
          var bn = bell(bass[j].f, bt, bass[j].d * 0.9, musicGain, 0.08, { vibrato: true, vibratoSpeed: 2.5, vibratoDepth: 0.008 });
          bn.forEach(function (o) { nodes.push(o); });
        }
        bt += bass[j].d;
      }

      // Soft rhythm taps — very quiet percussive pops
      var rt = ls;
      for (var k = 0; k < rhythm.length; k++) {
        if (rhythm[k].f > 0) {
          var rn = pop(rhythm[k].f, rt, musicGain, 0.025);
          nodes.push(rn);
        }
        rt += rhythm[k].d;
      }

      // Occasional twinkle sparkle (every 4 loops)
      if (loop % 4 === 0) {
        twinkle(ls + loopLen * 0.5, musicGain, 0.015, 3);
      }
    }

    currentMusic = nodes;
    return { stop: stopMusic };
  }

  // Countdown — exciting ticking with cute tension buildup ⏱️
  function countdownMusic(seconds) {
    if (!enabled) return { stop: function () {} };
    stopMusic();
    var c = getCtx();
    var nodes = [];
    var now = c.currentTime;

    for (var i = 0; i < seconds; i++) {
      var t = now + i;
      var progress = i / seconds; // 0 → 1
      var isEven = i % 2 === 0;

      // Base pitch rises with time (builds tension!)
      var basePitch = isEven ? 660 : 554;
      basePitch += progress * 200; // gradually higher

      // Tick sound (bouncy pop)
      var tickNode = pop(basePitch, t, musicGain, 0.08 + progress * 0.06);
      nodes.push(tickNode);

      // Add offbeat "tock" as urgency increases (last 60%)
      if (progress > 0.4) {
        var tockNode = pop(basePitch * 0.8, t + 0.5, musicGain, 0.04 + progress * 0.04);
        nodes.push(tockNode);
      }

      // Last 5 seconds: double-time with bell accents!
      if (i >= seconds - 5) {
        var urgency = (i - (seconds - 5)) / 5;
        // Fast double tick
        var fastNode = pop(basePitch + 200, t + 0.25, musicGain, 0.06 + urgency * 0.06);
        nodes.push(fastNode);
        var fastNode2 = pop(basePitch + 200, t + 0.75, musicGain, 0.04 + urgency * 0.04);
        nodes.push(fastNode2);

        // Bell accent on each beat
        var bellNodes = bell(basePitch * 2, t, 0.15, musicGain, 0.05 + urgency * 0.05);
        bellNodes.forEach(function (o) { nodes.push(o); });
      }

      // Last 3 seconds: triple-time! (maximum excitement)
      if (i >= seconds - 3) {
        for (var triplet = 1; triplet <= 2; triplet++) {
          var tNode = pop(basePitch + 300 + triplet * 50, t + triplet * 0.33, musicGain, 0.08);
          nodes.push(tNode);
        }
      }
    }

    // Warm underlying pad (cute, not scary)
    var pad = c.createOscillator();
    var padG = c.createGain();
    pad.type = 'triangle';
    pad.frequency.setValueAtTime(220, now);
    pad.frequency.linearRampToValueAtTime(330, now + seconds);
    padG.gain.setValueAtTime(0.02, now);
    padG.gain.linearRampToValueAtTime(0.06, now + seconds * 0.7);
    padG.gain.linearRampToValueAtTime(0.02, now + seconds);
    pad.connect(padG); padG.connect(musicGain);
    pad.start(now); pad.stop(now + seconds + 0.1);
    nodes.push(pad);

    // Harmony pad (brightens as time runs out)
    var pad2 = c.createOscillator();
    var pad2G = c.createGain();
    pad2.type = 'sine';
    pad2.frequency.setValueAtTime(330, now);
    pad2.frequency.linearRampToValueAtTime(440, now + seconds);
    pad2G.gain.setValueAtTime(0.01, now);
    pad2G.gain.linearRampToValueAtTime(0.04, now + seconds * 0.8);
    pad2G.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    pad2.connect(pad2G); pad2G.connect(musicGain);
    pad2.start(now); pad2.stop(now + seconds + 0.1);
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

  function isEnabled() { return enabled; }

  function setEnabled(val) {
    enabled = !!val;
    if (!enabled) stopMusic();
  }

  // Countdown beep — ascending bell tones for 3-2-1-GO! 🔔
  function countdownBeep(count) {
    if (!enabled) return;
    var c = getCtx(); var now = c.currentTime;
    // Higher pitch as count decreases (3=low, 2=mid, 1=high)
    var pitches = { 3: 523, 2: 659, 1: 880 };
    var freq = pitches[count] || 523;
    bell(freq, now, 0.3, sfxGain, 0.2, { slide: 1.1 });
    pop(freq * 1.5, now + 0.05, sfxGain, 0.1);
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
    countdownBeep: countdownBeep,
    stopMusic: stopMusic,
    toggle: toggle,
    isEnabled: isEnabled,
    setEnabled: setEnabled
  };
})();
