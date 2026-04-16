const { getHolidayImpact } = require("./holidays");

function dateKey(date) { return date.toISOString().slice(0, 10); }
function dayName(date) {
  const map = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  return map[date.getDay()];
}
function isWeekend(date) { const d = date.getDay(); return d === 0 || d === 6; }
function dateRange(startStr, endStr) {
  const out = [];
  const cur = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  while (cur <= end) { out.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return out;
}
function isoWeekKey(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(),0,4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const weekNo = 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
}
function getContractHoursPerWeek(employee) {
  return employee.contractHours || (employee.employmentPct ? Math.round(40 * employee.employmentPct) / 100 : 40);
}
function getWeekendInterval(employee) { return employee.department === "Järn" ? 3 : 2; }
function defaultWeights() {
  return { hard: 100000, fixedTimeOff: 1500, preferredOff: 500, preferredWork: 250, fairnessWeekend: 120, fairnessEvening: 80, balanceHours: 80, avoidConsecutiveEvenings: 50 };
}
function buildState(employees, preferences) {
  const prefMap = new Map();
  (preferences || []).forEach(p => prefMap.set(p.employeeId, p));
  const state = {};
  for (const e of employees) {
    state[e.id] = { employee: e, preferences: prefMap.get(e.id) || { employeeId: e.id, preferredOffDays: [], preferredWorkDays: [], fixedTimeOff: [], notes: "" }, assignedHoursByWeek: {}, weekendCount: 0, eveningCount: 0, consecutiveEvenings: 0, workedWeekendWeeks: [] };
  }
  return state;
}
function hasFixedTimeOff(pref, key) { return (pref.fixedTimeOff || []).includes(key); }
function preferredOff(pref, date) { return (pref.preferredOffDays || []).includes(dayName(date)); }
function preferredWork(pref, date) { return (pref.preferredWorkDays || []).includes(dayName(date)); }
function candidateHours(code) { return code === "L" ? 0 : code === "H" ? 7 : 8; }
function violatesEveningOnly(employee, code, date) {
  if (!employee.eveningOnly) return false;
  if (isWeekend(date)) return code !== "L" && code !== "H";
  return code !== "K" && code !== "L";
}
function violatesWeekendInterval(state, employee, code, date) {
  if (!isWeekend(date) || code !== "H") return false;
  const worked = state[employee.id].workedWeekendWeeks || [];
  if (worked.length === 0) return false;
  const thisWeek = isoWeekKey(date);
  const lastWeek = worked[worked.length - 1];
  const [y1,w1] = lastWeek.split("-W").map(Number);
  const [y2,w2] = thisWeek.split("-W").map(Number);
  const diff = (y2 - y1) * 52 + (w2 - w1);
  return diff < getWeekendInterval(employee);
}
function scoreCandidate({ employee, code, date, state, coverage, need, weights }) {
  const pref = state[employee.id].preferences;
  const key = dateKey(date);
  const weekKey = isoWeekKey(date);
  const assignedWeekHours = state[employee.id].assignedHoursByWeek[weekKey] || 0;
  const contractHours = getContractHoursPerWeek(employee);

  if (hasFixedTimeOff(pref, key) && code !== "L") return -weights.hard;
  if (violatesEveningOnly(employee, code, date)) return -weights.hard;
  if (violatesWeekendInterval(state, employee, code, date)) return -weights.hard;

  let score = 0;
  if (code !== "L" && coverage < need) score += 300;
  if (code === "L" && coverage < need) score -= 400;
  if (hasFixedTimeOff(pref, key) && code === "L") score += weights.fixedTimeOff;
  if (preferredOff(pref, date) && code === "L") score += weights.preferredOff;
  if (preferredOff(pref, date) && code !== "L") score -= weights.preferredOff;
  if (preferredWork(pref, date) && code !== "L") score += weights.preferredWork;

  const projected = assignedWeekHours + candidateHours(code);
  score -= Math.abs(contractHours - projected) * (weights.balanceHours / 40);
  if (code === "H") score -= state[employee.id].weekendCount * weights.fairnessWeekend;
  if (code === "K") score -= state[employee.id].eveningCount * weights.fairnessEvening;
  if (code === "K" && state[employee.id].consecutiveEvenings >= 2) score -= weights.avoidConsecutiveEvenings;
  return score;
}
function applyAssignment(state, map, employee, date, code) {
  const key = dateKey(date);
  const weekKey = isoWeekKey(date);
  map[employee.id] = map[employee.id] || {};
  map[employee.id][key] = code;
  const hours = candidateHours(code);
  state[employee.id].assignedHoursByWeek[weekKey] = (state[employee.id].assignedHoursByWeek[weekKey] || 0) + hours;
  if (code === "H") {
    state[employee.id].weekendCount += 1;
    if (!state[employee.id].workedWeekendWeeks.includes(weekKey)) state[employee.id].workedWeekendWeeks.push(weekKey);
  }
  if (code === "K") state[employee.id].eveningCount += 1;
  state[employee.id].consecutiveEvenings = code === "K" ? state[employee.id].consecutiveEvenings + 1 : 0;
}
function determineNeed(date, dept, rules, holidays) {
  const key = dateKey(date);
  const holidayImpact = getHolidayImpact(key, holidays || []);
  const source = isWeekend(date) ? rules.staffingWeekend : rules.staffingWeekday;
  const base = source[dept] || 0;
  return { need: Math.max(1, Math.round(base * holidayImpact.staffingMultiplier)), holidayImpact };
}
function ensureRestRules(state, assignments, allDates) {
  for (const empId of Object.keys(assignments)) {
    const emp = state[empId].employee;
    const map = assignments[empId];
    if (emp.department === "Järn") {
      for (const d of allDates) {
        if (!isWeekend(d) || map[dateKey(d)] !== "H") continue;
        const friday = new Date(d); friday.setDate(d.getDate() - (d.getDay() === 6 ? 1 : 2));
        const monday = new Date(d); monday.setDate(d.getDate() + (d.getDay() === 6 ? 2 : 1));
        map[dateKey(friday)] = "L";
        map[dateKey(monday)] = "L";
      }
    }
    if (["Kassa","Färg"].includes(emp.department)) {
      const weeks = {};
      for (const d of allDates) { const wk = isoWeekKey(d); (weeks[wk] ||= []).push(d); }
      for (const dates of Object.values(weeks)) {
        const workedWeekend = dates.some(d => isWeekend(d) && map[dateKey(d)] === "H");
        if (!workedWeekend) continue;
        const weekdays = dates.filter(d => !isWeekend(d));
        const alreadyOff = weekdays.some(d => map[dateKey(d)] === "L");
        if (!alreadyOff && weekdays[0]) map[dateKey(weekdays[0])] = "L";
      }
    }
  }
}
function buildRows(assignments, employees, dates) {
  return employees.map(e => {
    const row = { employeeId: e.id, employeeName: e.name, department: e.department, assignments: [], totals: { hours: 0 } };
    for (const d of dates) {
      const key = dateKey(d);
      const code = assignments[e.id]?.[key] || "L";
      row.assignments.push({ date: key, code });
      row.totals.hours += candidateHours(code);
    }
    return row;
  });
}
function buildDiagnostics({ employees, state, assignments, dates, holidays }) {
  const diagnostics = { deviations: [], employeeMetrics: [], holidayDays: [], summary: { hardRuleViolations: 0, preferenceConflicts: 0, holidayAdjustedDays: 0, totalEmployees: employees.length } };
  for (const d of dates) {
    const key = dateKey(d);
    const impact = getHolidayImpact(key, holidays || []);
    if (impact.isHoliday) {
      diagnostics.holidayDays.push({ date: key, note: impact.note, staffingMultiplier: impact.staffingMultiplier });
      diagnostics.summary.holidayAdjustedDays += 1;
    }
  }
  for (const e of employees) {
    const pref = state[e.id].preferences;
    const map = assignments[e.id] || {};
    let hours = 0, workedPreferredOff = 0, missedPreferredWork = 0, weekends = 0, evenings = 0;
    for (const d of dates) {
      const key = dateKey(d);
      const code = map[key] || "L";
      hours += candidateHours(code);
      if ((pref.preferredOffDays || []).includes(dayName(d)) && code !== "L") workedPreferredOff += 1;
      if ((pref.preferredWorkDays || []).includes(dayName(d)) && code === "L") missedPreferredWork += 1;
      if (code === "H") weekends += 1;
      if (code === "K") evenings += 1;
      if (hasFixedTimeOff(pref, key) && code !== "L") {
        diagnostics.deviations.push({ severity: "high", type: "fixed_time_off_violation", employeeId: e.id, employeeName: e.name, date: key, message: `${e.name} är schemalagd trots fast ledighet.` });
        diagnostics.summary.hardRuleViolations += 1;
      }
    }
    if (workedPreferredOff > 0) {
      diagnostics.deviations.push({ severity: "medium", type: "preferred_off_conflict", employeeId: e.id, employeeName: e.name, message: `${e.name} fick arbeta på ${workedPreferredOff} önskade lediga dagar.` });
      diagnostics.summary.preferenceConflicts += workedPreferredOff;
    }
    if (missedPreferredWork > 0) {
      diagnostics.deviations.push({ severity: "low", type: "preferred_work_missed", employeeId: e.id, employeeName: e.name, message: `${e.name} fick inte jobba på ${missedPreferredWork} önskade arbetsdagar.` });
    }
    diagnostics.employeeMetrics.push({ employeeId: e.id, employeeName: e.name, department: e.department, contractHoursPerWeek: getContractHoursPerWeek(e), totalHoursInPeriod: hours, weekendCount: weekends, eveningCount: evenings, workedPreferredOff, missedPreferredWork });
  }
  return diagnostics;
}
function generateSchedule({ employees, preferences, startDate, endDate, rules, holidays }) {
  const dates = dateRange(startDate, endDate);
  const state = buildState(employees, preferences);
  const assignments = {};
  const weights = defaultWeights();

  for (const d of dates) {
    const key = dateKey(d);
    const coverage = { "Kassa": 0, "Färg": 0, "Järn": 0 };
    for (const dept of ["Kassa","Färg","Järn"]) {
      const { need } = determineNeed(d, dept, rules, holidays);
      while (coverage[dept] < need) {
        let best = null;
        for (const e of employees.filter(x => x.department === dept)) {
          if (assignments[e.id]?.[key]) continue;
          const allowed = isWeekend(d) ? ["H","L"] : ["T","D","K","L"];
          for (const code of allowed) {
            const score = scoreCandidate({ employee: e, code, date: d, state, coverage: coverage[dept], need, weights });
            if (!best || score > best.score) best = { employee: e, code, score };
          }
        }
        if (!best || best.code === "L") break;
        applyAssignment(state, assignments, best.employee, d, best.code);
        coverage[dept] += 1;
      }
    }
    for (const e of employees) {
      assignments[e.id] = assignments[e.id] || {};
      if (!assignments[e.id][key]) applyAssignment(state, assignments, e, d, "L");
    }
  }

  ensureRestRules(state, assignments, dates);
  const rows = buildRows(assignments, employees, dates);
  const diagnostics = buildDiagnostics({ employees, state, assignments, dates, holidays });

  return { rows, diagnostics, metadata: { startDate, endDate, rulesVersion: "v3", holidaySupport: true, generatedAt: new Date().toISOString() } };
}

module.exports = { generateSchedule };
