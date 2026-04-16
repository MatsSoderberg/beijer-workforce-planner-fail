import React, { useEffect, useState } from 'react';

const DAYS = [
  { key: 'monday', label: 'Måndag' },
  { key: 'tuesday', label: 'Tisdag' },
  { key: 'wednesday', label: 'Onsdag' },
  { key: 'thursday', label: 'Torsdag' },
  { key: 'friday', label: 'Fredag' },
  { key: 'saturday', label: 'Lördag' },
  { key: 'sunday', label: 'Söndag' },
];

const emptyValue = {
  preferredOffDays: [],
  preferredWorkDays: [],
  fixedTimeOff: [],
  notes: '',
};

export default function PersonalPreferencesForm({ employeeName = 'Medarbetare', value, onSave }) {
  const [form, setForm] = useState(value || emptyValue);

  useEffect(() => {
    setForm(value || emptyValue);
  }, [value, employeeName]);

  function toggle(listName, key) {
    const current = new Set(form[listName] || []);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    setForm({ ...form, [listName]: Array.from(current) });
  }

  return (
    <div className="preferences-form">
      <div className="pref-block">
        <div className="pref-title">Personliga önskemål – {employeeName}</div>
        <div className="muted">Lägg in mjuka önskemål som schemamotorn ska försöka ta hänsyn till.</div>
      </div>

      <div className="pref-block">
        <div className="pref-label">Önskade lediga dagar</div>
        <div className="pref-grid">
          {DAYS.map((d) => (
            <label key={d.key} className="pref-chip">
              <input
                type="checkbox"
                checked={(form.preferredOffDays || []).includes(d.key)}
                onChange={() => toggle('preferredOffDays', d.key)}
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
            <label key={d.key} className="pref-chip">
              <input
                type="checkbox"
                checked={(form.preferredWorkDays || []).includes(d.key)}
                onChange={() => toggle('preferredWorkDays', d.key)}
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pref-block">
        <div className="pref-label">Fasta ledigheter (datum)</div>
        <input
          className="pref-input"
          type="text"
          placeholder="Ex: 2026-09-14, 2026-10-02"
          value={(form.fixedTimeOff || []).join(', ')}
          onChange={(e) =>
            setForm({
              ...form,
              fixedTimeOff: e.target.value
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="pref-block">
        <div className="pref-label">Notering</div>
        <textarea
          className="pref-input pref-textarea"
          rows={4}
          placeholder="Ex: Jag önskar helst ledig måndagar p.g.a. privat åtagande."
          value={form.notes || ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <div className="pref-actions">
        <button className="btn primary" onClick={() => onSave?.(form)}>Spara önskemål</button>
      </div>
    </div>
  );
}
