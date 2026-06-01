import React, { useMemo, useState } from "react";

const starterQuestions = [
  "Förklara schemakvaliteten",
  "Vilka är största konflikterna?",
  "Vem jobbar flest kvällar?",
  "Vem jobbar flest helger?",
  "Föreslå 3 förbättringar",
  "Finns underbemanning?",
];

function normalize(str = "") {
  return String(str).toLowerCase();
}

function getRows(generated) {
  return generated?.rows || [];
}

function getDiagnostics(generated) {
  return generated?.diagnostics || {};
}

function personStats(row) {
  const assignments = row.assignments || [];
  return {
    name: row.employeeName,
    department: row.department,
    hours: assignments.reduce((sum, a) => sum + (a.hours || 0), 0),
    evenings: assignments.filter((a) => a.code === "K").length,
    weekends: assignments.filter((a) => a.code === "H").length,
    daysOff: assignments.filter((a) => a.code === "L").length,
    manual: assignments.filter((a) => a.manuallyEdited).length,
    conflicts: assignments.filter((a) => a.preferenceReasons?.length > 0).length,
  };
}

function topBy(rows, field, count = 5) {
  return rows
    .map(personStats)
    .sort((a, b) => (b[field] || 0) - (a[field] || 0))
    .slice(0, count);
}

function formatList(items, field, unit = "") {
  if (!items.length) return "Ingen data hittades.";
  return items
    .map((x, i) => `${i + 1}. ${x.name} (${x.department}) – ${x[field]}${unit}`)
    .join("\n");
}

function explainQuality(generated) {
  const diagnostics = getDiagnostics(generated);
  const summary = diagnostics.summary || {};
  const deviations = diagnostics.deviations || [];

  return [
    `Schemakvaliteten är ${diagnostics.qualityScore ?? "-"} av 100.`,
    `Konflikter: ${summary.preferenceConflicts ?? 0}.`,
    `Brutna önskemål: ${summary.brokenPreferences ?? 0}.`,
    `Underbemanningar: ${summary.understaffedDays ?? 0}.`,
    `Kvällspass totalt: ${summary.totalEvenings ?? 0}.`,
    `Helgpass totalt: ${summary.totalWeekends ?? 0}.`,
    "",
    deviations.length
      ? `Största orsakerna:\n${deviations.slice(0, 5).map((d, i) => `${i + 1}. ${d.message}`).join("\n")}`
      : "Inga tydliga avvikelser hittades.",
  ].join("\n");
}

