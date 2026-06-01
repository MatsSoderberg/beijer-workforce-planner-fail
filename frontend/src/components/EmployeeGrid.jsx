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

    if (!emp.name || !emp.name.trim()) errors.push("Namn saknas");
    if (!departments.includes(emp.department)) errors.push("Ogiltig avdelning");

    const pct = Number(emp.employmentPct);
    if (Number.isNaN(pct)) {
      errors.push("Sysselsättningsgrad saknas");
    } else {
      if (pct <= 0) errors.push("Sysselsättningsgrad måste vara över 0%");
      if (pct > 100) errors.push("Sysselsättningsgrad kan inte överstiga 100%");
      if (pct < 50) errors.push("Sysselsättningsgrad är mycket låg");
    }

    if (emp.eveningOnly && emp.department === "Järn") {
      errors.push("Kväll-only på Järn bör kontrolleras särskilt");
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
  const validation = useMemo(
    () => validateEmployees(employees),
    [employees]
  );

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
    setEmployees(employees.filter((_, i) => i !== index));
  }

  return (
    <div className="card">
      <div className="section-title">Medarbetare</div>
      <div className="muted">
        Redigera personalstyrkan. Detta styr schemagenereringen, önskemål och bemanningslogiken.
      </div>

      {validation.summary.length > 0 && (
        <div className="top-gap">
          {validation.summary.map((msg, i) => (
            <div key={i} className="alert-card warning">
              <span className="dot warning"></span>
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      <div className="employee-card-grid top-gap">
        {employees.map((emp, i) => {
          const rowHasErrors = !!validation.rowErrors[i];

          return (
            <div
              key={emp.id || i}
              className={`employee-edit-card ${rowHasErrors ? "has-errors" : ""}`}
            >
              <div className="employee-edit-header">
                <div>
                  <div className="employee-edit-name">
                    {emp.name || "Ny medarbetare"}
                  </div>
                  <div className="muted small">
                    {emp.department || "Ej vald"} · {emp.employmentPct ?? 100}%
                    {emp.eveningOnly ? " · kväll endast" : ""}
                  </div>
                </div>

                <button
                  type="button"
                  className="grid-delete-btn"
                  onClick={() => removeRow(i)}
                  aria-label="Ta bort medarbetare"
                >
                  ×
                </button>
              </div>

              <div className="employee-form-grid">
                <label>
                  <span>Namn</span>
                  <input
                    className="pref-input"
                    value={emp.name || ""}
                    onChange={(e) =>
                      updateEmployee(i, "name", e.target.value)
                    }
                    placeholder="Namn"
                  />
                </label>

                <label>
                  <span>Avdelning</span>
                  <select
                    className="pref-input"
                    value={emp.department || "Kassa"}
                    onChange={(e) =>
                      updateEmployee(i, "department", e.target.value)
                    }
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Sysselsättning %</span>
                  <input
                    className="pref-input"
                    type="number"
                    min="1"
                    max="100"
                    value={emp.employmentPct ?? 100}
                    onChange={(e) =>
                      updateEmployee(
                        i,
                        "employmentPct",
                        Number(e.target.value)
                      )
                    }
                  />
                </label>

                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={!!emp.eveningOnly}
                    onChange={(e) =>
                      updateEmployee(i, "eveningOnly", e.target.checked)
                    }
                  />
                  <span>Kväll endast</span>
                </label>
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
        <button className="btn primary" type="button" onClick={addRow}>
          + Lägg till medarbetare
        </button>

        {validation.hasErrors ? (
          <div className="validation-badge warning">
            Validering kräver åtgärd
          </div>
        ) : (
          <div className="validation-badge ok">
            Inga valideringsfel
          </div>
        )}
      </div>
    </div>
  );
}
