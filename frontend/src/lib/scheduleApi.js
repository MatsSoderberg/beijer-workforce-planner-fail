const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const SHIFT_DEFS = {
  T: { label: "Tidigt", hours: 8, start: "06:00", end: "15:00" },
  M: { label: "Morgon", hours: 8, start: "07:00", end: "16:00" },
  D: { label: "Dag", hours: 8, start: "08:00", end: "17:00" },
  N: { label: "Normal", hours: 8, start: "09:00", end: "18:00" },
  K: { label: "Kväll", hours: 8, start: "10:00", end: "19:00" },
  H: { label: "Helg", hours: 7, start: "09:00", end: "16:00" },
  L: { label: "Ledig", hours: 0, start: "", end: "" },
};

function getWeekday(date) {
  return WEEKDAYS[new Date(date + "T00:00:00").getDay()];
}

function isWeekend(date) {
  const d = new Date(date + "T00:00:00").getDay();
  return d === 0 || d === 6;
}

function getISOWeek(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  return 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
}

function findPreference(emp, preferences = []) {
  return preferences.find((p) => p.employeeId === emp.id) || {};
}

function parseFreeTextNotes(notes = "") {
  const t = notes.toLowerCase();

  return {
    prefersEarly: t.includes("tidigt") || t.includes("morgon") || t.includes("6-15") || t.includes("7-16"),
    prefersLate: t.includes("sen") || t.includes("kväll") || t.includes("10-19"),
    prefersEightToFive: t.includes("8-17") || t.includes("08-17"),
    avoidsEarly: t.includes("aldrig jobba 6-15") || t.includes("inga 6-15") || t.includes("inte 6-15"),
    avoidsEightToFive: t.includes("inga 8-17") || t.includes("inte 8-17"),
    eveningOnly: t.includes("bara kväll") || t.includes("endast kväll"),
    avoidsWeekend: t.includes("inte helg") || t.includes("undvik helg") || t.includes("inga helger"),
    everySecondWeekend: t.includes("varannan helg"),
    everyThirdWeekend: t.includes("var 3:e helg") || t.includes("var tredje helg"),
    twoWeekRotation: t.includes("2 veckors rull") || t.includes("två veckors rull"),
    compSameWeek: t.includes("ledig dag samma vecka") || t.includes("ledig dag den veckan"),
    compWeekAfter: t.includes("veckan efter"),
    preferConsecutiveDaysOff: t.includes("ledig flera dagar") || t.includes("sammanhängande"),
    avoidConsecutiveEvenings: t.includes("inte flera kväll") || t.includes("inte kvällar i rad"),
  };
}

function mergedRules(pref = {}) {
  return {
    ...parseFreeTextNotes(pref.notes || ""),
    ...(pref.importedRuleTags || {}),
  };
}

function candidateCodesFor(emp, date, rules) {
  if (isWeekend(date)) return ["H", "L"];

  if (emp.eveningOnly || rules.eveningOnly) return ["K", "L"];

  return ["T", "M", "D", "N", "K", "L"];
}

function getWeekendPatternScore(rules, date, code) {
  if (!isWeekend(date)) return 0;

  const week = getISOWeek(date);

  if (rules.everySecondWeekend) {
    const shouldWork = week % 2 === 0;
    if (shouldWork && code === "H") return 45;
    if (!shouldWork && code === "L") return 45;
    return -45;
  }

  if (rules.everyThirdWeekend) {
    const shouldWork = week % 3 === 0;
    if (shouldWork && code === "H") return 55;
    if (!shouldWork && code === "L") return 45;
    return -55;
  }

  return 0;
}

function previousAssignment(row, index) {
  if (!row || index <= 0) return null;
  return row.assignments[index - 1] || null;
}

