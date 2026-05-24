(() => {
  let playerName = Leaderboard.getPlayerName();
  let gameSubmitted = false;
  let pollTimer = null;

  const playerEl = document.getElementById('player-name');
  const overlay = document.getElementById('overlay');
  const toast = document.getElementById('toast');
  const bootLoader = document.getElementById('boot-loader');
  const bootMsg = document.getElementById('boot-msg');

  function setBootMsg(msg) {
    if (bootMsg) bootMsg.textContent = msg;
  }

  function hideBoot() {
    if (!bootLoader) return;
    bootLoader.style.opacity = '0';
    bootLoader.style.transition = 'opacity 0.4s';
    setTimeout(() => bootLoader.remove(), 400);
  }

  function showToast(msg, duration = 2500) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add('hidden'), duration);
  }

  function updatePlayerDisplay() {
    playerEl.textContent = playerName;
  }

  async function refreshLeaderboard() {
    try {
      const data = await Leaderboard.fetchScores(50);
      Leaderboard.renderList(data.scores, playerName);
    } catch { /* silent on poll */ }
  }

  async function handleGameOver({ score, maxTile, won }) {
    if (gameSubmitted) return;
    gameSubmitted = true;

    const icon = document.getElementById('overlay-icon');
    const title = document.getElementById('overlay-title');
    const scoreEl = document.getElementById('overlay-score');
    const rankEl = document.getElementById('overlay-rank');

    icon.textContent = won ? '🎉' : '💫';
    title.textContent = won ? '你做到了 2048！' : '游戏结束';
    scoreEl.textContent = `${score.toLocaleString()} 分`;

    try {
      const result = await Leaderboard.submitScore(playerName, score, maxTile);
      rankEl.textContent = `排行榜第 ${result.rank} 名 · 共 ${result.total} 局`;
      if (result.rank <= 3) GameAudio.playNewRecord();
      await refreshLeaderboard();
      showToast(`分数已上传！当前排名第 ${result.rank}`);
    } catch {
      rankEl.textContent = '分数上传失败，请检查网络';
    }

    overlay.classList.remove('hidden');
  }

  function startNewGame() {
    gameSubmitted = false;
    overlay.classList.add('hidden');
    GameAudio.resume();
    Game2048.init({ onGameOver: handleGameOver, onWin: () => {} });
  }

  function setupInput() {
    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    };

    document.addEventListener('keydown', (e) => {
      const dir = keyMap[e.key];
      if (!dir) return;
      e.preventDefault();
      GameAudio.resume();
      Game2048.move(dir);
    });

    const board = document.getElementById('board');
    let touchStart = null;

    board.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      GameAudio.resume();
    }, { passive: true });

    board.addEventListener('touchend', (e) => {
      if (!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 24) return;
      const dir = absX > absY ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      Game2048.move(dir);
    }, { passive: true });
  }

  function setupSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    const onIcon = btn.querySelector('.icon-sound-on');
    const offIcon = btn.querySelector('.icon-sound-off');

    function sync() {
      const on = GameAudio.isEnabled();
      onIcon.classList.toggle('hidden', !on);
      offIcon.classList.toggle('hidden', on);
      btn.classList.toggle('muted', !on);
    }
    sync();

    btn.addEventListener('click', () => {
      GameAudio.toggle();
      sync();
      showToast(GameAudio.isEnabled() ? '音效已开启' : '音效已关闭');
    });
  }

  function setupParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let w, h, particles, bursts = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(120, Math.floor(w * h / 12000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        a: Math.random() * 0.5 + 0.15,
        hue: Math.random() * 80 + 220,
      }));
    }

    window._particleBurst = (x, y, count, color) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        bursts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          r: 2 + Math.random() * 3,
          color: color || '#ffd166',
        });
      }
    };

    function draw() {
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        particles.slice(i + 1, i + 4).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${p.hue}, 80%, 70%, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        });

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 72%, ${p.a})`;
        ctx.fill();
      });

      bursts = bursts.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.08;
        b.life -= 0.025;
        if (b.life <= 0) return false;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * b.life, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = b.life;
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
  }

  function setupUI() {
    document.getElementById('new-game-btn').addEventListener('click', startNewGame);
    document.getElementById('overlay-retry').addEventListener('click', startNewGame);
    document.getElementById('overlay-close').addEventListener('click', () => overlay.classList.add('hidden'));

    document.getElementById('rename-btn').addEventListener('click', () => {
      playerName = Leaderboard.rerollName();
      updatePlayerDisplay();
      showToast(`新代号：${playerName}`);
    });

    window.addEventListener('resize', () => Game2048.renderAll());
  }

  async function checkConnection() {
    setBootMsg('正在连接服务器…');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) throw new Error('bad');
      return true;
    } catch {
      clearTimeout(timer);
      setBootMsg('连接超时，请检查 WiFi 与防火墙');
      showToast('无法连接服务器，请确认地址正确且防火墙已放行', 6000);
      return false;
    }
  }

  async function showLanHint() {
    try {
      const info = await fetch('/api/info').then(r => r.json());
      const url = info.primaryUrl || info.url?.[0];
      if (url) showToast(`📱 手机访问: ${url}`, 6000);
    } catch { /* ignore */ }
  }

  async function init() {
    setBootMsg('正在加载游戏…');
    const ok = await checkConnection();
    updatePlayerDisplay();
    setupInput();
    setupSoundToggle();
    setupParticles();
    setupUI();
    startNewGame();
    refreshLeaderboard();
    if (ok) showLanHint();
    hideBoot();

    pollTimer = setInterval(refreshLeaderboard, 15000);

    document.body.addEventListener('click', () => GameAudio.resume(), { once: true });
    document.body.addEventListener('touchstart', () => GameAudio.resume(), { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
