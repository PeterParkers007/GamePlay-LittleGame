const Leaderboard = (() => {
  const ADJECTIVES = ['闪电', '神秘', '无敌', '幸运', '狂暴', '优雅', '幽灵', '炽热', '冰霜', '星辰'];
  const NOUNS = ['狐狸', '猛虎', '飞龙', '猎豹', '凤凰', '黑豹', '苍狼', '神鹰', '麒麟', '游侠'];

  function generateName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    return `${adj}${noun}${num}`;
  }

  function getPlayerName() {
    let name = localStorage.getItem('2048-player');
    if (!name) {
      name = generateName();
      localStorage.setItem('2048-player', name);
    }
    return name;
  }

  function setPlayerName(name) {
    const trimmed = String(name || '').trim().slice(0, 24);
    if (trimmed) {
      localStorage.setItem('2048-player', trimmed);
      return trimmed;
    }
    const newName = generateName();
    localStorage.setItem('2048-player', newName);
    return newName;
  }

  function rerollName() {
    const name = generateName();
    localStorage.setItem('2048-player', name);
    return name;
  }

  async function fetchScores(limit = 50) {
    const res = await fetch(`/api/scores?limit=${limit}`);
    if (!res.ok) throw new Error('加载排行榜失败');
    return res.json();
  }

  async function submitScore(playerName, score, maxTile) {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, score, maxTile }),
    });
    if (!res.ok) throw new Error('提交分数失败');
    return res.json();
  }

  function formatTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function renderList(scores, currentPlayer) {
    const list = document.getElementById('leaderboard-list');
    const count = document.getElementById('lb-count');
    if (!list) return;

    count.textContent = `${scores.length} 条记录`;

    if (!scores.length) {
      list.innerHTML = '<li class="lb-empty">还没有记录，来抢第一！</li>';
      return;
    }

    list.innerHTML = scores.map((s, i) => {
      const rank = i + 1;
      const topClass = rank <= 3 ? `top${rank}` : '';
      const meClass = s.playerName === currentPlayer ? 'me' : '';
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      return `
        <li class="lb-item ${topClass} ${meClass}" data-id="${s.id}">
          <span class="lb-rank">${medal}</span>
          <span class="lb-name" title="${s.playerName}">${s.playerName}</span>
          <span class="lb-meta">
            <span class="lb-score">${s.score.toLocaleString()}</span>
            <span class="lb-tile">${s.maxTile} · ${formatTime(s.playedAt)}</span>
          </span>
        </li>`;
    }).join('');
  }

  return {
    generateName, getPlayerName, setPlayerName, rerollName,
    fetchScores, submitScore, renderList,
  };
})();
