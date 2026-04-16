import React from "react";

export default function ScheduleDiagnosticsPanel({ diagnostics }) {
  if (!diagnostics) {
    return (
      <div className="card">
        <div className="section-title">Avvikelser & diagnostik</div>
        <div className="muted">Ingen körning ännu.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-title">Avvikelser & diagnostik</div>
      <div className="muted">Verklig output från schemamotorn.</div>

      <div className="grid three top-gap">
        <div className="card feature-card compact">
          <div className="eyebrow">Hårda regelbrott</div>
          <div className="panel-value">{diagnostics.summary?.hardRuleViolations ?? 0}</div>
        </div>
        <div className="card feature-card compact">
          <div className="eyebrow">Preferenskonflikter</div>
          <div className="panel-value">{diagnostics.summary?.preferenceConflicts ?? 0}</div>
        </div>
        <div className="card feature-card compact">
          <div className="eyebrow">Röda dagar</div>
          <div className="panel-value">{diagnostics.summary?.holidayAdjustedDays ?? 0}</div>
        </div>
      </div>

      <div className="stack top-gap">
        {(diagnostics.deviations || []).slice(0, 8).map((d, idx) => (
          <div className="alert-card" key={idx}>
            <span className={`dot ${d.severity === "high" ? "warning" : d.severity === "medium" ? "warning" : "ok"}`}></span>
            <span>{d.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
