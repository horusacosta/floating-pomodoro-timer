(function () {
  const state = {
    theme: 'dark',
    mode: 'focus',
    customMinutes: 15,
    sessionCount: 0,
    opacityPercent: 100,
    soundOn: true,
    pinned: false,
    settingsOpen: false,
    timers: {
      focus: { remaining: 25 * 60, running: false },
      break: { remaining: 5 * 60, running: false },
      custom: { remaining: 15 * 60, running: false },
    },
  };

  function durations() {
    return { focus: 25 * 60, break: 5 * 60, custom: state.customMinutes * 60 };
  }

  const alarmAudio = new Audio('assets/notification.wav');

  function beep() {
    if (!state.soundOn) return;
    try {
      alarmAudio.currentTime = 0;
      alarmAudio.play();
    } catch (e) {}
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function accentVarFor(mode) {
    return mode === 'focus' ? '--orange' : mode === 'break' ? '--purple' : '--blue';
  }

  // Elements
  const card = document.getElementById('card');
  const dot = document.getElementById('dot');
  const pinBtn = document.getElementById('pinBtn');
  const themeBtn = document.getElementById('themeBtn');
  const gearBtn = document.getElementById('gearBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const opacityLabel = document.getElementById('opacityLabel');
  const opacitySlider = document.getElementById('opacitySlider');
  const soundBtn = document.getElementById('soundBtn');
  const tabFocus = document.getElementById('tabFocus');
  const tabBreak = document.getElementById('tabBreak');
  const tabCustom = document.getElementById('tabCustom');
  const customControls = document.getElementById('customControls');
  const customMinutes = document.getElementById('customMinutes');
  const decCustom = document.getElementById('decCustom');
  const incCustom = document.getElementById('incCustom');
  const ringProgress = document.getElementById('ringProgress');
  const timeText = document.getElementById('timeText');
  const modeLabel = document.getElementById('modeLabel');
  const dotsEl = document.getElementById('dots');
  const resetBtn = document.getElementById('resetBtn');
  const mainBtn = document.getElementById('mainBtn');
  const mainIcon = document.getElementById('mainIcon');
  const mainBtnLabel = document.getElementById('mainBtnLabel');

  const R = 88;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  ringProgress.setAttribute('stroke-dasharray', CIRCUMFERENCE);

  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'session-dot';
    dotsEl.appendChild(d);
  }

  function render() {
    const s = state;
    const timer = s.timers[s.mode];
    const dur = durations();
    const duration = dur[s.mode];
    const fraction = duration > 0 ? timer.remaining / duration : 0;
    const offset = CIRCUMFERENCE * (1 - fraction);
    const accentVar = accentVarFor(s.mode);
    const accent = getComputedStyle(card).getPropertyValue(accentVar).trim();

    document.documentElement.setAttribute('data-theme', s.theme);
    card.style.setProperty('--accent', accent);
    card.style.setProperty('--opacity', `${s.opacityPercent}%`);

    dot.classList.toggle('running', timer.running);

    pinBtn.classList.toggle('active', s.pinned);
    gearBtn.classList.toggle('active', s.settingsOpen);

    settingsPanel.hidden = !s.settingsOpen;
    opacityLabel.textContent = `${s.opacityPercent}%`;
    opacitySlider.value = s.opacityPercent;
    soundBtn.classList.toggle('on', s.soundOn);

    tabFocus.classList.toggle('active', s.mode === 'focus');
    tabBreak.classList.toggle('active', s.mode === 'break');
    tabCustom.classList.toggle('active', s.mode === 'custom');

    customControls.hidden = s.mode !== 'custom';
    customMinutes.textContent = `${s.customMinutes} min`;

    ringProgress.setAttribute('stroke-dashoffset', offset);
    timeText.textContent = formatTime(timer.remaining);
    modeLabel.textContent = s.mode === 'focus' ? 'Focus' : s.mode === 'break' ? 'Break' : 'Custom';

    const dotEls = dotsEl.children;
    for (let i = 0; i < dotEls.length; i++) {
      dotEls[i].classList.toggle('filled', i < s.sessionCount);
    }

    mainIcon.innerHTML = timer.running
      ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
      : '<path d="M7 4l14 8-14 8V4z"/>';
    mainBtnLabel.textContent = timer.running ? 'Pause' : (timer.remaining === duration ? 'Start' : 'Resume');
  }

  function setState(patch) {
    Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
    render();
  }

  function switchMode(mode) {
    setState({ mode });
  }

  themeBtn.addEventListener('click', () => setState(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })));
  soundBtn.addEventListener('click', () => setState(s => ({ soundOn: !s.soundOn })));
  pinBtn.addEventListener('click', () => setState(s => {
    const pinned = !s.pinned;
    window.electronAPI.togglePin(pinned);
    return { pinned };
  }));
  gearBtn.addEventListener('click', () => setState(s => ({ settingsOpen: !s.settingsOpen })));
  opacitySlider.addEventListener('input', (e) => setState({ opacityPercent: parseInt(e.target.value, 10) }));

  tabFocus.addEventListener('click', () => switchMode('focus'));
  tabBreak.addEventListener('click', () => switchMode('break'));
  tabCustom.addEventListener('click', () => switchMode('custom'));

  incCustom.addEventListener('click', () => setState(s => {
    const m = Math.min(90, s.customMinutes + 5);
    const timers = { ...s.timers, custom: { ...s.timers.custom, remaining: m * 60 } };
    return { customMinutes: m, timers };
  }));
  decCustom.addEventListener('click', () => setState(s => {
    const m = Math.max(5, s.customMinutes - 5);
    const timers = { ...s.timers, custom: { ...s.timers.custom, remaining: m * 60 } };
    return { customMinutes: m, timers };
  }));

  mainBtn.addEventListener('click', () => setState(s => {
    const timers = { ...s.timers, [s.mode]: { ...s.timers[s.mode], running: !s.timers[s.mode].running } };
    return { timers };
  }));
  resetBtn.addEventListener('click', () => setState(s => {
    const timers = { ...s.timers, [s.mode]: { remaining: durations()[s.mode], running: false } };
    return { timers };
  }));

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.electronAPI.showContextMenu();
  });

  setInterval(() => {
    const s = state;
    let sessionCount = s.sessionCount;
    let touched = false;
    const timers = { ...s.timers };
    for (const key of Object.keys(timers)) {
      const t = timers[key];
      if (!t.running) continue;
      touched = true;
      if (t.remaining <= 1) {
        timers[key] = { remaining: 0, running: false };
        beep();
        if (key === 'focus') sessionCount = (sessionCount + 1) % 5;
      } else {
        timers[key] = { ...t, remaining: t.remaining - 1 };
      }
    }
    if (touched) setState({ timers, sessionCount });
  }, 1000);

  // Keep the OS window sized to fit the card's content, like the design's "fit-content" outer.
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      window.electronAPI.resizeWindow(entry.contentRect.height + 40);
    }
  });
  ro.observe(card);

  render();
})();
