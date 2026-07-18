(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const kpiToday = document.getElementById('kpiToday');
  const kpiTodayCount = document.getElementById('kpiTodayCount');
  const kpiWeek = document.getElementById('kpiWeek');
  const kpiWeekCount = document.getElementById('kpiWeekCount');
  const kpiMonth = document.getElementById('kpiMonth');
  const kpiMonthCount = document.getElementById('kpiMonthCount');
  const viewTabs = document.getElementById('viewTabs');
  const tableToggle = document.getElementById('tableToggle');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const navLabel = document.getElementById('navLabel');
  const chartArea = document.getElementById('chartArea');
  const tableArea = document.getElementById('tableArea');
  const sessionsTableBody = document.getElementById('sessionsTableBody');
  const tableEmptyNote = document.getElementById('tableEmptyNote');

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function todayMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const params = new URLSearchParams(location.search);
  const state = {
    view: params.get('view') || 'week',
    anchor: params.get('anchor') || (params.get('view') === 'month' ? todayMonthKey() : todayKey()),
    showTable: false,
  };

  function formatHM(totalSec) {
    const totalMin = Math.round(totalSec / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function formatCount(count) {
    return count === 1 ? '1 session' : `${count} sessions`;
  }

  function formatClockTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function pushUrl() {
    const p = new URLSearchParams();
    p.set('view', state.view);
    p.set('anchor', state.anchor);
    history.replaceState(null, '', `?${p.toString()}`);
  }

  async function loadSummary() {
    const res = await fetch('/api/summary');
    const summary = await res.json();
    kpiToday.textContent = formatHM(summary.today.totalSec);
    kpiTodayCount.textContent = formatCount(summary.today.count);
    kpiWeek.textContent = formatHM(summary.weekToDate.totalSec);
    kpiWeekCount.textContent = formatCount(summary.weekToDate.count);
    kpiMonth.textContent = formatHM(summary.monthToDate.totalSec);
    kpiMonthCount.textContent = formatCount(summary.monthToDate.count);
  }

  function renderBarChart(bars) {
    const width = Math.max(560, bars.length * 60);
    const height = 220;
    const paddingLeft = 40;
    const paddingBottom = 30;
    const paddingTop = 16;
    const plotWidth = width - paddingLeft - 16;
    const plotHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(3600, ...bars.map((b) => b.totalSec));
    const niceMax = Math.ceil(maxVal / 1800) * 1800; // round up to next 30-min

    const barSlot = plotWidth / bars.length;
    const barWidth = Math.min(24, barSlot - 8);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'bar-chart');

    // gridlines at 0%, 50%, 100% of niceMax
    [0, 0.5, 1].forEach((frac) => {
      const y = paddingTop + plotHeight * (1 - frac);
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', paddingLeft);
      line.setAttribute('x2', width - 16);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('class', frac === 0 ? 'baseline' : 'gridline');
      svg.appendChild(line);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', paddingLeft - 8);
      label.setAttribute('y', y + 4);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('class', 'axis-label');
      label.textContent = formatHM(niceMax * frac);
      svg.appendChild(label);
    });

    bars.forEach((b, i) => {
      const barHeight = niceMax > 0 ? (b.totalSec / niceMax) * plotHeight : 0;
      const x = paddingLeft + i * barSlot + (barSlot - barWidth) / 2;
      const y = paddingTop + plotHeight - barHeight;
      const radius = Math.min(4, barHeight);

      const rect = document.createElementNS(SVG_NS, 'path');
      const r = Math.max(0, radius);
      const path = barHeight <= 0
        ? ''
        : `M${x},${y + r} a${r},${r} 0 0 1 ${r},${-r} h${Math.max(0, barWidth - 2 * r)} a${r},${r} 0 0 1 ${r},${r} V${paddingTop + plotHeight} H${x} Z`;
      rect.setAttribute('d', path);
      rect.setAttribute('class', 'bar');

      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = `${b.label}: ${formatHM(b.totalSec)} (${formatCount(b.count)})`;
      rect.appendChild(title);
      svg.appendChild(rect);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', x + barWidth / 2);
      label.setAttribute('y', height - 10);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'bar-label');
      label.textContent = b.label;
      svg.appendChild(label);
    });

    chartArea.innerHTML = '';
    chartArea.appendChild(svg);
  }

  function renderHero(totalSec, count, sub) {
    chartArea.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'hero-figure';
    const value = document.createElement('div');
    value.className = 'hero-value';
    value.textContent = formatHM(totalSec);
    const subEl = document.createElement('div');
    subEl.className = 'hero-sub';
    subEl.textContent = `${formatCount(count)}${sub ? ' • ' + sub : ''}`;
    wrap.appendChild(value);
    wrap.appendChild(subEl);
    chartArea.appendChild(wrap);
  }

  function dayLabel(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }

  let currentRange = null; // {from, to} ISO, for table view

  async function loadView() {
    viewTabs.querySelectorAll('.view-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === state.view);
    });

    if (state.view === 'day') {
      const res = await fetch(`/api/stats/day?date=${state.anchor}`);
      const data = await res.json();
      navLabel.textContent = dayLabel(data.date);
      currentRange = { from: data.rangeFrom, to: data.rangeTo };
      renderHero(data.totalSec, data.count);
      state._prev = data.prev;
      state._next = data.next;
    } else if (state.view === 'week') {
      const res = await fetch(`/api/stats/week?anchor=${state.anchor}`);
      const data = await res.json();
      const startLabel = new Date(data.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endLabel = new Date(new Date(data.weekEnd).getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      navLabel.textContent = `${startLabel} – ${endLabel}`;
      currentRange = { from: data.rangeFrom, to: data.rangeTo };
      renderBarChart(data.byDay.map((d) => ({ label: dayLabel(d.date), totalSec: d.totalSec, count: d.count })));
      state._prev = data.prevAnchor;
      state._next = data.nextAnchor;
    } else {
      const res = await fetch(`/api/stats/month?month=${state.anchor}`);
      const data = await res.json();
      const [y, m] = data.month.split('-').map(Number);
      navLabel.textContent = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      currentRange = { from: data.rangeFrom, to: data.rangeTo };
      renderBarChart(data.byDay.map((d) => ({ label: String(Number(d.date.split('-')[2])), totalSec: d.totalSec, count: d.count })));
      state._prev = data.prevMonth;
      state._next = data.nextMonth;
    }

    pushUrl();
    if (state.showTable) await loadTable();
  }

  async function loadTable() {
    if (!currentRange) return;
    const res = await fetch(`/api/sessions?from=${encodeURIComponent(currentRange.from)}&to=${encodeURIComponent(currentRange.to)}`);
    const sessions = await res.json();
    sessions.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

    sessionsTableBody.innerHTML = '';
    tableEmptyNote.hidden = sessions.length > 0;

    sessions.forEach((s) => {
      const tr = document.createElement('tr');
      const dateCell = document.createElement('td');
      dateCell.textContent = s.startedAt.slice(0, 10);
      const startCell = document.createElement('td');
      startCell.textContent = formatClockTime(s.startedAt);
      const endCell = document.createElement('td');
      endCell.textContent = formatClockTime(s.endedAt);
      const durCell = document.createElement('td');
      durCell.textContent = formatHM(s.durationSec);
      tr.appendChild(dateCell);
      tr.appendChild(startCell);
      tr.appendChild(endCell);
      tr.appendChild(durCell);
      sessionsTableBody.appendChild(tr);
    });
  }

  viewTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-tab');
    if (!btn) return;
    const nextView = btn.dataset.view;
    if (nextView === state.view) return;
    if (nextView === 'month' && state.view !== 'month') {
      state.anchor = todayMonthKey();
    } else if (nextView !== 'month' && state.view === 'month') {
      state.anchor = todayKey();
    }
    state.view = nextView;
    loadView();
  });

  prevBtn.addEventListener('click', () => {
    state.anchor = state._prev;
    loadView();
  });
  nextBtn.addEventListener('click', () => {
    state.anchor = state._next;
    loadView();
  });

  tableToggle.addEventListener('click', () => {
    state.showTable = !state.showTable;
    tableToggle.textContent = state.showTable ? 'Show chart' : 'Show table';
    chartArea.parentElement.hidden = state.showTable;
    tableArea.hidden = !state.showTable;
    if (state.showTable) loadTable();
  });

  loadSummary();
  loadView();
})();
