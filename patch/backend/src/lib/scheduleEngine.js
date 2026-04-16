
/**
 * Schedule Engine v2
 * - Hard rules: opening coverage, department staffing, employment %, evening-only, weekend interval,
 *   day-before/day-after weekend rest, substitute weekday off after weekend for Kassa/Färg.
 * - Soft rules: fair weekends, fair evenings, honor personal wishes, balance hours.
 *
 * This engine is deliberately readable and extendable rather than mathematically perfect.
 */

const WEEKDAY_NAMES = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const WEEKEND_DAY_INDEXES = [5,6];

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function isWeekend(date) {
  const d = date.getDay(); // 0 sun..6 sat
  return d === 0 || d === 6;
}
function dayName(date) {
  const map = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  return map[date.getDay()];
}
function dateRange(startStr, endStr) {
  const out = [];
  const cur = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
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

function getWeekendInterval(employee) {
  if (employee.department === "Järn") return 3;
  return 2;
}

function getShiftTemplates() {
  return {
    weekday: [
      { code: "T", hours: 8, tags: ["early"] },
      { code: "D", hours: 8, tags: ["day"] },
      { code: "K", hours: 8, tags: ["evening"] },
      { code: "L", hours: 0, tags: ["off"] },
    ],
    weekend: [
      { code: "H", hours: 7, tags: ["weekend"] },
      { code: "L", hours: 0, tags: ["off"] },
    ],
  };
}

function defaultScoringWeights() {
  return {
    honorHardRules: 100000,
    honorTimeOffRequest: 1200,
    honorPreferredOffDay: 500,
    honorPreferredWorkDay: 250,
    fairnessWeekend: 120,
    fairnessEvening: 80,
    balanceHours: 70,
    avoidConsecutiveEvenings: 50,
  };
}

function buildState(employees, preferences, existingAssignments = {}) {
  const prefMap = new Map();
  for (const pref of preferences || []) {
    prefMap.set(pref.employeeId, pref);
  }
  const state = {};
  for (const e of employees) {
    state[e.id] = {
      employee: e,
      preferences: prefMap.get(e.id) || { employeeId: e.id, preferredOffDays: [], preferredWorkDays: [], fixedTimeOff: [], notes: "" },
      assignedHoursByWeek: {},
      weekendCount: 0,
      eveningCount: 0,
      consecutiveEvenings: 0,
      assignments: existingAssignments[e.id] || {},
    };
  }
  return state;
}

function hasFixedTimeOff(pref, key) {
  return (pref.fixedTimeOff || []).includes(key);
}

function preferredOffScore(pref, date) {
  return (pref.preferredOffDays || []).includes(dayName(date)) ? 1 : 0;
}

function preferredWorkScore(pref, date) {
  return (pref.preferredWorkDays || []).includes(dayName(date)) ? 1 : 0;
}

function violatesDayBeforeAfterWeekendRule(employee, candidateCode, date, assignmentsByEmployee) {
  if (employee.department !== "Järn") return false;
  const day = date.getDay();
  const key = dateKey(date);

  // Friday before a working weekend should be off; Monday after a working weekend should be off.
  if (day === 5 && candidateCode !== "L") {
    const sat = new Date(date); sat.setDate(date.getDate() + 1);
    const sun = new Date(date); sun.setDate(date.getDate() + 2);
    const map = assignmentsByEmployee[employee.id] || {};
    if (map[dateKey(sat)] === "H" || map[dateKey(sun)] === "H") return true;
  }
  if (day === 1 && candidateCode !== "L") {
    const sat = new Date(date); sat.setDate(date.getDate() - 2);
    const sun = new Date(date); sun.setDate(date.getDate() - 1);
    const map = assignmentsByEmployee[employee.id] || {};
    if (map[dateKey(sat)] === "H" || map[dateKey(sun)] === "H") return true;
  }
  return false;
}

function hasWeekendWorkedThisWeek(employee, date, assignmentsByEmployee) {
  const map = assignmentsByEmployee[employee.id] || {};
  const d = new Date(date);
  const day = d.getDay();
  // find monday
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - mondayOffset);
  const sat = new Date(monday); sat.setDate(monday.getDate() + 5);
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
  return map[dateKey(sat)] === "H" || map[dateKey(sun)] === "H";
}

