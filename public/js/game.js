const Game2048 = (() => {
  const SIZE = 4;
  const WIN_VALUE = 2048;

  let grid = [];
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('2048-best') || '0', 10);
  let maxTile = 2;
  let won = false;
  let over = false;
  let animating = false;
  let tileIdCounter = 0;
  let tiles = new Map();

  const board = () => document.getElementById('board');
  const tilesLayer = () => document.getElementById('tiles-layer');
  const mergeEffects = () => document.getElementById('merge-effects');

  let cellSize = 0;
  let gap = 10;

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function calcLayout() {
    const b = board();
    if (!b) return;
    const style = getComputedStyle(b);
    gap = parseFloat(style.padding) || 10;
    const inner = b.clientWidth - gap * 2;
    cellSize = (inner - gap * 3) / 4;
  }

  function posPx(r, c) {
    return {
      left: c * (cellSize + gap),
      top: r * (cellSize + gap),
    };
  }

  function tileClass(v) {
    if (v <= 2048) return `tile-${v}`;
    return 'tile-super';
  }

  function fontSize(v) {
    if (v >= 10000) return '0.65rem';
    if (v >= 1000) return '0.85rem';
    if (v >= 100) return '1rem';
    return '';
  }

  function buildGridBg() {
    const bg = document.querySelector('.grid-bg');
    bg.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      bg.appendChild(cell);
    }
  }

  function randomEmptyCell() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) empty.push({ r, c });
      }
    }
    if (!empty.length) return null;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function addRandomTile() {
    const cell = randomEmptyCell();
    if (!cell) return null;
    const value = Math.random() < 0.9 ? 2 : 4;
    const id = ++tileIdCounter;
    const tile = { id, value, r: cell.r, c: cell.c, isNew: true };
    grid[cell.r][cell.c] = tile;
    tiles.set(id, tile);
    return tile;
  }

  function renderTile(tile, animate = true) {
    let el = document.getElementById(`tile-${tile.id}`);
    if (!el) {
      el = document.createElement('div');
      el.id = `tile-${tile.id}`;
      el.className = 'tile';
      tilesLayer().appendChild(el);
    }
    const p = posPx(tile.r, tile.c);
    el.style.width = `${cellSize}px`;
    el.style.height = `${cellSize}px`;
    el.style.left = `${p.left}px`;
    el.style.top = `${p.top}px`;
    el.className = `tile ${tileClass(tile.value)}`;
    if (tile.isNew) el.classList.add('new');
    if (tile.merged) el.classList.add('merged');
    el.textContent = tile.value;
    if (fontSize(tile.value)) el.style.fontSize = fontSize(tile.value);
  }

  function renderAll() {
    calcLayout();
    tilesLayer().innerHTML = '';
    for (const tile of tiles.values()) {
      renderTile(tile);
    }
  }

  function updateStats() {
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best-score');
    const maxEl = document.getElementById('max-tile');
    scoreEl.textContent = score.toLocaleString();
    bestEl.textContent = bestScore.toLocaleString();
    maxEl.textContent = maxTile;
  }

  function bumpScore() {
    document.getElementById('score').classList.remove('bump');
    void document.getElementById('score').offsetWidth;
    document.getElementById('score').classList.add('bump');
  }

  function spawnBurst(r, c, value) {
    const color = GameFX.mergeColor(value);
    const layer = mergeEffects();
    const p = posPx(r, c);
    const cx = p.left + cellSize / 2;
    const cy = p.top + cellSize / 2;
    const count = value >= 128 ? 24 : value >= 32 ? 18 : 12;
    for (let i = 0; i < count; i++) {
      const ptc = document.createElement('div');
      ptc.className = 'merge-burst';
      ptc.style.left = `${cx}px`;
      ptc.style.top = `${cy}px`;
      ptc.style.background = color;
      ptc.style.width = ptc.style.height = `${4 + Math.random() * 6}px`;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 40 + Math.random() * (value >= 64 ? 80 : 50);
      ptc.style.setProperty('--bx', `${Math.cos(angle) * dist}px`);
      ptc.style.setProperty('--by', `${Math.sin(angle) * dist}px`);
      layer.appendChild(ptc);
      setTimeout(() => ptc.remove(), 750);
    }
    GameFX.shockwave(r, c, cellSize, gap, color);
    const boardRect = board().getBoundingClientRect();
    GameFX.burstParticles(boardRect.left + cx, boardRect.top + cy, count, color);
  }

  function floatPoints(r, c, pts) {
    const layer = mergeEffects();
    const p = posPx(r, c);
    const el = document.createElement('div');
    el.className = 'float-score';
    el.textContent = `+${pts}`;
    el.style.left = `${p.left + cellSize / 2}px`;
    el.style.top = `${p.top}px`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  function getLines(dir) {
    const lines = [];
    for (let i = 0; i < SIZE; i++) {
      const line = [];
      for (let j = 0; j < SIZE; j++) {
        let r, c;
        if (dir === 'left') { r = i; c = j; }
        else if (dir === 'right') { r = i; c = SIZE - 1 - j; }
        else if (dir === 'up') { r = j; c = i; }
        else { r = SIZE - 1 - j; c = i; }
        line.push({ r, c });
      }
      lines.push(line);
    }
    return lines;
  }

  function move(dir) {
    if (animating || over) return false;
    calcLayout();

    for (const tile of tiles.values()) tile.merged = false;

    let moved = false;
    let mergeScore = 0;
    const merges = [];
    const toRemove = new Set();

    const newGrid = emptyGrid();

    for (const line of getLines(dir)) {
      const rowTiles = line.map(({ r, c }) => grid[r][c]).filter(Boolean);
      const merged = [];
      for (let i = 0; i < rowTiles.length; i++) {
        if (i + 1 < rowTiles.length && rowTiles[i].value === rowTiles[i + 1].value) {
          const a = rowTiles[i];
          const b = rowTiles[i + 1];
          a.value *= 2;
          a.merged = true;
          merges.push({ tile: a, value: a.value, pts: a.value });
          mergeScore += a.value;
          if (a.value > maxTile) maxTile = a.value;
          toRemove.add(b.id);
          merged.push(a);
          i++;
          moved = true;
        } else {
          merged.push(rowTiles[i]);
        }
      }

      merged.forEach((tile, idx) => {
        const { r, c } = line[idx];
        if (tile.r !== r || tile.c !== c) moved = true;
        tile.r = r;
        tile.c = c;
        newGrid[r][c] = tile;
      });
    }

    toRemove.forEach(id => {
      tiles.delete(id);
      const el = document.getElementById(`tile-${id}`);
      if (el) el.remove();
    });

    grid = newGrid;

    if (!moved) return false;

    animating = true;
    GameAudio.playMove();
    for (const tile of tiles.values()) renderTile(tile);

    setTimeout(() => {
      const combo = merges.length;
      if (combo >= 2) {
        GameAudio.playCombo(combo);
        GameFX.showCombo(combo);
      }

      merges.forEach(m => {
        GameAudio.playMerge(m.value);
        spawnBurst(m.tile.r, m.tile.c, m.value);
        floatPoints(m.tile.r, m.tile.c, m.pts);
        const intensity = m.value >= 256 ? 0.55 : m.value >= 64 ? 0.38 : 0.22;
        GameFX.screenFlash(GameFX.mergeColor(m.value), intensity);
        GameFX.setBoardGlow(maxTile);

        if (m.value >= 32) {
          GameFX.vibrate(m.value >= 128 ? [20, 30, 40] : m.value >= 64 ? [18, 12] : 12);
        }
        if (m.value >= 64) {
          document.getElementById('shake-layer').classList.add('shake-heavy');
          setTimeout(() => document.getElementById('shake-layer').classList.remove('shake-heavy'), 450);
        } else if (m.value >= 16) {
          document.getElementById('shake-layer').classList.add('shake');
          setTimeout(() => document.getElementById('shake-layer').classList.remove('shake'), 350);
        }
      });

      score += mergeScore;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('2048-best', bestScore);
      }
      updateStats();
      if (mergeScore) bumpScore();

      const spawned = addRandomTile();
      if (spawned) {
        GameAudio.playSpawn();
        renderTile(spawned);
      }

      setTimeout(() => {
        for (const t of tiles.values()) { t.isNew = false; t.merged = false; }
        animating = false;

        if (!won && maxTile >= WIN_VALUE) {
          won = true;
          GameAudio.playWin();
          onWin?.();
        }

        if (isGameOver()) {
          over = true;
          GameAudio.playGameOver();
          onGameOver?.({ score, maxTile, won });
        }
      }, 130);
    }, 130);

    return true;
  }

  function isGameOver() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) return false;
        const v = grid[r][c].value;
        if (r + 1 < SIZE && grid[r + 1][c]?.value === v) return false;
        if (c + 1 < SIZE && grid[r][c + 1]?.value === v) return false;
      }
    }
    return true;
  }

  function canMove() {
    if (isGameOver()) return false;
    return true;
  }

  let onGameOver = null;
  let onWin = null;

  function init(callbacks = {}) {
    onGameOver = callbacks.onGameOver;
    onWin = callbacks.onWin;
    grid = emptyGrid();
    tiles.clear();
    score = 0;
    maxTile = 2;
    won = false;
    over = false;
    animating = false;
    tileIdCounter = 0;
    mergeEffects().innerHTML = '';
    buildGridBg();
    calcLayout();
    addRandomTile();
    addRandomTile();
    renderAll();
    updateStats();
    GameFX.setBoardGlow(2);
  }

  function getState() {
    return { score, maxTile, bestScore, over, won };
  }

  return { init, move, getState, canMove, renderAll, SIZE };
})();
