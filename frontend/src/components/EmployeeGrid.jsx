import React, { useMemo } from "react";

const departments = ["Kassa", "Färg", "Järn"];

function validateEmployees(employees = []) {
  const rowErrors = {};
  const summary = [];

  const departmentCounts = employees.reduce((acc, emp) => {
    const dept = emp.department || "Okänd";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  departments.forEach((dept) => {
    if ((departmentCounts[dept] || 0) < 1) {
      summary.push(`Avdelningen ${dept} saknar medarbetare.`);
    }
  });

  employees.forEach((emp, index) => {
    const errors = [];

    if (!emp.name || !emp.name.trim()) {
      errors.push("Namn saknas");
    }

    if (!departments.includes(emp.department)) {
      errors.push("Ogiltig avdelning");
    }

    if (emp.employmentPct == null || Number.isNaN(Number(emp.employmentPct))) {
      errors.push("Sysselsättningsgrad saknas");
    } else {
      const pct = Number(emp.employmentPct);
      if (pct <= 0) errors.push("Sysselsättningsgrad måste vara över 0%");
      if (pct > 100) errors.push("Sysselsättningsgrad kan inte överstiga 100%");
      if (pct < 50) errors.push("Sysselsättningsgrad är mycket låg");
    }

    if (emp.eveningOnly && emp.department === "Järn") {
      errors.push("Kväll-only på Järn bör kontrolleras särskilt");
    }

    if (emp.eveningOnly && Number(emp.employmentPct) === 100) {
      errors.push("Kväll-only med 100% bör kontrolleras mot arbetstidsregler");
    }

    if (errors.length) rowErrors[index] = errors;
  });

  return {
    rowErrors,
    summary,
    hasErrors: Object.keys(rowErrors).length > 0 || summary.length > 0,
  };
}

export default function EmployeeGrid({ employees, setEmployees }) {
  const validation = useMemo(() => validateEmployees(employees), [employees]);

  function updateEmployee(index, field, value) {
    const updated = [...employees];
    updated[index] = { ...updated[index], [field]: value };
    setEmployees(updated);
  }

  function addRow() {
    setEmployees((prev) => [
      ...prev,
      {
        id: `emp_${Date.now()}`,
        name: "",
        department: "Kassa",
        employmentPct: 100,
        eveningOnly: false,
      },
    ]);
  }

  function removeRow(index) {
    const updated = employees.filter((_, i) => i !== index);
    setEmployees(updated);
  }

  return (
    <div className="card">
      <div className="section-title">Medarbetare (redigerbar)</div>
      <div className="muted">Redigera direkt i tabellen. Varningar visas direkt när något ser fel ut.</div>

      {validation.summary.length > 0 && (
        <div className="validation-summary top-gap">
          {validation.summary.map((msg, i) => (
            <div key={i} className="alert-card">
              <span className="dot warning"></span>
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid-table top-gap">
        <div className="grid-header">
          <div>Namn</div>
          <div>Avdelning</div>
          <div>%</div>
          <div>Kväll</div>
          <div></div>
        </div>

        {employees.map((emp, i) => {
          const rowHasErrors = !!validation.rowErrors[i];
          return (
            <div key={emp.id || i} className={`grid-row-wrap ${rowHasErrors ? "has-errors" : ""}`}>
              <div className="grid-row">
                <input
                  value={emp.name || ""}
                  onChange={(e) => updateEmployee(i, "name", e.target.value)}
                  placeholder="Namn"
                />

                <select
                  value={emp.department || "Kassa"}
                  onChange={(e) => updateEmployee(i, "department", e.target.value)}
                >
                  {departments.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>

                <input
                  type="number"
                  value={emp.employmentPct ?? 100}
                  onChange={(e) => updateEmployee(i, "employmentPct", Number(e.target.value))}
                />

                <div className="grid-check">
                  <input
                    type="checkbox"
                    checked={!!emp.eveningOnly}
                    onChange={(e) => updateEmployee(i, "eveningOnly", e.target.checked)}
                  />
                </div>

                <button className="grid-delete-btn" onClick={() => removeRow(i)}>✕</button>
              </div>

              {validation.rowErrors[i] && (
                <div className="row-validation-list">
                  {validation.rowErrors[i].map((err, idx) => (
                    <div key={idx} className="row-validation-item">
                      <span className="dot warning"></span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="top-gap employee-grid-actions">
        <button className="btn primary" onClick={addRow}>+ Lägg till medarbetare</button>
        {validation.hasErrors ? (
          <div className="validation-badge warning">Validering kräver åtgärd</div>
        ) : (
          <div className="validation-badge ok">Inga valideringsfel</div>
        )}
      </div>
    </div>
  );
}
