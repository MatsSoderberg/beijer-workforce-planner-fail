
function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HOLIDAY_LABELS = {
  "2026-12-24": "Julafton",
  "2026-12-25": "Juldagen",
  "2026-12-26": "Annandag jul",
  "2026-12-31": "Nyårsafton",
};

function getRowName(row) {
  return row.employeeName || row.name || "";
}

function findEmployee(question, rows) {
  const q = normalize(question);
  for (const row of rows || []) {
    const full = normalize(getRowName(row));
    const first = full.split(" ")[0];
    if (q.includes(full) || q.includes(first)) return row;
  }
  return null;
}

function findDate(question) {
  const direct = question.match(/\d{4}-\d{2}-\d{2}/);
  if (direct) return direct[0];
  const q = normalize(question);
  const holiday = Object.entries(HOLIDAY_LABELS).find(([, label]) => q.includes(normalize(label)));
  return holiday ? holiday[0] : null;
}

function codeToText(code) {
  if (code === "H") return "jobbar helgpass";
  if (code === "K") return "jobbar kväll";
  if (code === "D") return "jobbar dag";
  if (code === "T") return "jobbar tidigt pass";
  if (code === "L") return "är ledig";
  return `har passkod ${code}`;
}

function assignmentOnDate(row, date) {
  return (row.assignments || []).find((a) => a.date === date) || null;
}

function countByCode(row, code) {
  return (row.assignments || []).filter((a) => a.code === code).length;
}

function answerFromSchedule(question, rows, diagnostics) {
  const q = normalize(question);

  const row = findEmployee(question, rows);
  const date = findDate(question);

  if (row && date) {
    const a = assignmentOnDate(row, date);
    if (!a) return `${getRowName(row)} har inget registrerat pass för ${date} i den publicerade schemaversionen.`;
    const dateLabel = HOLIDAY_LABELS[date] ? `${HOLIDAY_LABELS[date]} (${date})` : date;
    return `${getRowName(row)} ${codeToText(a.code)} på ${dateLabel}.`;
  }

  if (row && (q.includes("helg"))) {
    return `${getRowName(row)} har ${countByCode(row, "H")} helgpass i den publicerade schemaversionen.`;
  }

  if (row && (q.includes("kvall") || q.includes("kväll"))) {
    return `${getRowName(row)} har ${countByCode(row, "K")} kvällspass i den publicerade schemaversionen.`;
  }

  if (row && q.includes("tim")) {
    const hours = row.totals?.hours ?? row.hours ?? 0;
    return `${getRowName(row)} har totalt ${hours} timmar i den publicerade schemaversionen.`;
  }

  if (row && (q.includes("avdelning") || q.includes("tillhor") || q.includes("tillhör"))) {
    return `${getRowName(row)} tillhör ${row.department}.`;
  }

  if ((q.includes("vem") || q.includes("vilka")) && date && (q.includes("jobbar") || q.includes("arbetar"))) {
    const workers = (rows || [])
      .map((r) => ({ name: getRowName(r), a: assignmentOnDate(r, date) }))
      .filter((x) => x.a && x.a.code !== "L")
      .map((x) => `${x.name} (${x.a.code})`);
    const dateLabel = HOLIDAY_LABELS[date] ? `${HOLIDAY_LABELS[date]} (${date})` : date;
    return workers.length
      ? `Följande arbetar på ${dateLabel}: ${workers.join(", ")}.`
      : `Ingen är schemalagd att arbeta på ${dateLabel} i den publicerade schemaversionen.`;
  }

  if ((q.includes("vem") || q.includes("vilka")) && date && q.includes("ledig")) {
    const offs = (rows || [])
      .map((r) => ({ name: getRowName(r), a: assignmentOnDate(r, date) }))
      .filter((x) => x.a && x.a.code === "L")
      .map((x) => x.name);
    const dateLabel = HOLIDAY_LABELS[date] ? `${HOLIDAY_LABELS[date]} (${date})` : date;
    return offs.length
      ? `Följande är lediga på ${dateLabel}: ${offs.join(", ")}.`
      : `Ingen är markerad som ledig på ${dateLabel} i den publicerade schemaversionen.`;
  }

  if (q.includes("flest helg")) {
    const ranked = (rows || []).map((r) => ({ name: getRowName(r), count: countByCode(r, "H") })).sort((a, b) => b.count - a.count);
    return ranked.length ? `${ranked[0].name} har flest helgpass i den publicerade schemaversionen, med ${ranked[0].count} helgpass.` : "Ingen schemadata finns.";
  }

  if (q.includes("minst helg")) {
    const ranked = (rows || []).map((r) => ({ name: getRowName(r), count: countByCode(r, "H") })).sort((a, b) => a.count - b.count);
    return ranked.length ? `${ranked[0].name} har minst antal helgpass i den publicerade schemaversionen, med ${ranked[0].count} helgpass.` : "Ingen schemadata finns.";
  }

  if (q.includes("avvik")) {
    const devs = diagnostics?.deviations || [];
    if (!devs.length) return "Inga avvikelser finns registrerade i den publicerade schemaversionen.";
    return `De viktigaste avvikelserna är: ${devs.slice(0, 5).map((d) => d.message).join(" ")}`;
  }

  if (q.includes("rod dag") || q.includes("röd dag") || q.includes("helgdag")) {
    const count = diagnostics?.summary?.holidayAdjustedDays ?? 0;
    return `Schemat har ${count} dagar där röda dagar påverkat bemanningslogiken i den publicerade schemaversionen.`;
  }

  return null;
}

function buildContextSummary(version) {
  return {
    title: version?.title || "Publicerat schema",
    status: version?.status || "unknown",
    period: version?.period || null,
    employees: Array.isArray(version?.rows) ? version.rows.length : 0,
    deviations: version?.summary?.deviations ?? null,
  };
}

module.exports = {
  answerFromSchedule,
  buildContextSummary,
};
