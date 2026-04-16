const HOLIDAY_LABELS = {
  "2026-12-24": "Julafton",
  "2026-12-25": "Juldagen",
  "2026-12-26": "Annandag jul",
  "2026-12-31": "Nyårsafton",
};

function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRowName(row) {
  return row.employeeName || row.name || "";
}

function getRows(scheduleRows = []) {
  return Array.isArray(scheduleRows) ? scheduleRows : [];
}

function findEmployee(question, scheduleRows) {
  const q = normalize(question);
  for (const row of getRows(scheduleRows)) {
    const full = normalize(getRowName(row));
    const first = full.split(" ")[0];
    if (q.includes(full) || q.includes(first)) return row;
  }
  return null;
}

function findDateFromQuestion(question) {
  const direct = question.match(/\d{4}-\d{2}-\d{2}/);
  if (direct) return direct[0];
  const q = normalize(question);
  const holidayEntry = Object.entries(HOLIDAY_LABELS).find(([, label]) => q.includes(normalize(label)));
  if (holidayEntry) return holidayEntry[0];
  return null;
}

function codeToText(code) {
  if (code === "H") return "jobbar helgpass";
  if (code === "K") return "jobbar kväll";
  if (code === "D") return "jobbar dag";
  if (code === "T") return "jobbar tidigt pass";
  if (code === "L") return "är ledig";
  return `har passkod ${code}`;
}

function getAssignmentOnDate(row, date) {
  return (row.assignments || []).find((a) => a.date === date) || null;
}

function countWeekendAssignments(row) {
  return (row.assignments || []).filter((a) => a.code === "H").length;
}

function countCode(row, code) {
  return (row.assignments || []).filter((a) => a.code === code).length;
}

function getTotalsHours(row) {
  return row.totals?.hours ?? row.hours ?? 0;
}

function answerSpecificDate(question, scheduleRows) {
  const row = findEmployee(question, scheduleRows);
  const date = findDateFromQuestion(question);
  if (!row || !date) return null;
  const hit = getAssignmentOnDate(row, date);
  if (!hit) return `${getRowName(row)} har inget registrerat pass för ${date} i den aktuella datan.`;
  const holiday = HOLIDAY_LABELS[date];
  const dateLabel = holiday ? `${holiday} (${date})` : date;
  return `${getRowName(row)} ${codeToText(hit.code)} på ${dateLabel}.`;
}

function answerHolidayCount(question, scheduleRows) {
  const q = normalize(question);
  if (!q.includes("helg")) return null;
  const row = findEmployee(question, scheduleRows);
  if (!row) return null;
  const count = countWeekendAssignments(row);
  return `${getRowName(row)} har ${count} helgpass i den aktuella schemaperioden.`;
}

function answerEveningCount(question, scheduleRows) {
  const q = normalize(question);
  if (!q.includes("kvall") && !q.includes("kväll")) return null;
  const row = findEmployee(question, scheduleRows);
  if (!row) return null;
  const count = countCode(row, "K");
  return `${getRowName(row)} har ${count} kvällspass i den aktuella schemaperioden.`;
}

function answerHours(question, scheduleRows) {
  const q = normalize(question);
  if (!q.includes("tim")) return null;
  const row = findEmployee(question, scheduleRows);
  if (!row) return null;
  const hours = getTotalsHours(row);
  return `${getRowName(row)} har totalt ${hours} timmar i den aktuella schemaversionen.`;
}

function answerDepartment(question, scheduleRows) {
  const q = normalize(question);
  if (!q.includes("avdelning") && !q.includes("tillhor") && !q.includes("tillhör")) return null;
  const row = findEmployee(question, scheduleRows);
  if (!row) return null;
  return `${getRowName(row)} tillhör ${row.department}.`;
}

function answerMostWeekends(question, scheduleRows) {
  const q = normalize(question);
  if (!q.includes("flest helg")) return null;
  const rows = getRows(scheduleRows);
  if (!rows.length) return null;
  const ranked = rows
    .map((r) => ({ name: getRowName(r), count: countWeekendAssignments(r) }))
    .sort((a, b) => b.count - a.count);
  const top = ranked[0];
  return `${top.name} har flest helgpass i den aktuella datan, med ${top.count} helgpass.`;
}

function answerLeastWeekends(question, scheduleRows) {
  const q = normalize(question);
  if (!q.includes("minst helg")) return null;
  const rows = getRows(scheduleRows);
  if (!rows.length) return null;
  const ranked = rows
    .map((r) => ({ name: getRowName(r), count: countWeekendAssignments(r) }))
    .sort((a, b) => a.count - b.count);
  const top = ranked[0];
  return `${top.name} har minst antal helgpass i den aktuella datan, med ${top.count} helgpass.`;
}

