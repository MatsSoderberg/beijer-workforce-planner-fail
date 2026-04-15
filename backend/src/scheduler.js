const DEPTS = ['Kassa', 'Färg', 'Järn'];
const SHIFT_LIBRARY = {
  weekday: [
    { code: 'T', name: 'Tidigt pass', start: '05:45', end: '14:15' },
    { code: 'D', name: 'Dagpass', start: '08:30', end: '17:00' },
    { code: 'K', name: 'Kvällspass', start: '10:30', end: '19:00' }
  ],
  weekend: [{ code: 'H', name: 'Helgpass', start: '08:45', end: '16:15' }]
};

function toDate(s) { return new Date(`${s}T00:00:00`); }
function formatDate(date) { return date.toISOString().slice(0, 10); }
function dayName(date) { return ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'][date.getDay()]; }
function isWeekend(date) { const d = date.getDay(); return d === 0 || d === 6; }
function daterange(from, to) {
  const out = [];
  const end = toDate(to);
  let current = toDate(from);
  while (current <= end) {
    out.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return out;
}
function weekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function employeeHoursPerWeek(emp) { return Math.round((40 * emp.employmentPct / 100) * 10) / 10; }
function isEmployeeOff(employeeName, dateStr, timeOff) {
  return timeOff.some((r) => r.employeeName === employeeName && r.from <= dateStr && r.to >= dateStr);
}

export function generateSchedule(state) {
  const employees = state.employees.filter((e) => e.active);
  const hourTotals = Object.fromEntries(employees.map((e) => [e.name, 0]));
  const lastShiftByEmployee = Object.fromEntries(employees.map((e) => [e.name, null]));
  const daysWorkedInRow = Object.fromEntries(employees.map((e) => [e.name, 0]));
  const schedule = [];
  const dates = daterange(state.period.from, state.period.to);
  const deptIndexes = Object.fromEntries(DEPTS.map((d) => [d, 0]));

  dates.forEach((date) => {
    const dateStr = formatDate(date);
    const weekend = isWeekend(date);
    const staffing = weekend ? state.staffing.weekend : state.staffing.weekday;

    DEPTS.forEach((dept) => {
      const deptEmployees = employees.filter((e) => e.dept === dept);
      if (!deptEmployees.length) return;
      const required = staffing[dept] || 0;
      const shiftPool = weekend ? SHIFT_LIBRARY.weekend : SHIFT_LIBRARY.weekday;

      for (let slot = 0; slot < required; slot += 1) {
        const sorted = [...deptEmployees].sort((a, b) => {
          const aUtil = hourTotals[a.name] / Math.max(employeeHoursPerWeek(a), 1);
          const bUtil = hourTotals[b.name] / Math.max(employeeHoursPerWeek(b), 1);
          return aUtil - bUtil || deptIndexes[dept] % Math.max(deptEmployees.length, 1);
        });

        let chosen = null;
        let chosenShift = null;

        for (const emp of sorted) {
          if (isEmployeeOff(emp.name, dateStr, state.timeOff)) continue;
          if (daysWorkedInRow[emp.name] >= state.rules.maxDaysInRow) continue;
          const allowedShifts = shiftPool.filter((s) => !emp.eveningOnly || s.code === 'K' || s.code === 'H');
          for (const shift of allowedShifts) {
            if (state.rules.avoidEarlyAfterEvening && lastShiftByEmployee[emp.name] === 'K' && shift.code === 'T') continue;
            chosen = emp;
            chosenShift = shift;
            break;
          }
          if (chosen) break;
        }

        if (!chosen) {
          chosen = deptEmployees.find((e) => !isEmployeeOff(e.name, dateStr, state.timeOff)) || deptEmployees[0];
          chosenShift = shiftPool.find((s) => !chosen.eveningOnly || s.code === 'K' || s.code === 'H') || shiftPool[0];
        }

        schedule.push({
          id: `${dateStr}-${dept}-${slot}`,
          date: dateStr,
          day: dayName(date),
          week: weekNumber(date),
          dept,
          shiftCode: chosenShift.code,
          shiftName: chosenShift.name,
          start: chosenShift.start,
          end: chosenShift.end,
          employeeName: chosen.name,
          weekend
        });

        hourTotals[chosen.name] += weekend ? 7.5 : 8.5;
        lastShiftByEmployee[chosen.name] = chosenShift.code;
        daysWorkedInRow[chosen.name] += 1;
        deptIndexes[dept] += 1;
      }
    });

    const scheduledNames = new Set(schedule.filter((s) => s.date === dateStr).map((s) => s.employeeName));
    employees.forEach((e) => {
      if (!scheduledNames.has(e.name)) daysWorkedInRow[e.name] = 0;
    });
  });

  return schedule;
}

export function scheduleSummary(state) {
  const summary = state.employees.map((emp) => ({
    name: emp.name,
    dept: emp.dept,
    employmentPct: emp.employmentPct,
    hours: 0,
    evenings: 0,
    weekends: 0
  }));
  const map = Object.fromEntries(summary.map((x) => [x.name, x]));
  state.schedule.forEach((row) => {
    const item = map[row.employeeName];
    if (!item) return;
    item.hours += row.weekend ? 7.5 : 8.5;
    if (row.shiftCode === 'K') item.evenings += 1;
    if (row.weekend) item.weekends += 1;
  });
  return summary;
}
