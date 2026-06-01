import React, { useMemo, useState } from "react";
import evaAvatar from "../assets/Eva.png";

const starterQuestions = [
  "Eva, förklara schemakvaliteten",
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
  if (!items.length) return "Jag hittar ingen data för det ännu.";

  return items
    .map((x, i) => `${i + 1}. ${x.name} (${x.department}) – ${x[field]}${unit}`)
    .join("\n");
}

function explainQuality(generated) {
  const diagnostics = getDiagnostics(generated);
  const summary = diagnostics.summary || {};
  const deviations = diagnostics.deviations || [];

  return [
    `Jag ser att schemakvaliteten är ${diagnostics.qualityScore ?? "-"} av 100.`,
    `Det finns ${summary.preferenceConflicts ?? 0} konfliktindikatorer och ${summary.brokenPreferences ?? 0} brutna önskemål.`,
    `Jag hittar ${summary.understaffedDays ?? 0} underbemanningssignaler.`,
    `Totalt finns ${summary.totalEvenings ?? 0} kvällspass och ${summary.totalWeekends ?? 0} helgpass i perioden.`,
    "",
    deviations.length
      ? `Det som påverkar mest just nu är:\n${deviations.slice(0, 5).map((d, i) => `${i + 1}. ${d.message}`).join("\n")}`
      : "Jag hittar inga större avvikelser just nu.",
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
    suggestions.push("Börja med underbemanningen. Den ska gå före individuella önskemål.");
  }

  if (eveningTop[0]?.evenings > eveningTop[2]?.evenings + 2) {
    suggestions.push(
      `Jämna ut kvällspassen. ${eveningTop[0].name} har flest kvällar (${eveningTop[0].evenings}).`
    );
  }

  if (weekendTop[0]?.weekends > weekendTop[2]?.weekends + 1) {
    suggestions.push(
      `Jämna ut helgpass. ${weekendTop[0].name} har flest helger (${weekendTop[0].weekends}).`
    );
  }

  if (conflictTop[0]?.conflicts > 0) {
    suggestions.push(
      `Titta först på ${conflictTop[0].name}. Där finns flest konfliktindikatorer (${conflictTop[0].conflicts}).`
    );
  }

  if (!suggestions.length) {
    suggestions.push("Schemat ser relativt balanserat ut. Nästa förbättring är att kontrollera bemanning per avdelning och dag.");
  }

  return `Mina tre bästa förbättringsförslag:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
}
function findActionSuggestions(generated) {
  const rows = getRows(generated);
  const diagnostics = getDiagnostics(generated);
  const deviations = diagnostics.deviations || [];

  const suggestions = [];

  const understaffing = deviations.filter(
    (d) => d.category === "Underbemanning"
  );

  understaffing.slice(0, 3).forEach((d) => {
    suggestions.push({
      title: "Lös underbemanning",
      action: `Kontrollera ${d.employeeName} och bemanna upp den dagen.`,
      effect: "Minskar hard conflict och höjer schemakvaliteten.",
      risk: "Kan bryta ett individuellt önskemål.",
    });
  });

  rows.forEach((row) => {
    const stats = personStats(row);

    if (stats.evenings >= 5) {
      const evening = row.assignments.find((a) => a.code === "K");

      if (evening) {
        suggestions.push({
          title: "Minska kvällsbelastning",
          action: `Byt ${row.employeeName} ${evening.date} från kväll till dag/ledig om bemanningen tillåter.`,
          effect: "Jämnar ut kvällspass.",
          risk: "Kan skapa underbemanning kvällstid.",
        });
      }
    }

    if (stats.weekends >= 3) {
      const weekend = row.assignments.find((a) => a.code === "H");

      if (weekend) {
        suggestions.push({
          title: "Minska helgbelastning",
          action: `Flytta ${row.employeeName}s helgpass ${weekend.date} till en kollega med färre helger.`,
          effect: "Jämnar ut helgfördelningen.",
          risk: "Kontrollera avdelningskompetens innan byte.",
        });
      }
    }

    const conflicted = row.assignments.find(
      (a) =>
        a.preferenceReasons?.some((r) =>
          String(r).toLowerCase().includes("bryter")
        )
    );

    if (conflicted) {
      suggestions.push({
        title: "Åtgärda brutet önskemål",
        action: `Granska ${row.employeeName} ${conflicted.date}. Passet bryter mot ett önskemål.`,
        effect: "Kan minska brutna önskemål.",
        risk: "Säkerställ att bemanningskravet fortfarande uppfylls.",
      });
    }
  });

  return suggestions.slice(0, 6);
}

function formatActionSuggestions(generated) {
  const suggestions = findActionSuggestions(generated);

  if (!suggestions.length) {
    return "Jag hittar inga tydliga åtgärder just nu. Schemat ser relativt balanserat ut.";
  }

  return [
    "Här är mina bästa åtgärdsförslag:",
    "",
    ...suggestions.map(
      (s, i) =>
        `${i + 1}. ${s.title}\nÅtgärd: ${s.action}\nEffekt: ${s.effect}\nRisk: ${s.risk}`
    ),
  ].join("\n\n");
}

function answer(question, generated, preferences) {
  const q = normalize(question);
  const rows = getRows(generated);
  const diagnostics = getDiagnostics(generated);

  if (!generated) {
    return "Jag hittar inget genererat schema ännu. Generera ett schema först så hjälper jag dig att analysera det.";
  }

  if (q.includes("kvalitet") || q.includes("score") || q.includes("poäng")) {
    return explainQuality(generated);
  }

  if (q.includes("konflikt") || q.includes("avvik")) {
    const deviations = diagnostics.deviations || [];
    if (!deviations.length) return "Jag hittar inga konflikter eller avvikelser just nu.";

    return `De största konflikterna jag ser är:\n${deviations
      .slice(0, 8)
      .map((d, i) => `${i + 1}. ${d.category || d.severity}: ${d.message}`)
      .join("\n")}`;
  }

  if (q.includes("kväll")) {
    return `De som jobbar flest kvällar är:\n${formatList(topBy(rows, "evenings"), "evenings", " kvällspass")}`;
  }

  if (q.includes("helg")) {
    return `De som jobbar flest helger är:\n${formatList(topBy(rows, "weekends"), "weekends", " helgpass")}`;
  }

  if (q.includes("underbemanning") || q.includes("bemanning")) {
    const under = (diagnostics.deviations || []).filter((d) => d.category === "Underbemanning");
    if (!under.length) return "Jag hittar ingen underbemanning i diagnosen.";

    return `Underbemanning jag hittar:\n${under.map((d, i) => `${i + 1}. ${d.message}`).join("\n")}`;
  }

 if (
  q.includes("förbättra") ||
  q.includes("föreslå") ||
  q.includes("förslag") ||
  q.includes("åtgärd") ||
  q.includes("ändra")
) {
  return formatActionSuggestions(generated);
}
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
      `Jag tittar på ${person.employeeName} (${person.department}).`,
      `Timmar: ${stats.hours}`,
      `Kvällspass: ${stats.evenings}`,
      `Helgpass: ${stats.weekends}`,
      `Lediga dagar: ${stats.daysOff}`,
      `Manuella ändringar: ${stats.manual}`,
      `Konfliktindikatorer: ${stats.conflicts}`,
      pref.notes ? `Notering: ${pref.notes}` : null,
    ].filter(Boolean).join("\n");
  }

  return "Jag kan hjälpa dig med schemakvalitet, konflikter, helger, kvällar, underbemanning och förbättringsförslag.";
}

export default function StaffingCopilotBackend({ generated, preferences }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hej, det är Eva. Jag kan hjälpa dig analysera schemat, hitta konflikter och föreslå förbättringar.",
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

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

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      const response = answer(question, generated, preferences);
      setMessages((prev) => [...prev, { role: "assistant", text: response }]);
      setThinking(false);
    }, 450);
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="card eva-copilot-card">
      <div className="eva-header">
        <div className="eva-avatar-wrap">
          <img src={evaAvatar} alt="Eva" className="eva-avatar" />
          <span className="eva-live-dot"></span>
        </div>

        <div>
         <div className="section-title">Fråga Eva ✨</div>
          <div className="muted">
            Din bemanningsanalytiker för schema, konflikter och förbättringar.
          </div>

          <div className="eva-status-pill">
            Kvalitet: {contextSummary.quality ?? "-"} · Konflikter: {contextSummary.conflicts ?? "-"} · Medarbetare: {contextSummary.rows}
          </div>
        </div>
      </div>

      <div className="chat-suggestions eva-suggestions">
        {starterQuestions.map((q) => (
          <button key={q} className="chat-chip" onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-thread eva-thread">
        {messages.map((m, idx) => (
          <div key={idx} className={`eva-message-row ${m.role}`}>
            {m.role === "assistant" && (
              <img src={evaAvatar} alt="Eva" className="eva-mini-avatar" />
            )}

            <div className={`chat-bubble eva-bubble ${m.role}`}>
              {m.text.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="eva-message-row assistant">
            <img src={evaAvatar} alt="Eva" className="eva-mini-avatar" />
            <div className="chat-bubble eva-bubble assistant">
              Eva tänker<span className="typing-dots">...</span>
            </div>
          </div>
        )}
      </div>

      <form className="chat-form eva-form" onSubmit={handleSubmit}>
        <input
          className="pref-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Fråga Eva om schemat..."
        />
        <button className="btn primary" type="submit">
          Fråga Eva
        </button>
      </form>
    </div>
  );
}
