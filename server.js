const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3848;
const DATA_DIR = path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const MAX_SCORES = 500;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SCORES_FILE)) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify({ scores: [] }, null, 2));
  }
}

function readScores() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  } catch {
    return { scores: [] };
  }
}

function writeScores(data) {
  ensureDataFile();
  fs.writeFileSync(SCORES_FILE, JSON.stringify(data, null, 2));
}

function getLocalIPs() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ address: net.address, name });
      }
    }
  }
  return ips;
}

function getLanIPs() {
  return getLocalIPs()
    .filter(({ address }) =>
      /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(address)
    )
    .map(({ address }) => address);
}

function getPrimaryIP() {
  const lan = getLanIPs();
  const wifi = lan.find(ip => ip.startsWith('192.168.'));
  return wifi || lan[0] || 'localhost';
}

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, ts: Date.now() });
});

app.get('/api/info', (_req, res) => {
  const lan = getLanIPs();
  const primary = getPrimaryIP();
  res.json({
    port: PORT,
    localIPs: lan,
    primaryIP: primary === 'localhost' ? null : primary,
    url: lan.map(ip => `http://${ip}:${PORT}`),
    primaryUrl: primary !== 'localhost' ? `http://${primary}:${PORT}` : null,
  });
});

app.get('/api/scores', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const data = readScores();
  const sorted = [...data.scores].sort((a, b) => b.score - a.score).slice(0, limit);
  res.json({ scores: sorted, total: data.scores.length });
});

app.post('/api/scores', (req, res) => {
  const { playerName, score, maxTile } = req.body;
  if (typeof score !== 'number' || score < 0 || !Number.isFinite(score)) {
    return res.status(400).json({ error: '无效分数' });
  }
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerName: String(playerName || '匿名玩家').slice(0, 24),
    score: Math.floor(score),
    maxTile: Math.max(2, Math.floor(maxTile || 2)),
    playedAt: new Date().toISOString(),
  };
  const data = readScores();
  data.scores.unshift(entry);
  if (data.scores.length > MAX_SCORES) {
    data.scores = data.scores.slice(0, MAX_SCORES);
  }
  writeScores(data);
  const sorted = [...data.scores].sort((a, b) => b.score - a.score);
  const rank = sorted.findIndex(s => s.id === entry.id) + 1;
  res.json({ entry, rank, total: data.scores.length });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  const lan = getLanIPs();
  const primary = getPrimaryIP();
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║     🎮 2048 极致版 已启动            ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  本机:  http://localhost:${PORT}       ║`);
  if (lan.length) {
    lan.forEach(ip => {
      const mark = ip === primary ? ' ★' : '';
      const line = `  ║  局域网: http://${ip}:${PORT}${mark}`;
      console.log(line.padEnd(41) + '║');
    });
  } else {
    console.log('  ║  局域网: (未检测到 WiFi IP)          ║');
  }
  console.log('  ╠══════════════════════════════════════╣');
  console.log('  ║  手机连不上？以管理员运行:           ║');
  console.log('  ║  scripts\\open-firewall.bat          ║');
  console.log('  ╚══════════════════════════════════════╝\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌ 端口 ${PORT} 已被占用（可能已有实例在运行）`);
    console.error(`     直接访问: http://localhost:${PORT}`);
    console.error(`     或结束占用进程后重试:`);
    console.error(`     netstat -ano | findstr :${PORT}`);
    console.error(`     taskkill /PID <PID> /F\n`);
    process.exit(1);
  }
  throw err;
});
