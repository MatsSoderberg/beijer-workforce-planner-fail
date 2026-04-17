import React, { useEffect, useMemo, useState } from 'react';

function getUniqueWeeks(generated) {
  const weeks = new Set();
  (generated?.rows || []).forEach((row) => {
    (row.assignments || []).forEach((a) => weeks.add(a.weekKey));
  });
  return Array.from(weeks).sort();
}

export default function WeeklyScheduleBrowser({ generated }) {
  const weeks = useMemo(() => getUniqueWeeks(generated), [generated]);
  const [selectedWeek, setSelectedWeek] = useState('');

  useEffect(() => {
    if (!selectedWeek && weeks.length) setSelectedWeek(weeks[0]);
  }, [weeks, selectedWeek]);

  if (!generated?.rows?.length) {
    return (
      <div className="card">
        <div className="section-title">Alla veckoscheman</div>
        <div className="muted">Inget schema genererat ännu.</div>
      </div>
    );
  }

  const rows = generated.rows;
  const visibleDates = rows[0]?.assignments?.filter((a) => a.weekKey === selectedWeek) || [];

  return (
    <div className="card">
      <div className="section-title">Alla veckoscheman</div>
      <div className="muted">Välj vecka och se exakta tider för alla medarbetare.</div>

      <div className="week-selector top-gap">
        <label className="muted">Vecka</label>
        <select className="pref-input" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
          {weeks.map((week) => (
            <option key={week} value={week}>{week}</option>
          ))}
        </select>
      </div>

      <div className="schedule-wrap top-gap">
        <div className="schedule-head weekly-head">
          <div>Medarbetare</div>
          {visibleDates.map((a) => <div key={a.date}>{a.weekdayLabel}<br />{a.date.slice(5)}</div>)}
        </div>

        {rows.map((row) => (
          <div key={row.employeeId} className="schedule-row weekly-row">
            <div className="employee-card">
              <div className="employee-name">{row.employeeName}</div>
              <div className="muted small">{row.department}</div>
            </div>
            {row.assignments.filter((a) => a.weekKey === selectedWeek).map((a) => (
              <div key={a.date} className={`time-cell time-${a.code.toLowerCase()}`}>
                <div className="time-code">{a.code}</div>
                <div className="time-label">{a.shiftLabel}</div>
                <div className="time-range">{a.startTime && a.endTime ? `${a.startTime}-${a.endTime}` : 'Ledig'}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
