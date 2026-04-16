import React, { useEffect, useState } from "react";
import PersonalPreferencesForm from "../components/PersonalPreferencesForm";
import { fetchPreferences, savePreferences, generateSchedule } from "../lib/scheduleApi";

export default function SchedulingAdminExample({ employees, rules, startDate, endDate }) {
  const [preferences, setPreferences] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(employees?.[0] || null);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPreferences().then(data => setPreferences(data.items || [])).catch(console.error);
  }, []);

  const selectedValue = preferences.find(p => p.employeeId === selectedEmployee?.id);

  async function handleSave(form) {
    if (!selectedEmployee) return;
    const saved = await savePreferences(selectedEmployee.id, form);
    setPreferences(prev => {
      const next = prev.filter(x => x.employeeId !== selectedEmployee.id);
      next.push(saved.item);
      return next;
    });
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateSchedule({
        employees,
        preferences,
        startDate,
        endDate,
        rules,
      });
      setGenerated(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <label>Välj medarbetare </label>
        <select
          value={selectedEmployee?.id || ""}
          onChange={(e) => setSelectedEmployee(employees.find(x => x.id === e.target.value))}
        >
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.name} – {e.department}</option>
          ))}
        </select>
      </div>

      {selectedEmployee && (
        <PersonalPreferencesForm
          employeeName={selectedEmployee.name}
          value={selectedValue}
          onSave={handleSave}
        />
      )}

      <div>
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "Genererar..." : "Generera schema med önskemål"}
        </button>
      </div>

      {generated && (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(generated.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}