function suggestImprovements(generated) {
  const rows = getRows(generated);
  const diagnostics = getDiagnostics(generated);
  const deviations = diagnostics.deviations || [];

  const eveningTop = topBy(rows, "evenings", 3);
  const weekendTop = topBy(rows, "weekends", 3);
  const conflictTop = topBy(rows, "conflicts", 3);

  const suggestions = [];

  if (deviations.some((d) => d.category === "Underbemanning")) {
    suggestions.push("Prioritera att lösa underbemanning före individuella önskemål.");
  }

  if (eveningTop[0]?.evenings > eveningTop[2]?.evenings + 2) {
    suggestions.push(
      `Jämna ut kvällspass: ${eveningTop[0].name} har flest kvällar (${eveningTop[0].evenings}).`
    );
  }

  if (weekendTop[0]?.weekends > weekendTop[2]?.weekends + 1) {
    suggestions.push(
      `Jämna ut helgpass: ${weekendTop[0].name} har flest helger (${weekendTop[0].weekends}).`
    );
  }

  if (conflictTop[0]?.conflicts > 0) {
    suggestions.push(
      `Börja med ${conflictTop[0].name}: flest celler med konfliktindikator (${conflictTop[0].conflicts}).`
    );
  }

  if (!suggestions.length) {
    suggestions.push("Schemat ser relativt balanserat ut. Nästa steg är att kontrollera bemanning per avdelning och dag.");
  }

  return `Förslag på förbättringar:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
}

function answer(question, generated, preferences) {
  const q = normalize(question);
  const rows = getRows(generated);
  const diagnostics = getDiagnostics(generated);

  if (!generated) {
    return "Jag hittar inget genererat schema ännu. Generera ett schema först.";
  }

  if (q.includes("kvalitet") || q.includes("score") || q.includes("poäng")) {
    return explainQuality(generated);
  }

  if (q.includes("konflikt") || q.includes("avvik")) {
    const deviations = diagnostics.deviations || [];
    if (!deviations.length) return "Jag hittar inga konflikter eller avvikelser.";
    return `Största konflikterna:\n${deviations.slice(0, 8).map((d, i) => `${i + 1}. ${d.category || d.severity}: ${d.message}`).join("\n")}`;
  }

  if (q.includes("kväll")) {
    return `Flest kvällspass:\n${formatList(topBy(rows, "evenings"), "evenings", " kvällspass")}`;
  }

  if (q.includes("helg")) {
    return `Flest helgpass:\n${formatList(topBy(rows, "weekends"), "weekends", " helgpass")}`;
  }

  if (q.includes("underbemanning") || q.includes("bemanning")) {
    const under = (diagnostics.deviations || []).filter((d) => d.category === "Underbemanning");
    if (!under.length) return "Jag hittar ingen underbemanning i diagnosen.";
    return `Underbemanning:\n${under.map((d, i) => `${i + 1}. ${d.message}`).join("\n")}`;
  }

  if (q.includes("förbättra") || q.includes("föreslå") || q.includes("förslag")) {
    return suggestImprovements(generated);
  }

  const person = rows.find((r) =>
    q.includes(normalize(r.employeeName)) ||
    normalize(r.employeeName).split(" ").some((part) => q.includes(part))
  );

  if (person) {
    const stats = personStats(person);
    const pref = preferences?.[person.employeeId] || {};
    return [
      `${person.employeeName} (${person.department})`,
      `Timmar: ${stats.hours}`,
      `Kvällspass: ${stats.evenings}`,
      `Helgpass: ${stats.weekends}`,
      `Lediga dagar: ${stats.daysOff}`,
      `Manuella ändringar: ${stats.manual}`,
      `Konfliktindikatorer: ${stats.conflicts}`,
      pref.notes ? `Notering: ${pref.notes}` : null,
    ].filter(Boolean).join("\n");
  }

  return "Jag kan analysera schemakvalitet, konflikter, helger, kvällar, underbemanning och ge förbättringsförslag.";
}

export default function StaffingCopilotBackend({ generated, preferences }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hej! Jag analyserar schemat, konflikter, helger, kvällar och bemanning. Testa gärna en snabbfråga.",
    },
  ]);

  const [input, setInput] = useState("");

  const contextSummary = useMemo(() => {
    const diagnostics = generated?.diagnostics || {};
    return {
      quality: diagnostics.qualityScore,
      conflicts: diagnostics.summary?.preferenceConflicts,
      rows: generated?.rows?.length || 0,
    };
  }, [generated]);

  function ask(question) {
    if (!question.trim()) return;

    const response = answer(question, generated, preferences);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "assistant", text: response },
    ]);

    setInput("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="card staffing-chat-card">
      <div className="section-title">Bemanningscopilot v2</div>
      <div className="muted">
        Läser schema, diagnos, konflikter och önskemål direkt från appen.
      </div>

      <div className="top-gap">
        <div className="save-pill">
          Kvalitet: {contextSummary.quality ?? "-"} · Konflikter: {contextSummary.conflicts ?? "-"} · Medarbetare: {contextSummary.rows}
        </div>
      </div>

      <div className="chat-suggestions">
        {starterQuestions.map((q) => (
          <button key={q} className="chat-chip" onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-thread">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble ${m.role}`}>
            {m.text.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          className="pref-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Fråga t.ex. varför kvaliteten är låg..."
        />
        <button className="btn primary" type="submit">
          Fråga
        </button>
      </form>
    </div>
  );
}
