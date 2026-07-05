import { filterCandidates } from "../engineV2.js";

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

function dateAdd(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function isSaturday(date) {
  return date.getDay() === 6;
}

function weekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function weekKey(date) {
  return `${date.getFullYear()}-${String(weekNumber(date)).padStart(2, "0")}`;
}

function dayName(date) {
  return ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"][date.getDay()];
}

function dateRange(from, to) {
  const out = [];
  const current = toDate(from);
  const end = toDate(to);

  while (current <= end) {
    out.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return out;
}

function createRow({ date, dept, slot, employee, shift, notes }) {
  return {
    id: `${formatDate(date)}-${dept}-${slot}-${employee.name}`,
    date: formatDate(date),
    day: dayName(date),
    week: weekNumber(date),
    dept,
    shiftCode: shift.code,
    shiftName: shift.name,
    start: shift.start,
    end: shift.end,
    employeeName: employee.name,
    weekend: isWeekend(date),
    notes: notes || null,
  };
}

function createCandidate({ employee, date, shift, schedule, weeklyHours, rules }) {
  const candidate = {
    employee,
    date: formatDate(date),
    weekKey: weekKey(date),
    shift,
    pairedDates: [],
  };

  if (isSaturday(date) && (employee.employmentPct ?? 100) >= 100) {
    candidate.pairedDates.push(formatDate(dateAdd(date, 1)));
  }

  const context = {
    rules,
    schedule,
    weeklyHours,
  };

  return {
    candidate,
    context,
  };
}

function addHours(weeklyHours, employeeName, date, hours) {
  const wk = weekKey(date);

  if (!weeklyHours[wk]) weeklyHours[wk] = {};
  if (!weeklyHours[wk][employeeName]) weeklyHours[wk][employeeName] = 0;

  weeklyHours[wk][employeeName] += hours;
}

function isAlreadyWorking(schedule, employeeName, date) {
  const dateStr = formatDate(date);

  return schedule.some(
    (row) => row.employeeName === employeeName && row.date === dateStr
  );
}

export function generateSimpleScheduleV2(state) {
  const employees = (state.employees || []).filter((e) => e.active);
  const schedule = [];
  const weeklyHours = {};
  const rejectedCandidates = [];
  const unfilledSlots = [];

  const staffing = state.staffing || {
    weekday: { Kassa: 1, Färg: 1, Järn: 1 },
    weekend: { Kassa: 1, Färg: 1, Järn: 1 },
  };

  const rules = {
    ...(state.rules || {}),
    maxWeeklyHours: state.rules?.maxWeeklyHours || 47.5,
  };

  const dates = dateRange(state.period.from, state.period.to);

  for (const date of dates) {
    const weekend = isWeekend(date);
    const shiftPool = weekend ? SHIFT_LIBRARY.weekend : SHIFT_LIBRARY.weekday;
    const staffingForDay = weekend ? staffing.weekend : staffing.weekday;

    for (const dept of DEPTS) {
      const required = staffingForDay?.[dept] || 0;
      const deptEmployees = employees.filter((e) => e.dept === dept);

      for (let slot = 0; slot < required; slot += 1) {
        let assigned = false;

        for (const employee of deptEmployees) {
          if (isAlreadyWorking(schedule, employee.name, date)) continue;

          for (const shift of shiftPool) {
            const { candidate, context } = createCandidate({
              employee,
              date,
              shift,
              schedule,
              weeklyHours,
              rules,
            });

            const result = filterCandidates([candidate], context);

            if (result.acceptedCount === 0) {
              rejectedCandidates.push({
                employeeName: employee.name,
                date: candidate.date,
                dept,
                shiftCode: shift.code,
                issues: result.rejected[0]?.issues || [],
              });

              continue;
            }

            schedule.push(
              createRow({
                date,
                dept,
                slot,
                employee,
                shift,
                notes: "Engine V2",
              })
            );

            addHours(weeklyHours, employee.name, date, shift.hours);

            if (isSaturday(date) && (employee.employmentPct ?? 100) >= 100) {
              const sunday = dateAdd(date, 1);

              if (!isAlreadyWorking(schedule, employee.name, sunday)) {
                schedule.push(
                  createRow({
                    date: sunday,
                    dept,
                    slot,
                    employee,
                    shift,
                    notes: "Engine V2 helgpar",
                  })
                );

                addHours(weeklyHours, employee.name, sunday, shift.hours);
              }
            }

            assigned = true;
            break;
          }

          if (assigned) break;
        }

        if (!assigned) {
          unfilledSlots.push({
            date: formatDate(date),
            dept,
            slot,
            reason: "Ingen kandidat klarade hard constraints",
          });
        }
      }
    }
  }

  const metrics = {
  qualityScore: 80,
  employeeSummary: [],
  summary: {
    preferenceConflicts: 0,
    brokenPreferences: unfilledSlots.length,
    totalWeekends: schedule.filter((r) => r.weekend && r.day === "Lör").length,
  },
  deviations: unfilledSlots.map((slot) => ({
    severity: "warning",
    category: "Bemanning",
    message: `${slot.date} ${slot.dept}: obemannat pass`,
  })),
};

return {
  schedule,
  metrics,
  constraints: {
    hardIssues: rejectedCandidates.flatMap((r) => r.issues || []),
    softIssues: [],
    issues: rejectedCandidates.flatMap((r) => r.issues || []),
    passed: rejectedCandidates.length === 0,
  },
  debug: {
    engine: "v2-simple",
    weeklyHours,
    rejectedCandidates,
    unfilledSlots,
  },
};
}