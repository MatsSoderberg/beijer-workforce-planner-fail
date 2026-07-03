const DEPTS = ["Kassa", "Färg", "Järn"];

const SHIFT_LIBRARY = {
  weekday: [
    { code: "T", name: "Tidigt pass", start: "05:45", end: "14:15", hours: 8.5 },
    { code: "D", name: "Dagpass", start: "08:30", end: "17:00", hours: 8.5 },
    { code: "K", name: "Kvällspass", start: "10:30", end: "19:00", hours: 8.5 },
  ],
  weekend: [
    { code: "H", name: "Helgpass", start: "08:45", end: "16:15", hours: 7.5 },
  ],
};

function toDate(s) {
  return new Date(`${s}T00:00:00`);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function dayName(date) {
  return ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"][date.getDay()];
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function isSaturday(date) {
  return date.getDay() === 6;
}

function isSunday(date) {
  return date.getDay() === 0;
}

function isFullTime(emp) {
  return (emp.employmentPct ?? 100) >= 100;
}

function daterange(from, to) {
  const out = [];
  const cur = toDate(from);
  const end = toDate(to);

  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return out;
}

function weekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;

  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function employeeWeeklyTarget(emp) {
  return 40 * ((emp.employmentPct ?? 100) / 100);
}

function weekendInterval(rule) {
  return rule === "varannan" ? 2 : 3;
}

function isoWeekKey(date) {
  return `${date.getFullYear()}-${String(weekNumber(date)).padStart(2, "0")}`;
}

function dateAdd(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isEmployeeOff(employeeName, dateStr, timeOff = []) {
  return timeOff.some(
    (r) =>
      r.employeeName === employeeName &&
      r.from <= dateStr &&
      r.to >= dateStr
  );
}

function createScheduleRow({ date, dept, slot, shift, emp, weekend, notes }) {
  return {
    id: `${formatDate(date)}-${dept}-${slot}`,
    date: formatDate(date),
    day: dayName(date),
    week: weekNumber(date),
    dept,
    shiftCode: shift.code,
    shiftName: shift.name,
    start: shift.start,
    end: shift.end,
    employeeName: emp.name,
    weekend,
    notes: notes || null,
  };
}

function canWorkDate({
  emp,
  dateStr,
  assignedToday,
  blockedDates,
  timeOff,
  dayStreak,
  rules,
}) {
  if (assignedToday.has(emp.name)) return false;
  if (blockedDates[emp.name]?.has(dateStr)) return false;
  if (isEmployeeOff(emp.name, dateStr, timeOff)) return false;
  if (dayStreak[emp.name] >= rules.maxDaysInRow) return false;

  return true;
}

function chooseBestEmployee({
  employees,
  dept,
  date,
  dateStr,
  weekKey,
  shiftPool,
  assignedToday,
  blockedDates,
  timeOff,
  dayStreak,
  weeklyHours,
  hourTotals,
  eveningStreak,
  weekendHistory,
  weekendCounts,
  rules,
}) {
  const deptEmployees = employees.filter((e) => e.dept === dept);
  const currentWeekNum = weekNumber(date);

  let best = null;

  for (const emp of deptEmployees) {
    if (
      !canWorkDate({
        emp,
        dateStr,
        assignedToday,
        blockedDates,
        timeOff,
        dayStreak,
        rules,
      })
    ) {
      continue;
    }

    for (const shift of shiftPool) {
      if (emp.eveningOnly && !["K", "H"].includes(shift.code)) continue;
      if (rules.avoidEarlyAfterEvening && lastShiftIsEvening(emp.name, rules) && shift.code === "T") continue;
      if (shift.code === "K" && eveningStreak[emp.name] >= rules.maxEveningsInRow) continue;

      let weekendPenalty = 0;

      if (isWeekend(date)) {
        const minGap = weekendInterval(emp.weekendRule) - 1;
        const previousWeekendWeeks = weekendHistory[emp.name];
        const lastWeekendWeek = previousWeekendWeeks[previousWeekendWeeks.length - 1];

        if (
          typeof lastWeekendWeek === "number" &&
          currentWeekNum - lastWeekendWeek <= minGap
        ) {
          weekendPenalty += 100;
        }

        weekendPenalty += weekendCounts[emp.name] * 8;
      }

      const weekUtil =
        weeklyHours[weekKey][emp.name] / Math.max(employeeWeeklyTarget(emp), 1);

      const totalUtil =
        hourTotals[emp.name] / Math.max(employeeWeeklyTarget(emp), 1);

      const score =
        weekUtil * 35 +
        totalUtil * 10 +
        (shift.code === "K" ? eveningStreak[emp.name] * 12 : 0) +
        weekendPenalty +
        (emp.eveningOnly && shift.code === "H" ? 4 : 0);

      if (!best || score < best.score) {
        best = { emp, shift, score };
      }
    }
  }

  if (best) return best;

  const fallbackEmp =
    deptEmployees.find((e) => !assignedToday.has(e.name)) || deptEmployees[0];

  const fallbackShift =
    shiftPool.find((s) => !fallbackEmp?.eveningOnly || ["K", "H"].includes(s.code)) ||
    shiftPool[0];

  return {
    emp: fallbackEmp,
    shift: fallbackShift,
    score: 999,
  };
}

function lastShiftIsEvening() {
  return false;
}

function addWorkedShift({
  schedule,
  date,
  dept,
  slot,
  emp,
  shift,
  weekend,
  notes,
  assignedToday,
  hourTotals,
  weeklyHours,
  weekKey,
  lastShift,
  dayStreak,
  eveningStreak,
}) {
  schedule.push(
    createScheduleRow({
      date,
      dept,
      slot,
      shift,
      emp,
      weekend,
      notes,
    })
  );

  assignedToday.add(emp.name);
  hourTotals[emp.name] += shift.hours;
  weeklyHours[weekKey][emp.name] += shift.hours;
  lastShift[emp.name] = shift.code;
  dayStreak[emp.name] += 1;
  eveningStreak[emp.name] =
    shift.code === "K" ? eveningStreak[emp.name] + 1 : 0;
}

export function generateSchedule(state) {
  const employees = state.employees.filter((e) => e.active);
  const timeOff = state.timeOff || [];
  const rules = state.rules || {};
  const staffing = state.staffing || {
    weekday: { Kassa: 1, Färg: 1, Järn: 1 },
    weekend: { Kassa: 1, Färg: 1, Järn: 1 },
  };

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

    if (!weeklyHours[weekKey]) weeklyHours[weekKey] = {};
    for (const emp of employees) {
      if (!(emp.name in weeklyHours[weekKey])) {
        weeklyHours[weekKey][emp.name] = 0;
      }
    }

    // Söndag hanteras via lördagens parregel för 100%-personal.
    // Men 82%-personal eller saknade helgpar kan fortfarande fyllas av ordinarie motor.
    const dailyStaffing = weekend ? staffing.weekend : staffing.weekday;
    const shiftPool = weekend ? SHIFT_LIBRARY.weekend : SHIFT_LIBRARY.weekday;

    for (const dept of DEPTS) {
      const required = dailyStaffing[dept] || 0;
      const alreadyAssignedToday = new Set(
        schedule.filter((r) => r.date === dateStr).map((r) => r.employeeName)
      );

      for (let slot = 0; slot < required; slot += 1) {
        const assignedToday = new Set(
          schedule.filter((r) => r.date === dateStr).map((r) => r.employeeName)
        );

        const alreadyDeptSlot = schedule.filter(
          (r) => r.date === dateStr && r.dept === dept
        ).length;

        if (alreadyDeptSlot > slot) continue;

        const best = chooseBestEmployee({
          employees,
          dept,
          date,
          dateStr,
          weekKey,
          shiftPool,
          assignedToday,
          blockedDates,
          timeOff,
          dayStreak,
          weeklyHours,
          hourTotals,
          eveningStreak,
          weekendHistory,
          weekendCounts,
          rules,
        });

        if (!best?.emp || !best?.shift) continue;

        const { emp, shift } = best;

        addWorkedShift({
          schedule,
          date,
          dept,
          slot,
          emp,
          shift,
          weekend,
          notes: weekend ? "Helglogik tillämpad" : null,
          assignedToday,
          hourTotals,
          weeklyHours,
          weekKey,
          lastShift,
          dayStreak,
          eveningStreak,
        });

        // Hard rule: 100%-medarbetare som jobbar lördag ska även jobba söndag.
        if (weekend && isSaturday(date) && isFullTime(emp)) {
          const sundayDate = dateAdd(date, 1);
          const sundayStr = formatDate(sundayDate);
          const sundayWeekKey = isoWeekKey(sundayDate);

          if (!weeklyHours[sundayWeekKey]) weeklyHours[sundayWeekKey] = {};
          if (!(emp.name in weeklyHours[sundayWeekKey])) {
            weeklyHours[sundayWeekKey][emp.name] = 0;
          }

          const sundayAlreadyAssigned = schedule.some(
            (r) =>
              r.date === sundayStr &&
              r.employeeName === emp.name
          );

          const sundayDeptCount = schedule.filter(
            (r) => r.date === sundayStr && r.dept === dept
          ).length;

          const sundayRequired = staffing.weekend?.[dept] || 0;

          if (!sundayAlreadyAssigned && sundayDeptCount < sundayRequired) {
            const sundayAssignedToday = new Set(
              schedule
                .filter((r) => r.date === sundayStr)
                .map((r) => r.employeeName)
            );

            addWorkedShift({
              schedule,
              date: sundayDate,
              dept,
              slot,
              emp,
              shift,
              weekend: true,
              notes: "Helgparregel: lördag och söndag kopplade",
              assignedToday: sundayAssignedToday,
              hourTotals,
              weeklyHours,
              weekKey: sundayWeekKey,
              lastShift,
              dayStreak,
              eveningStreak,
            });
          }
        }

        if (weekend && isSaturday(date)) {
          weekendCounts[emp.name] += 1;
          weekendHistory[emp.name].push(weekNumber(date));

          if (emp.dept === "Järn") {
            blockedDates[emp.name].add(formatDate(dateAdd(date, -1)));
            blockedDates[emp.name].add(formatDate(dateAdd(date, 2)));
          } else {
            blockedDates[emp.name].add(formatDate(dateAdd(date, -4)));
          }
        }
      }
    }

    const scheduledToday = new Set(
      schedule.filter((r) => r.date === dateStr).map((r) => r.employeeName)
    );

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

  const totals = Object.fromEntries(
    employees.map((e) => [
      e.name,
      {
        hours: 0,
        evenings: 0,
        weekends: 0,
      },
    ])
  );

  for (const row of schedule) {
    if (!totals[row.employeeName]) continue;

    totals[row.employeeName].hours += row.weekend ? 7.5 : 8.5;

    if (row.shiftCode === "K") {
      totals[row.employeeName].evenings += 1;
    }

    if (row.weekend && row.day === "Lör") {
      totals[row.employeeName].weekends += 1;
    }
  }

  const empList = employees.map((e) => ({
    name: e.name,
    targetHours: employeeWeeklyTarget(e),
    totalHours: totals[e.name].hours,
    evenings: totals[e.name].evenings,
    weekends: totals[e.name].weekends,
  }));

  const avg = (values) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const stdev = (values) => {
    if (!values.length) return 0;

    const a = avg(values);

    return Math.sqrt(
      values.reduce((sum, val) => sum + (val - a) ** 2, 0) / values.length
    );
  };

  const periodWeeks = Math.ceil((state.period?.weeks || 18) || 18);

  const utilizationDiff = empList.map((x) =>
    Math.abs(x.totalHours - x.targetHours * periodWeeks)
  );

  const eveningDiff = stdev(empList.map((x) => x.evenings));
  const weekendDiff = stdev(empList.map((x) => x.weekends));

  const qualityScore = Math.max(
    0,
    Math.round(100 - avg(utilizationDiff) * 0.15 - eveningDiff * 3 - weekendDiff * 4)
  );

  const deviations = [];

  for (const e of empList) {
    const target = e.targetHours * periodWeeks;

    if (Math.abs(e.totalHours - target) > 16) {
      deviations.push({
        severity: "warning",
        category: "Timmar",
        employeeName: e.name,
        message: `${e.name} avviker ${Math.round(e.totalHours - target)} timmar från mål.`,
      });
    }
  }

  return {
    qualityScore,
    employeeSummary: empList,
    summary: {
      preferenceConflicts: deviations.length,
      brokenPreferences: deviations.length,
      totalWeekends: empList.reduce((s, e) => s + e.weekends, 0),
    },
    deviations,
  };
}
export function scheduleSummary(state) {
  return computeMetrics(state, state.schedule || []);
}