function answerWhoWorksDate(question, scheduleRows) {
  const q = normalize(question);
  const date = findDateFromQuestion(question);
  if (!date) return null;
  if (!q.includes("vem") && !q.includes("vilka")) return null;
  const workers = getRows(scheduleRows)
    .map((r) => ({ name: getRowName(r), a: getAssignmentOnDate(r, date) }))
    .filter((x) => x.a && x.a.code !== "L")
    .map((x) => `${x.name} (${x.a.code})`);
  const holiday = HOLIDAY_LABELS[date];
  const label = holiday ? `${holiday} (${date})` : date;
  if (!workers.length) return `Ingen är schemalagd att arbeta på ${label} i den aktuella datan.`;
  return `Följande arbetar på ${label}: ${workers.join(", ")}.`;
}

function answerWhoIsOffDate(question, scheduleRows) {
  const q = normalize(question);
  const date = findDateFromQuestion(question);
  if (!date) return null;
  if (!q.includes("ledig")) return null;
  if (!q.includes("vem") && !q.includes("vilka")) return null;
  const workers = getRows(scheduleRows)
    .map((r) => ({ name: getRowName(r), a: getAssignmentOnDate(r, date) }))
    .filter((x) => x.a && x.a.code === "L")
    .map((x) => x.name);
  const holiday = HOLIDAY_LABELS[date];
  const label = holiday ? `${holiday} (${date})` : date;
  if (!workers.length) return `Ingen är markerad som ledig på ${label} i den aktuella datan.`;
  return `Följande är lediga på ${label}: ${workers.join(", ")}.`;
}

function answerPreferenceConflict(question, scheduleRows, diagnostics) {
  const q = normalize(question);
  if (!q.includes("onskemal") && !q.includes("önskemål") && !q.includes("preferens")) return null;
  const row = findEmployee(question, scheduleRows);
  if (!row) return null;
  const hits = (diagnostics?.deviations || []).filter((d) =>
    normalize(d.employeeName || "").includes(normalize(getRowName(row)))
  );
  if (!hits.length) return `${getRowName(row)} har inga registrerade preferensavvikelser i den aktuella diagnostiken.`;
  return `${getRowName(row)} har ${hits.length} registrerade avvikelser kopplade till önskemål eller regler.`;
}

function answerHolidayDiagnostics(question, diagnostics) {
  const q = normalize(question);
  if (!q.includes("rod dag") && !q.includes("röd dag") && !q.includes("helgdag")) return null;
  const count = diagnostics?.summary?.holidayAdjustedDays ?? 0;
  return `Schemat har ${count} dagar där röda dagar har påverkat bemanningslogiken i den aktuella körningen.`;
}

function answerTopDeviations(question, diagnostics) {
  const q = normalize(question);
  if (!q.includes("avvik")) return null;
  const devs = diagnostics?.deviations || [];
  if (!devs.length) return `Inga avvikelser finns registrerade i den aktuella diagnostiken.`;
  const top = devs.slice(0, 5).map((d) => d.message).join(" ");
  return `De viktigaste avvikelserna just nu är: ${top}`;
}

function fallbackHelp() {
  return "Jag kunde inte tolka frågan ännu. Testa till exempel: Hur många helger har David? Jobbar Pia på julafton? Vem arbetar på 2026-12-24? Vem har flest helger? Har Tobias några preferensavvikelser?";
}

export function answerStaffingQuestionV2(question, context = {}) {
  const { scheduleRows = [], diagnostics = null } = context;
  if (!question?.trim()) {
    return "Skriv en fråga om bemanningen, till exempel: Hur många helger har David? eller Jobbar Pia på julafton?";
  }
  const rows = getRows(scheduleRows);
  if (!rows.length) {
    return "Jag saknar schemadata just nu. Generera eller ladda ett schema först.";
  }

  const handlers = [
    (q) => answerSpecificDate(q, rows),
    (q) => answerWhoWorksDate(q, rows),
    (q) => answerWhoIsOffDate(q, rows),
    (q) => answerHolidayCount(q, rows),
    (q) => answerEveningCount(q, rows),
    (q) => answerHours(q, rows),
    (q) => answerDepartment(q, rows),
    (q) => answerMostWeekends(q, rows),
    (q) => answerLeastWeekends(q, rows),
    (q) => answerPreferenceConflict(q, rows, diagnostics),
    (q) => answerHolidayDiagnostics(q, diagnostics),
    (q) => answerTopDeviations(q, diagnostics),
  ];

  for (const handler of handlers) {
    const answer = handler(question);
    if (answer) return answer;
  }

  return fallbackHelp();
}