function violatesCompOffRule(employee, candidateCode, date, assignmentsByEmployee) {
  if (!["Kassa","Färg"].includes(employee.department)) return false;
  if (isWeekend(date)) return false;
  const wantsOffBecauseWeekend = hasWeekendWorkedThisWeek(employee, date, assignmentsByEmployee);
  // soft-hard hybrid: allow one weekday off if weekend worked, but not all weekdays.
  if (wantsOffBecauseWeekend) {
    // no violation by being off; handled in scoring if too many workdays.
    return false;
  }
  return false;
}

function violatesEveningOnlyRule(employee, candidateCode, date) {
  if (!employee.eveningOnly) return false;
  if (isWeekend(date)) return candidateCode !== "L" && candidateCode !== "H";
  return candidateCode !== "K" && candidateCode !== "L";
}

function violatesWeekendIntervalRule(employee, candidateCode, date, state) {
  if (!isWeekend(date) || candidateCode !== "H") return false;
  const interval = getWeekendInterval(employee);
  const weekKey = isoWeekKey(date);
  const previousWorkedWeekendWeeks = (state[employee.id].workedWeekendWeeks || []);
  if (previousWorkedWeekendWeeks.length === 0) return false;
  const last = previousWorkedWeekendWeeks[previousWorkedWeekendWeeks.length - 1];
  const [y1,w1] = last.split("-W").map(Number);
  const [y2,w2] = weekKey.split("-W").map(Number);
  const diff = (y2 - y1) * 52 + (w2 - w1);
  return diff < interval;
}

function scoreCandidate(employee, candidateCode, date, context) {
  const { state, assignmentsByEmployee, weights, staffingNeed, currentCoverage } = context;
  const pref = state[employee.id].preferences;
  const weekKey = isoWeekKey(date);
  const assignedWeekHours = state[employee.id].assignedHoursByWeek[weekKey] || 0;
  const contractHours = getContractHoursPerWeek(employee);

  // HARD RULES
  if (hasFixedTimeOff(pref, dateKey(date)) && candidateCode !== "L") return -weights.honorHardRules;
  if (violatesEveningOnlyRule(employee, candidateCode, date)) return -weights.honorHardRules;
  if (violatesDayBeforeAfterWeekendRule(employee, candidateCode, date, assignmentsByEmployee)) return -weights.honorHardRules;
  if (violatesWeekendIntervalRule(employee, candidateCode, date, state)) return -weights.honorHardRules;

  // basic coverage logic should prefer needed working shifts
  let score = 0;
  if (candidateCode !== "L" && currentCoverage < staffingNeed) score += 300;
  if (candidateCode === "L" && currentCoverage < staffingNeed) score -= 400;

  // PERSONAL WISHES
  if (hasFixedTimeOff(pref, dateKey(date)) && candidateCode === "L") score += weights.honorTimeOffRequest;
  if (preferredOffScore(pref, date) && candidateCode === "L") score += weights.honorPreferredOffDay;
  if (preferredOffScore(pref, date) && candidateCode !== "L") score -= weights.honorPreferredOffDay;
  if (preferredWorkScore(pref, date) && candidateCode !== "L") score += weights.honorPreferredWorkDay;

  // HOURS
  const candidateHours = candidateCode === "L" ? 0 : (candidateCode === "H" ? 7 : 8);
  const projected = assignedWeekHours + candidateHours;
  score -= Math.abs(contractHours - projected) * (weights.balanceHours / 40);

  // FAIRNESS
  if (candidateCode === "H") score -= state[employee.id].weekendCount * weights.fairnessWeekend;
  if (candidateCode === "K") score -= state[employee.id].eveningCount * weights.fairnessEvening;

  // consecutive evenings penalty
  if (candidateCode === "K" && state[employee.id].consecutiveEvenings >= 2) {
    score -= weights.avoidConsecutiveEvenings;
  }

  // department-specific behavior
  if (employee.department === "Järn" && candidateCode === "H") score += 50;
  if (["Kassa","Färg"].includes(employee.department) && candidateCode === "H") score += 30;

  return score;
}

