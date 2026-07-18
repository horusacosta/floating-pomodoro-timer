const path = require('path');
const express = require('express');
const store = require('../lib/store');
const dates = require('../lib/dates');

const PREFERRED_PORT = 4287;

function csvEscape(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function sumDurationSec(sessions) {
  return sessions.reduce((total, s) => total + s.durationSec, 0);
}

function dayStats(date) {
  const start = dates.dayStart(date);
  const end = dates.dayEnd(date);
  const sessions = store.getSessionsInRange(start.getTime(), end.getTime());
  const prev = new Date(start.getTime() - dates.DAY_MS);
  const next = new Date(start.getTime() + dates.DAY_MS);
  return {
    date: dates.dayKey(date),
    rangeFrom: start.toISOString(),
    rangeTo: end.toISOString(),
    totalSec: sumDurationSec(sessions),
    count: sessions.length,
    prev: dates.dayKey(prev),
    next: dates.dayKey(next),
  };
}

function weekStats(anchorDate) {
  const weekStart = dates.pomodoroWeekStart(anchorDate);
  const weekEnd = dates.pomodoroWeekEnd(anchorDate);
  const sessions = store.getSessionsInRange(weekStart.getTime(), weekEnd.getTime());

  const slices = dates.weekDaySlices(weekStart);
  const byDay = slices.map(({ start, end, label }) => {
    const daySessions = sessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    return { date: label, totalSec: sumDurationSec(daySessions), count: daySessions.length };
  });

  const prevAnchor = new Date(weekStart.getTime() - dates.DAY_MS);
  const nextAnchor = new Date(weekEnd.getTime() + dates.DAY_MS);

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    rangeFrom: weekStart.toISOString(),
    rangeTo: weekEnd.toISOString(),
    totalSec: sumDurationSec(sessions),
    count: sessions.length,
    byDay,
    prevAnchor: dates.dayKey(prevAnchor),
    nextAnchor: dates.dayKey(nextAnchor),
  };
}

function monthStats(monthDate) {
  const start = dates.monthStart(monthDate);
  const end = dates.monthEnd(monthDate);
  const sessions = store.getSessionsInRange(start.getTime(), end.getTime());

  const byDay = [];
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + dates.DAY_MS)) {
    const dayStartMs = dates.dayStart(d).getTime();
    const dayEndMs = dates.dayEnd(d).getTime();
    const daySessions = sessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= dayStartMs && t < dayEndMs;
    });
    byDay.push({ date: dates.dayKey(d), totalSec: sumDurationSec(daySessions), count: daySessions.length });
  }

  const prevMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  return {
    month: dates.monthKey(monthDate),
    rangeFrom: start.toISOString(),
    rangeTo: end.toISOString(),
    totalSec: sumDurationSec(sessions),
    count: sessions.length,
    byDay,
    prevMonth: dates.monthKey(prevMonth),
    nextMonth: dates.monthKey(nextMonth),
  };
}

function createApp() {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'dashboard')));

  app.get('/api/sessions', (req, res) => {
    const { from, to } = req.query;
    let sessions = store.getAllSessions();
    if (from) {
      const fromMs = new Date(from).getTime();
      sessions = sessions.filter((s) => new Date(s.startedAt).getTime() >= fromMs);
    }
    if (to) {
      const toMs = new Date(to).getTime();
      sessions = sessions.filter((s) => new Date(s.startedAt).getTime() < toMs);
    }
    res.json(sessions);
  });

  app.get('/api/stats/day', (req, res) => {
    const date = req.query.date ? dates.parseDayKey(req.query.date) : new Date();
    res.json(dayStats(date));
  });

  app.get('/api/stats/week', (req, res) => {
    const anchor = req.query.anchor ? dates.parseDayKey(req.query.anchor) : new Date();
    res.json(weekStats(anchor));
  });

  app.get('/api/stats/month', (req, res) => {
    const month = req.query.month ? dates.parseMonthKey(req.query.month) : new Date();
    res.json(monthStats(month));
  });

  app.get('/api/summary', (req, res) => {
    const now = new Date();
    const today = dayStats(now);

    const weekStart = dates.pomodoroWeekStart(now);
    const weekToDateSessions = store.getSessionsInRange(weekStart.getTime(), now.getTime());

    const monthStart = dates.monthStart(now);
    const monthToDateSessions = store.getSessionsInRange(monthStart.getTime(), now.getTime());

    res.json({
      today: { totalSec: today.totalSec, count: today.count },
      weekToDate: { totalSec: sumDurationSec(weekToDateSessions), count: weekToDateSessions.length },
      monthToDate: { totalSec: sumDurationSec(monthToDateSessions), count: monthToDateSessions.length },
    });
  });

  app.get('/api/export.csv', (req, res) => {
    const sessions = store
      .getAllSessions()
      .slice()
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

    const header = 'start_time,end_time,duration_minutes,date\n';
    const rows = sessions.map((s) =>
      [s.startedAt, s.endedAt, s.durationSec / 60, dates.dayKey(new Date(s.startedAt))]
        .map(csvEscape)
        .join(',')
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pomodoro-sessions-${Date.now()}.csv"`);
    res.send(header + rows.join('\n') + '\n');
  });

  return app;
}

function startServer(preferredPort = PREFERRED_PORT) {
  return new Promise((resolve, reject) => {
    const app = createApp();
    const server = app.listen(preferredPort, '127.0.0.1');
    server.once('listening', () => resolve({ server, port: server.address().port }));
    server.once('error', (err) => {
      if (err.code !== 'EADDRINUSE') {
        reject(err);
        return;
      }
      const fallback = app.listen(0, '127.0.0.1');
      fallback.once('listening', () => resolve({ server: fallback, port: fallback.address().port }));
      fallback.once('error', reject);
    });
  });
}

module.exports = { createApp, startServer };
