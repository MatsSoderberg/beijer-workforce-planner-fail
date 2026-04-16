
import React, { useState } from "react";
import { DAYS } from "../lib/preferenceTypes";

export default function PersonalPreferencesForm({ employeeName = "Medarbetare", value, onSave }) {
  const [form, setForm] = useState(
    value || {
      preferredOffDays: [],
      preferredWorkDays: [],
      fixedTimeOff: [],
      notes: "",
    }
  );

  function toggle(listName, key) {
    const set = new Set(form[listName] || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    setForm({ ...form, [listName]: Array.from(set) });
  }

  return (
    <div className="preferences-form">
      <h3>Personliga önskemål – {employeeName}</h3>

      <div className="pref-block">
        <div className="pref-label">Önskade lediga dagar</div>
        <div className="pref-grid">
          {DAYS.map((d) => (
            <label key={d.key}>
              <input
                type="checkbox"
                checked={(form.preferredOffDays || []).includes(d.key)}
                onChange={() => toggle("preferredOffDays", d.key)}
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pref-block">
        <div className="pref-label">Önskade arbetsdagar</div>
        <div className="pref-grid">
          {DAYS.map((d) => (
            <label key={d.key}>
              <input
                type="checkbox"
                checked={(form.preferredWorkDays || []).includes(d.key)}
                onChange={() => toggle("preferredWorkDays", d.key)}
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pref-block">
        <div className="pref-label">Fasta ledigheter (datum)</div>
        <input
          type="text"
          placeholder="Ex: 2026-09-14, 2026-10-02"
          value={(form.fixedTimeOff || []).join(", ")}
          onChange={(e) =>
            setForm({
              ...form,
              fixedTimeOff: e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="pref-block">
        <div className="pref-label">Notering</div>
        <textarea
          rows={4}
          placeholder="Ex: Jag önskar helst ledig måndagar p.g.a. privat åtagande."
          value={form.notes || ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <button onClick={() => onSave?.(form)}>Spara önskemål</button>
    </div>
  );
}