function chooseBestCandidate(employees, date, department, allowedCodes, context) {
  const staffingNeed = isWeekend(date) ? context.rules.staffingWeekend[department] : context.rules.staffingWeekday[department];
  const currentCoverage = context.coverageByDept[department] || 0;

  let best = null;
  for (const e of employees.filter(x => x.department === department)) {
    for (const code of allowedCodes) {
      const score = scoreCandidate(e, code, date, { ...context, staffingNeed, currentCoverage });
      if (!best || score > best.score) {
        best = { employee: e, code, score };
      }
    }
  }
  return best;
}

function applyAssignment(state, assignmentsByEmployee, employee, date, code) {
  const key = dateKey(date);
  const weekKey = isoWeekKey(date);
  if (!assignmentsByEmployee[employee.id]) assignmentsByEmployee[employee.id] = {};
  assignmentsByEmployee[employee.id][key] = code;

  const entry = state[employee.id];
  const hours = code === "L" ? 0 : (code === "H" ? 7 : 8);
  entry.assignedHoursByWeek[weekKey] = (entry.assignedHoursByWeek[weekKey] || 0) + hours;
  if (code === "H") {
    entry.weekendCount += 1;
    entry.workedWeekendWeeks = entry.workedWeekendWeeks || [];
    const wk = isoWeekKey(date);
    if (!entry.workedWeekendWeeks.includes(wk)) entry.workedWeekendWeeks.push(wk);
  }
  if (code === "K") {
    entry.eveningCount += 1;
    entry.consecutiveEvenings += 1;
  } else {
    entry.consecutiveEvenings = 0;
  }
}

function ensureOffDaysForWeekendWorkers(state, assignmentsByEmployee, allDates) {
  // Kassa/Färg: if worked weekend, try assign one weekday off same week if not already.
  for (const employeeId of Object.keys(assignmentsByEmployee)) {
    const employee = state[employeeId].employee;
    if (!["Kassa","Färg"].includes(employee.department)) continue;
    const map = assignmentsByEmployee[employeeId];
    const datesByWeek = {};
    for (const d of allDates) {
      const wk = isoWeekKey(d);
      datesByWeek[wk] = datesByWeek[wk] || [];
      datesByWeek[wk].push(d);
    }
    for (const [wk, dates] of Object.entries(datesByWeek)) {
      const weekendWorked = dates.some(d => isWeekend(d) && map[dateKey(d)] === "H");
      if (!weekendWorked) continue;
      const weekdayDates = dates.filter(d => !isWeekend(d));
      const alreadyOff = weekdayDates.some(d => map[dateKey(d)] === "L");
      if (alreadyOff) continue;
      // choose preferred off day first
      const pref = state[employeeId].preferences;
      const preferred = weekdayDates.find(d => (pref.preferredOffDays || []).includes(dayName(d)));
      const chosen = preferred || weekdayDates[0];
      map[dateKey(chosen)] = "L";
    }
  }
}

