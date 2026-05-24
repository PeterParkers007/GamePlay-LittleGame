const GameAudio = (() => {
  let ctx = null;
  let enabled = localStorage.getItem('2048-sound') !== 'false';
  let masterGain = null;
  let compressor = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 12;
    compressor.ratio.value = 6;
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.42;
    masterGain.connect(compressor);
    compressor.connect(ctx.destination);
  }

  function resume() {
    init();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playTone(freq, duration, type = 'sine', volume = 0.3, detune = 0, delay = 0) {
    if (!enabled) return;
    resume();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function playBass(freq, duration = 0.18, volume = 0.35, delay = 0) {
    if (!enabled) return;
    resume();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function playNoise(duration, volume = 0.08) {
    if (!enabled) return;
    resume();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start();
  }

  function playMove() {
    playTone(140, 0.05, 'triangle', 0.1);
    playNoise(0.04, 0.04);
  }

  function playMerge(value) {
    const log = Math.log2(value);
    const base = 180 + (log - 1) * 48;
    playTone(base, 0.14, 'sine', 0.32);
    playTone(base * 1.5, 0.1, 'sine', 0.2, 0, 0.035);
    playTone(base * 2, 0.08, 'triangle', 0.12, 0, 0.07);
    if (value >= 64) playBass(base * 0.5, 0.22, 0.28);
    if (value >= 256) {
      playTone(base * 3, 0.2, 'sine', 0.15, 0, 0.1);
      playNoise(0.12, 0.06);
    }
  }

  function playCombo(streak) {
    if (streak < 2) return;
    const base = 440 + streak * 60;
    playTone(base, 0.1, 'square', 0.12);
    playTone(base * 1.25, 0.08, 'sine', 0.1, 0, 0.04);
  }

  function playSpawn() {
    playTone(280, 0.07, 'sine', 0.14);
    playTone(420, 0.06, 'sine', 0.1, 0, 0.04);
    playTone(560, 0.05, 'triangle', 0.06, 0, 0.08);
  }

  function playWin() {
    if (!enabled) return;
    resume();
    [523, 659, 784, 988, 1175].forEach((f, i) => {
      playTone(f, 0.3, 'sine', 0.28, 0, i * 0.1);
      if (i % 2 === 0) playBass(f * 0.5, 0.25, 0.2, i * 0.1);
    });
    setTimeout(() => playNoise(0.3, 0.05), 400);
  }

  function playGameOver() {
    if (!enabled) return;
    resume();
    [370, 330, 294, 247, 196].forEach((f, i) => {
      playTone(f, 0.35, 'triangle', 0.22 - i * 0.03, 0, i * 0.14);
    });
  }

  function playNewRecord() {
    if (!enabled) return;
    resume();
    [660, 880, 1100, 1320].forEach((f, i) => {
      playTone(f, 0.22, 'sine', 0.25, 0, i * 0.09);
      playBass(f * 0.4, 0.2, 0.18, i * 0.09);
    });
  }

  function toggle() {
    enabled = !enabled;
    localStorage.setItem('2048-sound', enabled);
    if (enabled) resume();
    return enabled;
  }

  function isEnabled() { return enabled; }

  return {
    playMove, playMerge, playSpawn, playWin, playGameOver,
    playNewRecord, playCombo, toggle, isEnabled, resume,
  };
})();
