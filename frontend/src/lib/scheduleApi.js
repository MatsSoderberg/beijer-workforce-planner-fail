const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const SHIFT_DEFS = {
  T: { label: "Tidigt", hours: 8, start: "06:00", end: "15:00" },
  D: { label: "Dag", hours: 8, start: "09:00", end: "17:00" },
  K: { label: "Kväll", hours: 8, start: "11:00", end: "19:00" },
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

function findPreference(emp, preferences = []) {
  return preferences.find((p) => p.employeeId === emp.id) || {};
}

function parseFreeTextNotes(notes = "") {
  const t = notes.toLowerCase();

  return {
    prefersEarly:
      t.includes("tidig") ||
      t.includes("morgon") ||
      t.includes("öppning") ||
      t.includes("öppna"),

    prefersDay:
      t.includes("dagpass") ||
      t.includes("dagtid") ||
      t.includes("kontorstid"),

    prefersEvening:
      t.includes("kväll") &&
      !t.includes("inte kväll") &&
      !t.includes("undvik kväll"),

    avoidsEvening:
      t.includes("inte kväll") ||
      t.includes("undvik kväll") ||
      t.includes("helst inte kväll"),

    avoidsWeekend:
      t.includes("inte helg") ||
      t.includes("undvik helg") ||
      t.includes("helst inte helg") ||
      t.includes("inga helger"),

    likesWeekend:
      t.includes("kan jobba helg") ||
      t.includes("helg ok") ||
      t.includes("gärna helg"),

    wantsConsecutiveDaysOff:
      t.includes("sammanhängande ledighet") ||
      t.includes("två lediga dagar") ||
      t.includes("lediga dagar i rad"),

    avoidConsecutiveEvenings:
      t.includes("inte flera kväll") ||
      t.includes("inte kvällar i rad") ||
      t.includes("undvik flera kväll"),
  };
}

function candidateCodesFor(emp, date) {
  if (isWeekend(date)) {
    return ["H", "L"];
  }

  if (emp.eveningOnly) {
    return ["K", "L"];
  }

  return ["T", "D", "K", "L"];
}

function previousAssignment(row, assignmentIndex) {
  if (!row || assignmentIndex <= 0) return null;
  return row.assignments[assignmentIndex - 1] || null;
}

function scoreCandidate({
  emp,
  pref,
  parsedNotes,
  date,
  code,
  assignmentIndex,
  currentRow,
}) {
  const weekday = getWeekday(date);
  const weekend = isWeekend(date);
  let score = 0;
  const reasons = [];

  const fixedTimeOff = pref.fixedTimeOff || [];
  const preferredOffDays = pref.preferredOffDays || [];
  const preferredWorkDays = pref.preferredWorkDays || [];

  // Hårda regler
  if (fixedTimeOff.includes(date) && code !== "L") {
    return { score: -9999, reasons: ["Fast ledighet"] };
  }

  if (emp.eveningOnly && code !== "K" && code !== "L") {
    return { score: -9999, reasons: ["Endast kväll"] };
  }

  // Grundpoäng
  if (code === "L") score += 10;
  if (code === "T") score += 70;
  if (code === "D") score += 65;
  if (code === "K") score += 55;
  if (code === "H") score += 55;

  // Employment %
  if (Number(emp.employmentPct || 100) <= 82) {
    if (code === "L") score += 18;
    if (assignmentIndex % 5 === 0 && code !== "L") score -= 20;
  }

  // Strukturerade önskemål
  if (preferredOffDays.includes(weekday)) {
    if (code === "L") {
      score += 70;
      reasons.push("Matchar önskad ledig dag");
    } else {
      score -= 65;
      reasons.push("Bryter mot önskad ledig dag");
    }
  }

  if (preferredWorkDays.includes(weekday)) {
    if (code !== "L") {
      score += 35;
      reasons.push("Matchar önskad arbetsdag");
    } else {
      score -= 20;
    }
  }

  // Fritexttolkning
  if (parsedNotes.prefersEarly) {
    if (code === "T") score += 30;
    if (code === "K") score -= 20;
  }

  if (parsedNotes.prefersDay) {
    if (code === "D") score += 25;
    if (code === "K") score -= 15;
  }

  if (parsedNotes.prefersEvening) {
    if (code === "K") score += 25;
  }

  if (parsedNotes.avoidsEvening) {
    if (code === "K") {
      score -= 45;
      reasons.push("Kväll bör undvikas");
    }
  }

  if (parsedNotes.avoidsWeekend && weekend) {
    if (code === "L") score += 45;
    if (code === "H") {
      score -= 45;
      reasons.push("Helg bör undvikas");
    }
  }

  if (parsedNotes.likesWeekend && weekend && code === "H") {
    score += 25;
  }

  const prev = previousAssignment(currentRow, assignmentIndex);

  if (parsedNotes.avoidConsecutiveEvenings && prev?.code === "K" && code === "K") {
    score -= 60;
    reasons.push("Undviker flera kvällar i rad");
  }

  if (prev?.code === "K" && code === "T") {
    score -= 50;
    reasons.push("Undviker öppning efter kväll");
  }

  // Enkel rotation/fördelning så det inte blir samma pass hela tiden
  if (assignmentIndex % 4 === 0 && code === "T") score += 8;
  if (assignmentIndex % 4 === 1 && code === "D") score += 8;
  if (assignmentIndex % 4 === 2 && code === "K") score += 8;

  return { score, reasons };
}

function chooseBestCode(args) {
  const candidates = candidateCodesFor(args.emp, args.date);

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
    const parsedNotes = parseFreeTextNotes(pref.notes || "");
    const row = {
      employeeId: emp.id,
      employeeName: emp.name || "Namnlös medarbetare",
      department: emp.department,
      assignments: [],
      totals: { hours: 0 },
    };

    dates.forEach((date, assignmentIndex) => {
      const best = chooseBestCode({
        emp,
        pref,
        parsedNotes,
        date,
        assignmentIndex,
        currentRow: row,
      });

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

    row.totals.hours = row.assignments.reduce(
      (sum, a) => sum + (a.hours || 0),
      0
    );

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
        message: `${row.employeeName}s fritextönskemål har tolkats och vägts in.`,
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

  const diagnostics = buildFallbackDiagnostics(
    rows,
    payload.preferences || []
  );

  return {
    rows,
    diagnostics,
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: "fallback-preference-engine-v1",
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