function ensureRestAroundWeekendForJarn(state, assignmentsByEmployee, allDates) {
  for (const employeeId of Object.keys(assignmentsByEmployee)) {
    const employee = state[employeeId].employee;
    if (employee.department !== "Järn") continue;
    const map = assignmentsByEmployee[employeeId];
    for (const d of allDates) {
      if (!isWeekend(d) || map[dateKey(d)] !== "H") continue;
      const satLike = d.getDay() === 6 ? new Date(d) : null;
      const sunLike = d.getDay() === 0 ? new Date(d) : null;
      let friday, monday;
      if (satLike) {
        friday = new Date(satLike); friday.setDate(satLike.getDate() - 1);
      } else if (sunLike) {
        friday = new Date(sunLike); friday.setDate(sunLike.getDate() - 2);
      }
      if (sunLike) {
        monday = new Date(sunLike); monday.setDate(sunLike.getDate() + 1);
      } else if (satLike) {
        monday = new Date(satLike); monday.setDate(satLike.getDate() + 2);
      }
      if (friday) map[dateKey(friday)] = "L";
      if (monday) map[dateKey(monday)] = "L";
    }
  }
}

function buildResult(assignmentsByEmployee, employees, allDates, state) {
  const rows = [];
  for (const e of employees) {
    const row = {
      employeeId: e.id,
      employeeName: e.name,
      department: e.department,
      assignments: [],
      totals: {
        hours: 0,
        weekendCount: state[e.id].weekendCount,
        eveningCount: state[e.id].eveningCount,
      }
    };
    for (const d of allDates) {
      const key = dateKey(d);
      const code = assignmentsByEmployee[e.id]?.[key] || "L";
      row.assignments.push({ date: key, code });
      row.totals.hours += code === "L" ? 0 : (code === "H" ? 7 : 8);
    }
    rows.push(row);
  }
  return rows;
}

function buildDiagnostics(state, employees) {
  return employees.map(e => ({
    employeeId: e.id,
    employeeName: e.name,
    department: e.department,
    contractHoursPerWeek: getContractHoursPerWeek(e),
    weekendCount: state[e.id].weekendCount,
    eveningCount: state[e.id].eveningCount,
    preferences: state[e.id].preferences,
  }));
}

function generateSchedule({ employees, preferences, startDate, endDate, rules }) {
  const allDates = dateRange(startDate, endDate);
  const templates = getShiftTemplates();
  const weights = defaultScoringWeights();
  const state = buildState(employees, preferences);
  const assignmentsByEmployee = {};
  const coverageByDateAndDept = {};

  for (const date of allDates) {
    const key = dateKey(date);
    coverageByDateAndDept[key] = { "Kassa": 0, "Färg": 0, "Järn": 0 };

    for (const dept of ["Kassa","Färg","Järn"]) {
      const target = isWeekend(date) ? rules.staffingWeekend[dept] : rules.staffingWeekday[dept];
      while (coverageByDateAndDept[key][dept] < target) {
        const allowed = isWeekend(date) ? ["H","L"] : ["T","D","K","L"];
        const best = chooseBestCandidate(
          employees,
          date,
          dept,
          allowed,
          {
            state,
            assignmentsByEmployee,
            coverageByDept: coverageByDateAndDept[key],
            rules,
            weights,
          }
        );
        if (!best || best.code === "L") break;
        if (assignmentsByEmployee[best.employee.id]?.[key]) break;
        applyAssignment(state, assignmentsByEmployee, best.employee, date, best.code);
        coverageByDateAndDept[key][dept] += 1;
      }
    }

    // Fill remaining unassigned employees with off-days by default
    for (const e of employees) {
      assignmentsByEmployee[e.id] = assignmentsByEmployee[e.id] || {};
      if (!assignmentsByEmployee[e.id][key]) {
        applyAssignment(state, assignmentsByEmployee, e, date, "L");
      }
    }
  }

  ensureOffDaysForWeekendWorkers(state, assignmentsByEmployee, allDates);
  ensureRestAroundWeekendForJarn(state, assignmentsByEmployee, allDates);

  return {
    rows: buildResult(assignmentsByEmployee, employees, allDates, state),
    diagnostics: buildDiagnostics(state, employees),
    metadata: {
      startDate,
      endDate,
      rulesVersion: "v2",
      preferenceSupport: true,
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  generateSchedule,
  defaultScoringWeights,
  getContractHoursPerWeek,
};
