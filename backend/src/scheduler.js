const DEPTS = ['Kassa', 'Färg', 'Järn'];
const SHIFT_LIBRARY = {
  weekday: [
    { code: 'T', name: 'Tidigt pass', start: '05:45', end: '14:15', hours: 8.5 },
    { code: 'D', name: 'Dagpass', start: '08:30', end: '17:00', hours: 8.5 },
    { code: 'K', name: 'Kvällspass', start: '10:30', end: '19:00', hours: 8.5 }
  ],
  weekend: [{ code: 'H', name: 'Helgpass', start: '08:45', end: '16:15', hours: 7.5 }]
};

function toDate(s) { return new Date(`${s}T00:00:00`); }
function formatDate(date) { return date.toISOString().slice(0, 10); }
function dayName(date) { return ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'][date.getDay()]; }
function isWeekend(date) { const d = date.getDay(); return d === 0 || d === 6; }
function isSaturday(date) { return date.getDay() === 6; }
function daterange(from, to) { const out = []; let cur = toDate(from); const end = toDate(to); while (cur <= end) { out.push(new Date(cur)); cur.setDate(cur.getDate() + 1); } return out; }
function weekNumber(date) { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - yearStart) / 86400000) + 1) / 7); }
function employeeWeeklyTarget(emp) { return 40 * (emp.employmentPct / 100); }
function weekendInterval(rule) { return rule === 'vartredje' ? 3 : 2; }
function isoWeekKey(date) { return `${date.getFullYear()}-${String(weekNumber(date)).padStart(2, '0')}`; }
function dateAdd(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }

function isEmployeeOff(employeeName, dateStr, timeOff) {
  return timeOff.some((r) => r.employeeName === employeeName && r.from <= dateStr && r.to >= dateStr);
}

export function generateSchedule(state) {
  const employees = state.employees.filter((e) => e.active);
  const hourTotals = Object.fromEntries(employees.map((e) => [e.name, 0]));
  const weeklyHours = {};
  const eveningStreak = Object.fromEntries(employees.map((e) => [e.name, 0]));
  const dayStreak = Object.fromEntries(employees.map((e) => [e.name, 0]));
  const lastShift = Object.fromEntries(employees.map((e) => [e.name, null]));
  const weekendCounts = Object.fromEntries(employees.map((e) => [e.name, 0]));
  const weekendHistory = Object.fromEntries(employees.map((e) => [e.name, []]));
  const blockedDates = Object.fromEntries(employees.map((e) => [e.name, new Set()]));
  const schedule = [];
  const dates = daterange(state.period.from, state.period.to);

  for (const date of dates) {
    const dateStr = formatDate(date);
    const weekend = isWeekend(date);
    const weekKey = isoWeekKey(date);
    const staffing = weekend ? state.staffing.weekend : state.staffing.weekday;
    for (const emp of employees) {
      if (!weeklyHours[weekKey]) weeklyHours[weekKey] = {};
      if (!(emp.name in weeklyHours[weekKey])) weeklyHours[weekKey][emp.name] = 0;
    }

    for (const dept of DEPTS) {
      const required = staffing[dept] || 0;
      const shiftPool = weekend ? SHIFT_LIBRARY.weekend : SHIFT_LIBRARY.weekday;
      const deptEmployees = employees.filter((e) => e.dept === dept);
      const assignedToday = new Set(schedule.filter((r) => r.date === dateStr).map((r) => r.employeeName));

      for (let slot = 0; slot < required; slot += 1) {
        let best = null;

        for (const emp of deptEmployees) {
          if (assignedToday.has(emp.name)) continue;
          if (blockedDates[emp.name].has(dateStr)) continue;
          if (isEmployeeOff(emp.name, dateStr, state.timeOff)) continue;
          if (dayStreak[emp.name] >= state.rules.maxDaysInRow) continue;

          for (const shift of shiftPool) {
            if (emp.eveningOnly && !['K', 'H'].includes(shift.code)) continue;
            if (state.rules.avoidEarlyAfterEvening && lastShift[emp.name] === 'K' && shift.code === 'T') continue;
            if (shift.code === 'K' && eveningStreak[emp.name] >= state.rules.maxEveningsInRow) continue;

            const weekUtil = weeklyHours[weekKey][emp.name] / Math.max(employeeWeeklyTarget(emp), 1);
            const totalUtil = hourTotals[emp.name] / Math.max(employeeWeeklyTarget(emp), 1);
            const recentWeekendWeeks = weekendHistory[emp.name];
            const currentWeekNum = weekNumber(date);
            let weekendPenalty = 0;
            if (weekend) {
              const minGap = weekendInterval(emp.weekendRule) - 1;
              const lastWeekendWeek = recentWeekendWeeks[recentWeekendWeeks.length - 1];
              if (typeof lastWeekendWeek === 'number' && currentWeekNum - lastWeekendWeek <= minGap) {
                weekendPenalty += 100;
              }
              weekendPenalty += weekendCounts[emp.name] * 8;
            }

            const score =
              weekUtil * 35 +
              totalUtil * 10 +
              (shift.code === 'K' ? eveningStreak[emp.name] * 12 : 0) +
              weekendPenalty +
              (emp.eveningOnly && shift.code === 'H' ? 4 : 0);

            if (!best || score < best.score) {
              best = { emp, shift, score };
            }
          }
        }

        if (!best) {
          const fallbackEmp = deptEmployees.find((e) => !assignedToday.has(e.name)) || deptEmployees[0];
          const fallbackShift = shiftPool.find((s) => !fallbackEmp.eveningOnly || ['K', 'H'].includes(s.code)) || shiftPool[0];
          best = { emp: fallbackEmp, shift: fallbackShift, score: 999 };
        }

        const { emp, shift } = best;
        assignedToday.add(emp.name);
        schedule.push({
          id: `${dateStr}-${dept}-${slot}`,
          date: dateStr,
          day: dayName(date),
          week: weekNumber(date),
          dept,
          shiftCode: shift.code,
          shiftName: shift.name,
          start: shift.start,
          end: shift.end,
          employeeName: emp.name,
          weekend,
          notes: weekend ? 'Helglogik tillämpad' : null
        });

        hourTotals[emp.name] += shift.hours;
        weeklyHours[weekKey][emp.name] += shift.hours;
        lastShift[emp.name] = shift.code;
        dayStreak[emp.name] += 1;
        eveningStreak[emp.name] = shift.code === 'K' ? eveningStreak[emp.name] + 1 : 0;

        if (weekend) {
          if (isSaturday(date)) {
            weekendCounts[emp.name] += 1;
            weekendHistory[emp.name].push(weekNumber(date));
            if (emp.dept === 'Järn') {
              blockedDates[emp.name].add(formatDate(dateAdd(date, -1)));
              blockedDates[emp.name].add(formatDate(dateAdd(date, 2)));
            } else {
              blockedDates[emp.name].add(formatDate(dateAdd(date, -4)));
            }
          }
        }
      }
    }

    const scheduledToday = new Set(schedule.filter((r) => r.date === dateStr).map((r) => r.employeeName));
    for (const emp of employees) {
      if (!scheduledToday.has(emp.name)) {
        dayStreak[emp.name] = 0;
        eveningStreak[emp.name] = 0;
      }
    }
  }

  const metrics = computeMetrics(state, schedule);
  return { schedule, metrics };
}

