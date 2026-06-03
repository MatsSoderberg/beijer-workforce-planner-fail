import React, { useMemo, useState } from "react";
import evaAvatar from "../assets/Eva.png";

const starterQuestions = [
  "Eva, förklara schemakvaliteten",
  "Vilka är största konflikterna?",
  "Vem jobbar flest kvällar?",
  "Vem jobbar flest helger?",
  "Eva, föreslå 3 förbättringar",
  "Finns underbemanning?",
  "Eva, föreslå konkreta åtgärder",
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

function estimateSuggestionImpact(card, generated) {
  const diagnostics = getDiagnostics(generated);
  const summary = diagnostics.summary || {};
  const currentScore = diagnostics.qualityScore ?? 70;

  let scoreLift = 2;
  let conflictLift = 0;
  let riskLevel = "Låg";

  const title = normalize(card.title);
  const action = normalize(card.action);

  if (title.includes("underbemanning") || action.includes("bemanna")) {
    scoreLift = 8;
    conflictLift = 1;
    riskLevel = "Medel";
  }

  if (title.includes("kväll")) {
    scoreLift = 5;
    conflictLift = 1;
    riskLevel = "Låg";
  }

  if (title.includes("helg")) {
    scoreLift = 6;
    conflictLift = 1;
    riskLevel = "Medel";
  }

  if (title.includes("önskemål")) {
    scoreLift = 4;
    conflictLift = 1;
    riskLevel = "Låg";
  }

  const newScore = Math.min(100, currentScore + scoreLift);
  const newConflicts = Math.max(
    0,
    (summary.preferenceConflicts ?? 0) - conflictLift
  );

  return {
    currentScore,
    newScore,
    currentConflicts: summary.preferenceConflicts ?? 0,
    newConflicts,
    currentBroken: summary.brokenPreferences ?? 0,
    newBroken: Math.max(0, (summary.brokenPreferences ?? 0) - conflictLift),
    riskLevel,
  };
}

function formatSuggestionReview(card, generated) {
  const impact = estimateSuggestionImpact(card, generated);

  return [
    `Jag har granskat förslaget: ${card.title}`,
    "",
    `Föreslagen åtgärd: ${card.action}`,
    "",
    `Beräknad effekt:`,
    `• Schemakvalitet: ${impact.currentScore} → ${impact.newScore}`,
    `• Konflikter: ${impact.currentConflicts} → ${impact.newConflicts}`,
    `• Brutna önskemål: ${impact.currentBroken} → ${impact.newBroken}`,
    "",
    `Risknivå: ${impact.riskLevel}`,
    `Risk: ${card.risk}`,
    "",
    "Min rekommendation: granska bemanningen i samma avdelning och vecka innan du applicerar ändringen.",
  ].join("\n");
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

    if (!deviations.length) {
      return "Jag hittar inga konflikter eller avvikelser just nu.";
    }

    return `De största konflikterna jag ser är:\n${deviations
      .slice(0, 8)
      .map((d, i) => `${i + 1}. ${d.category || d.severity}: ${d.message}`)
      .join("\n")}`;
  }

  if (q.includes("kväll")) {
    return `De som jobbar flest kvällar är:\n${formatList(
      topBy(rows, "evenings"),
      "evenings",
      " kvällspass"
    )}`;
  }

  if (q.includes("helg")) {
    return `De som jobbar flest helger är:\n${formatList(
      topBy(rows, "weekends"),
      "weekends",
      " helgpass"
    )}`;
  }

  if (q.includes("underbemanning") || q.includes("bemanning")) {
    const under = (diagnostics.deviations || []).filter(
      (d) => d.category === "Underbemanning"
    );

    if (!under.length) {
      return "Jag hittar ingen underbemanning i diagnosen.";
    }

    return `Underbemanning jag hittar:\n${under
      .map((d, i) => `${i + 1}. ${d.message}`)
      .join("\n")}`;
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

  const person = rows.find((r) =>
    q.includes(normalize(r.employeeName)) ||
    normalize(r.employeeName)
      .split(" ")
      .some((part) => q.includes(part))
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
    ]
      .filter(Boolean)
      .join("\n");
  }

function applySuggestion(card) {
  if (!generated || !setGenerated) return;

  const updated = structuredClone(generated);
  let changed = false;

  updated.rows.forEach((row) => {
    const stats = personStats(row);

    // minska kvällsbelastning
    if (
      card.title.toLowerCase().includes("kväll") &&
      stats.evenings >= 5
    ) {
      const eveningShift = row.assignments.find(
  (a) => a.code === "K" && !a.locked
);
      );

      if (eveningShift && !changed) {
        eveningShift.code = "D";
        eveningShift.label = "Dag";
        eveningShift.start = "08:00";
        eveningShift.end = "17:00";
        eveningShift.hours = 8;
        eveningShift.manuallyEdited = true;

        changed = true;
      }
    }

    // minska helgbelastning
    if (
      card.title.toLowerCase().includes("helg") &&
      stats.weekends >= 3
    ) {
      const weekendShift = row.assignments.find(
  (a) => a.code === "H" && !a.locked
);
      );

      if (weekendShift && !changed) {
        weekendShift.code = "L";
        weekendShift.label = "Ledig";
        weekendShift.hours = 0;
        weekendShift.start = "";
        weekendShift.end = "";
        weekendShift.manuallyEdited = true;

        changed = true;
      }
    }
  });

  setGenerated(updated);

  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      text:
        changed
          ? `Jag har applicerat förslaget "${card.title}". Kontrollera veckovyn och kör gärna ny analys.`
          : "Jag kunde inte applicera förändringen automatiskt ännu.",
    },
  ]);
}
  
  return "Jag kan hjälpa dig med schemakvalitet, konflikter, helger, kvällar, underbemanning och förbättringsförslag.";
}
export default function StaffingCopilotBackend({
  generated,
  preferences,
  setGenerated
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hej, det är Eva. Jag kan hjälpa dig analysera schemat, hitta konflikter och föreslå förbättringar.",
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [actionCards, setActionCards] = useState([]);
const [reviewedAction, setReviewedAction] = useState(null);
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
      if (
  normalize(question).includes("förslag") ||
  normalize(question).includes("förbättra") ||
  normalize(question).includes("åtgärd") ||
  normalize(question).includes("ändra")
) {
  setActionCards(findActionSuggestions(generated));
}
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

     {actionCards.length > 0 && (
  <div className="eva-action-panel">
    <div className="section-title">Evas åtgärdsförslag</div>

    <div className="eva-action-grid">
      {actionCards.map((card, index) => (
        <div key={index} className="eva-action-card">
          <div className="eva-action-kicker">
            Förslag {index + 1}
          </div>

          <div className="eva-action-title">
            {card.title}
          </div>

          <div className="muted small">
            <strong>Åtgärd:</strong> {card.action}
          </div>

          <div className="muted small">
            <strong>Effekt:</strong> {card.effect}
          </div>

          <div className="muted small">
            <strong>Risk:</strong> {card.risk}
          </div>

          <button
            type="button"
            className="btn ghost"
           onClick={() => {
  const review = formatSuggestionReview(card, generated);
  setReviewedAction({ ...card, review });

  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      text: review,
    },
  ]);
}}
          >
            Granska
          </button>
          <button
  type="button"
  className="btn primary"
  onClick={() => applySuggestion(card)}
>
  Applicera
</button>
        </div>
      ))}
    </div>
  </div>
)}
      {reviewedAction && (
  <div className="eva-review-panel">
    <div className="eva-action-kicker">Konsekvensanalys</div>
    <div className="eva-action-title">{reviewedAction.title}</div>
    <div className="muted small" style={{ whiteSpace: "pre-wrap" }}>
      {reviewedAction.review}
    </div>
  </div>
)}
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
