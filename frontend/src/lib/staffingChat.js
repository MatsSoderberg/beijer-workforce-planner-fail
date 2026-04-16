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

function buildDateMap(scheduleRows) {
  const byEmployee = {};
  for (const row of scheduleRows || []) {
    const key = normalize(row.employeeName || row.name);
    byEmployee[key] = row;
  }
  return byEmployee;
}

function findEmployeeName(question, scheduleRows) {
  const q = normalize(question);
  for (const row of scheduleRows || []) {
    const full = normalize(row.employeeName || row.name);
    const first = full.split(" ")[0];
    if (q.includes(full) || q.includes(first)) {
      return row.employeeName || row.name;
    }
  }
  return null;
}

function getRowByName(scheduleRows, name) {
  const target = normalize(name);
  return (scheduleRows || []).find((r) => normalize(r.employeeName || r.name) === target) || null;
}

function countWeekendAssignments(row) {
  const weekendCodes = (row.assignments || []).filter((a) => a.code === "H");
  return weekendCodes.length;
}

function findDateFromQuestion(question) {
  const q = normalize(question);
  const direct = question.match(/\d{4}-\d{2}-\d{2}/);
  if (direct) return direct[0];

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

function answerHolidayCount(question, scheduleRows) {
  const employeeName = findEmployeeName(question, scheduleRows);
  if (!employeeName) return null;
  const row = getRowByName(scheduleRows, employeeName);
  if (!row) return null;

  const count = countWeekendAssignments(row);
  return `${employeeName} har ${count} helgpass i den aktuella schemaperioden.`;
}

function answerSpecificDate(question, scheduleRows) {
  const employeeName = findEmployeeName(question, scheduleRows);
  const date = findDateFromQuestion(question);
  if (!employeeName || !date) return null;

  const row = getRowByName(scheduleRows, employeeName);
  if (!row) return null;

  const hit = (row.assignments || []).find((a) => a.date === date);
  if (!hit) return `${employeeName} har inget registrerat pass för ${date} i den aktuella datan.`;

  const holiday = HOLIDAY_LABELS[date];
  const dateLabel = holiday ? `${holiday} (${date})` : date;
  return `${employeeName} ${codeToText(hit.code)} på ${dateLabel}.`;
}

function answerHours(question, scheduleRows) {
  const employeeName = findEmployeeName(question, scheduleRows);
  if (!employeeName) return null;
  const row = getRowByName(scheduleRows, employeeName);
  if (!row) return null;
  const hours = row.totals?.hours ?? row.hours ?? null;
  if (hours == null) return null;
  return `${employeeName} har totalt ${hours} timmar i den aktuella schemaversionen.`;
}

function answerDepartment(question, scheduleRows) {
  const q = normalize(question);
  if (!q.includes("avdelning") && !q.includes("department")) return null;
  const employeeName = findEmployeeName(question, scheduleRows);
  if (!employeeName) return null;
  const row = getRowByName(scheduleRows, employeeName);
  if (!row) return null;
  return `${employeeName} tillhör ${row.department}.`;
}

export function answerStaffingQuestion(question, scheduleRows) {
  if (!question?.trim()) {
    return "Skriv en fråga om bemanningen, till exempel: Hur många helger har David? eller Jobbar Pia på julafton?";
  }

  const q = normalize(question);

  const handlers = [
    answerSpecificDate,
    answerHolidayCount,
    answerHours,
    answerDepartment,
  ];

  for (const handler of handlers) {
    const answer = handler(question, scheduleRows);
    if (answer) return answer;
  }

  if (q.includes("julafton") || q.includes("jul") || q.includes("nyarsafton")) {
    return "Jag behöver både namn och datumfråga. Exempel: Jobbar Pia på julafton?";
  }

  return "Jag kunde inte tolka frågan ännu. Testa till exempel: Hur många helger har David? Hur många timmar har Pia? Jobbar Tobias på 2026-12-24?";
}