function scoreCandidate({ emp, pref, rules, date, code, index, row }) {
  const weekday = getWeekday(date);
  const weekend = isWeekend(date);
  let score = 0;
  const reasons = [];

  const fixedTimeOff = pref.fixedTimeOff || [];
  const preferredOffDays = pref.preferredOffDays || [];
  const preferredWorkDays = pref.preferredWorkDays || [];

  if (fixedTimeOff.includes(date) && code !== "L") {
    return { score: -9999, reasons: ["Fast ledighet"] };
  }

  if ((emp.eveningOnly || rules.eveningOnly) && code !== "K" && code !== "L") {
    return { score: -9999, reasons: ["Endast kvällspass"] };
  }

  if (rules.avoidsEarly && code === "T") {
    return { score: -9999, reasons: ["Får inte jobba 06-15"] };
  }

  if (rules.avoidsEightToFive && code === "D") {
    return { score: -9999, reasons: ["Undviker 08-17"] };
  }

  if (code === "L") score += 10;
  if (code === "T") score += 70;
  if (code === "M") score += 68;
  if (code === "D") score += 62;
  if (code === "N") score += 62;
  if (code === "K") score += 58;
  if (code === "H") score += 55;

  if (Number(emp.employmentPct || 100) <= 82) {
    if (code === "L") score += 22;
    if (index % 5 === 0 && code !== "L") score -= 18;
  }

  if (preferredOffDays.includes(weekday)) {
    if (code === "L") {
      score += 80;
      reasons.push("Matchar önskad ledig dag");
    } else {
      score -= 80;
      reasons.push("Bryter mot önskad ledig dag");
    }
  }

  if (preferredWorkDays.includes(weekday)) {
    if (code !== "L") {
      score += 35;
      reasons.push("Matchar önskad arbetsdag");
    } else {
      score -= 25;
    }
  }

  if (rules.prefersEarly) {
    if (code === "T" || code === "M") score += 35;
    if (code === "K") score -= 25;
  }

  if (rules.prefersLate) {
    if (code === "K") score += 35;
    if (code === "T") score -= 20;
  }

  if (rules.prefersEightToFive && code === "D") {
    score += 30;
  }

  if (rules.avoidsWeekend && weekend) {
    if (code === "L") score += 50;
    if (code === "H") score -= 60;
  }

  score += getWeekendPatternScore(rules, date, code);

  const prev = previousAssignment(row, index);

  if (rules.avoidConsecutiveEvenings && prev?.code === "K" && code === "K") {
    score -= 70;
    reasons.push("Undviker kvällar i rad");
  }

  if (prev?.code === "K" && (code === "T" || code === "M")) {
    score -= 60;
    reasons.push("Undviker tidigt pass efter kväll");
  }

  if (rules.preferConsecutiveDaysOff && prev?.code === "L" && code === "L") {
    score += 30;
  }

  if (rules.compSameWeek || rules.compWeekAfter) {
    const week = getISOWeek(date);
    const hasWeekendThisWeek = row.assignments.some((a) => getISOWeek(a.date) === week && a.code === "H");
    const hasWeekendLastWeek = row.assignments.some((a) => getISOWeek(a.date) === week - 1 && a.code === "H");

    if ((rules.compSameWeek && hasWeekendThisWeek) || (rules.compWeekAfter && hasWeekendLastWeek)) {
      if (!weekend && code === "L") score += 45;
      if (!weekend && code !== "L") score -= 15;
    }
  }

  if (weekday === "friday" && code === "T") {
    score += 12;
    reasons.push("Tidigt fredagspass prioriteras");
  }

  if (rules.twoWeekRotation) {
    const week = getISOWeek(date);
    if (week % 2 === 0 && code === "K") score += 10;
    if (week % 2 !== 0 && (code === "T" || code === "M")) score += 10;
  }

  if (index % 5 === 0 && code === "T") score += 5;
  if (index % 5 === 1 && code === "M") score += 5;
  if (index % 5 === 2 && code === "N") score += 5;
  if (index % 5 === 3 && code === "K") score += 5;

  return { score, reasons };
}

function chooseBestCode(args) {
  const candidates = candidateCodesFor(args.emp, args.date, args.rules);

  const scored = candidates.map((code) => ({
    code,
    ...scoreCandidate({ ...args, code }),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

function buildFallbackRows(employees = [], startDate, endDate, preferences = []) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const dates = [];
  const cur = new Date(start);

  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  return employees.map((emp) => {
    const pref = findPreference(emp, preferences);
    const rules = mergedRules(pref);

    const row = {
      employeeId: emp.id,
      employeeName: emp.name || "Namnlös medarbetare",
      department: emp.department,
      assignments: [],
      totals: { hours: 0 },
    };

    dates.forEach((date, index) => {
      const best = chooseBestCode({ emp, pref, rules, date, index, row });
      const shift = SHIFT_DEFS[best.code] || SHIFT_DEFS.L;

      row.assignments.push({
        date,
        code: best.code,
        label: shift.label,
        start: shift.start,
        end: shift.end,
        hours: shift.hours,
        preferenceReasons: best.reasons || [],
        preferenceScore: best.score,
      });
    });

    row.totals.hours = row.assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
    return row;
  });
}

function buildFallbackDiagnostics(rows, preferences = []) {
  const deviations = [];

  rows.forEach((row) => {
    const pref = preferences.find((p) => p.employeeId === row.employeeId);
    const weekendCount = row.assignments.filter((a) => a.code === "H").length;
    const eveningCount = row.assignments.filter((a) => a.code === "K").length;

    if (weekendCount >= 4) {
      deviations.push({
        severity: "medium",
        employeeName: row.employeeName,
        message: `${row.employeeName} har relativt hög helgbelastning.`,
      });
    }

    if (eveningCount >= 8) {
      deviations.push({
        severity: "medium",
        employeeName: row.employeeName,
        message: `${row.employeeName} har många kvällspass under perioden.`,
      });
    }

    if (pref?.notes) {
      deviations.push({
        severity: "low",
        employeeName: row.employeeName,
        message: `${row.employeeName}s textönskemål och importerade regler har vägts in.`,
      });
    }
  });

  return {
    deviations,
    summary: {
      hardRuleViolations: 0,
      preferenceConflicts: deviations.filter((d) => d.severity !== "low").length,
      interpretedPreferenceNotes: preferences.filter((p) => p.notes).length,
    },
  };
}

export async function generateScheduleFromBackend(payload = {}) {
  const res = await fetch("/api/schedule/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to generate schedule");
  return res.json();
}

export function generateScheduleFallback(payload = {}) {
  const rows = buildFallbackRows(
    payload.employees || [],
    payload.startDate,
    payload.endDate,
    payload.preferences || []
  );

  const diagnostics = buildFallbackDiagnostics(rows, payload.preferences || []);

  return {
    rows,
    diagnostics,
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: "fallback-advanced-rules-v2",
      startDate: payload.startDate,
      endDate: payload.endDate,
      preferenceCount: (payload.preferences || []).length,
      daysGenerated: rows[0]?.assignments?.length || 0,
    },
  };
}

export async function fetchCopilotContext() {
  const res = await fetch("/api/copilot/context");
  if (!res.ok) throw new Error("Failed to fetch copilot context");
  return res.json();
}

export async function askCopilot(question) {
  const res = await fetch("/api/copilot/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) throw new Error("Failed to ask copilot");
  return res.json();
}
