const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_OFFSET_MS = 8 * 60 * 60 * 1000; // weeks start Monday 8:00am

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dayKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseDayKey(key) {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function dayStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayEnd(d) {
  return new Date(dayStart(d).getTime() + DAY_MS);
}

function monthStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthEnd(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

// Weeks run Monday 8:00:00am through the following Monday 7:59:59am.
// Shifting time back by the 8h offset turns "Monday 8am" into "Monday
// midnight" in shifted-time, so a standard Monday-midnight calculation applies.
function pomodoroWeekStart(date) {
  const shifted = new Date(date.getTime() - WEEK_OFFSET_MS);
  const diffToMonday = (shifted.getDay() + 6) % 7; // Mon->0 .. Sun->6
  const mondayMidnightShifted = new Date(
    shifted.getFullYear(),
    shifted.getMonth(),
    shifted.getDate() - diffToMonday
  );
  return new Date(mondayMidnightShifted.getTime() + WEEK_OFFSET_MS);
}

function pomodoroWeekEnd(date) {
  return new Date(pomodoroWeekStart(date).getTime() + 7 * DAY_MS);
}

// 7 equal 24h slices anchored at the week's Monday-8am start, so they tile
// exactly with no partial edge days (distinct from true midnight-midnight days).
function weekDaySlices(weekStartDate) {
  const slices = [];
  for (let i = 0; i < 7; i++) {
    const start = new Date(weekStartDate.getTime() + i * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    slices.push({ start, end, label: dayKey(start) });
  }
  return slices;
}

module.exports = {
  DAY_MS,
  WEEK_OFFSET_MS,
  dayKey,
  monthKey,
  parseDayKey,
  parseMonthKey,
  dayStart,
  dayEnd,
  monthStart,
  monthEnd,
  pomodoroWeekStart,
  pomodoroWeekEnd,
  weekDaySlices,
};
