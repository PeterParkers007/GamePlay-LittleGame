const GameFX = (() => {
  const MERGE_COLORS = {
    4: '#9b87ff', 8: '#7c5cff', 16: '#a855f7', 32: '#ec4899',
    64: '#f97316', 128: '#ffd166', 256: '#fde047', 512: '#ffffff',
    1024: '#c4b5fd', 2048: '#ff6bcb',
  };

  function mergeColor(value) {
    return MERGE_COLORS[value] || '#00ffff';
  }

  function screenFlash(color, intensity = 0.35) {
    const el = document.getElementById('flash-overlay');
    if (!el) return;
    el.style.background = color || 'rgba(124, 92, 255, 0.5)';
    el.style.opacity = String(intensity);
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 120);
  }

  function shockwave(r, c, cellSize, gap, color) {
    const layer = document.getElementById('merge-effects');
    if (!layer) return;
    const left = c * (cellSize + gap) + cellSize / 2;
    const top = r * (cellSize + gap) + cellSize / 2;
    const ring = document.createElement('div');
    ring.className = 'shockwave';
    ring.style.left = `${left}px`;
    ring.style.top = `${top}px`;
    ring.style.borderColor = color || '#ffd166';
    layer.appendChild(ring);
    setTimeout(() => ring.remove(), 700);
  }

  function showCombo(count) {
    const el = document.getElementById('combo-display');
    const num = document.getElementById('combo-count');
    if (!el || count < 2) return;
    num.textContent = count;
    el.classList.remove('hidden');
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(() => el.classList.add('hidden'), 900);
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function setBoardGlow(maxTile) {
    const glow = document.querySelector('.board-glow');
    if (!glow) return;
    const log = Math.min(Math.log2(maxTile), 11);
    const hue = 240 + log * 18;
    const intensity = 0.15 + log * 0.06;
    glow.style.background = `radial-gradient(circle at 50% 50%, hsla(${hue}, 90%, 65%, ${intensity}) 0%, transparent 70%)`;
  }

  function burstParticles(x, y, count, color) {
    if (!window._particleBurst) return;
    window._particleBurst(x, y, count, color);
  }

  return { mergeColor, screenFlash, shockwave, showCombo, vibrate, setBoardGlow, burstParticles };
})();
