const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let filePath = null;
let data = { version: 1, sessions: [] };

function init(userDataDir) {
  filePath = path.join(userDataDir, 'sessions.json');
  load();
}

function load() {
  if (!fs.existsSync(filePath)) {
    data = { version: 1, sessions: [] };
    writeAtomic(data);
    return;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sessions)) throw new Error('malformed sessions.json');
    data = parsed;
  } catch (err) {
    const backupPath = `${filePath}.corrupt-${Date.now()}.bak`;
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch (copyErr) {
      // best-effort backup only
    }
    data = { version: 1, sessions: [] };
    writeAtomic(data);
  }
}

function writeAtomic(nextData) {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(nextData, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function appendSession({ mode, startedAt, endedAt, durationSec }) {
  if (mode !== 'focus') {
    throw new Error(`refusing to log non-focus session: ${mode}`);
  }
  if (!startedAt || !endedAt || !Number.isFinite(durationSec)) {
    throw new Error('invalid session payload');
  }
  const record = {
    id: crypto.randomUUID(),
    mode,
    startedAt,
    endedAt,
    durationSec,
  };
  data.sessions.push(record);
  writeAtomic(data);
  return record;
}

function getAllSessions() {
  return data.sessions.slice();
}

function getSessionsInRange(startMs, endMsExclusive) {
  return data.sessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    return t >= startMs && t < endMsExclusive;
  });
}

module.exports = {
  init,
  appendSession,
  getAllSessions,
  getSessionsInRange,
};