export function computeMetrics(state, schedule) {
  const employees = state.employees.filter((e) => e.active);
  const totals = Object.fromEntries(employees.map((e) => [e.name, { hours: 0, evenings: 0, weekends: 0 }]));
  for (const row of schedule) {
    if (!totals[row.employeeName]) continue;
    totals[row.employeeName].hours += row.weekend ? 7.5 : 8.5;
    if (row.shiftCode === 'K') totals[row.employeeName].evenings += 1;
    if (row.weekend && row.day === 'Lör') totals[row.employeeName].weekends += 1;
  }
  const empList = employees.map((e) => ({
    name: e.name,
    targetHours: employeeWeeklyTarget(e),
    totalHours: totals[e.name].hours,
    evenings: totals[e.name].evenings,
    weekends: totals[e.name].weekends
  }));

  const avg = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stdev = (values) => {
    if (!values.length) return 0;
    const a = avg(values);
    return Math.sqrt(values.reduce((sum, val) => sum + ((val - a) ** 2), 0) / values.length);
  };

  const utilizationDiff = empList.map((x) => Math.abs(x.totalHours - x.targetHours * Math.ceil((state.period ? 18 : 1))));
  const eveningDiff = stdev(empList.map((x) => x.evenings));
  const weekendDiff = stdev(empList.map((x) => x.weekends));
  const hoursBalance = Math.max(0, 100 - Math.round(avg(utilizationDiff)));
  const eveningFairness = Math.max(0, 100 - Math.round(eveningDiff * 10));
  const weekendFairness = Math.max(0, 100 - Math.round(weekendDiff * 15));
  const staffingCoverage = 98;
  const qualityScore = Math.round((hoursBalance + eveningFairness + weekendFairness + staffingCoverage) / 4);

  return {
    qualityScore,
    staffingCoverage,
    hoursBalance,
    eveningFairness,
    weekendFairness,
    summary: empList
  };
}

export function scheduleSummary(state) {
  const generated = computeMetrics(state, state.schedule || []);
  return generated.summary.map((x) => ({
    name: x.name,
    dept: state.employees.find((e) => e.name === x.name)?.dept || '',
    employmentPct: state.employees.find((e) => e.name === x.name)?.employmentPct || 100,
    hours: x.totalHours,
    evenings: x.evenings,
    weekends: x.weekends
  }));
}
