# Floating Pomodoro Timer

A floating, always-on-top Pomodoro timer widget built with Electron, plus a local work-tracking dashboard.

## Features

- **Focus / Break / Custom modes**, each with its own independent timer — switching tabs doesn't pause or reset whatever's running in the background.
- **Real always-on-top pinning**, draggable frameless window, adjustable transparency, and a dark/light theme toggle.
- **Custom accent color picker** in Settings — pick any color and the app derives a matching interface palette from it (the Focus/Break/Custom accent colors stay fixed since they're functional signals).
- **Session logging** — every completed Focus session is recorded (start/end time, duration) to a local JSON file. Only sessions that run to natural completion count; paused, reset, or Break/Custom sessions are never logged.
- **Work Track dashboard** — a local server (auto-started with the app, `http://localhost:4287`, bound to localhost only) shows daily/weekly/monthly stats with charts, KPI tiles (Today / Week-to-date / Month-to-date), full history navigation, a raw session table, and CSV export. Weeks run Monday 8:00am → the following Monday 7:59am. Accessible both from the app's own popout window (the header's bar-chart icon) and from any regular browser tab.
- **WAV alarm sound** on session completion.

## Project layout

```
app/
  main.js              Electron main process (windows, IPC, dashboard server startup)
  preload.js           contextBridge API exposed to the widget
  renderer/            The floating widget UI (HTML/CSS/vanilla JS)
  lib/                 Session data store + date-boundary math (shared by main process and server)
  server/              Express app serving the dashboard + stats API
  dashboard/            Dashboard frontend (served locally, also loaded by the popout window)
project/                Original Claude Design handoff files (reference only, not used at runtime)
```

## Running it

```
cd app
npm install
npm start
```

## Building a Windows package

```
cd app
npm run build:win
```

Produces `app/dist/Floating Pomodoro Timer-1.0.0-win.zip` — a portable build (no installer). Unzip on Windows and run `Floating Pomodoro Timer.exe` directly; no Node.js required there.
