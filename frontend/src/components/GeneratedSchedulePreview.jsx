import React from 'react';

export default function GeneratedSchedulePreview({ generated }) {
  if (!generated?.rows?.length) {
    return (
      <div className="card">
        <div className="section-title">Genererat schema</div>
        <div className="muted">Inget schema genererat ännu.</div>
      </div>
    );
  }

  const rows = generated.rows.slice(0, 8);
  const firstDates = rows[0]?.assignments?.slice(0, 7) || [];

  return (
    <div className="card">
      <div className="section-title">Genererat schema</div>
      <div className="muted">Förhandsvisning med exakta tider i passrutorna.</div>

      <div className="schedule-wrap top-gap">
        <div className="schedule-head">
          <div>Medarbetare</div>
          {firstDates.map((a) => <div key={a.date}>{a.weekdayLabel}<br />{a.date.slice(5)}</div>)}
          <div>Timmar</div>
          <div>Avd.</div>
        </div>

        {rows.map((row) => (
          <div key={row.employeeId} className="schedule-row">
            <div className="employee-card">
              <div className="employee-name">{row.employeeName}</div>
              <div className="muted small">{row.department}</div>
            </div>

            {row.assignments.slice(0, 7).map((a) => (
              <div key={a.date} className={`pass-pill pass-${a.code.toLowerCase()}`}>
                <div>{a.code}</div>
                <div className="pass-time-mini">{a.startTime && a.endTime ? `${a.startTime}-${a.endTime}` : 'Ledig'}</div>
              </div>
            ))}

            <div className="metric-card">{row.totals?.hours ?? 0}</div>
            <div className="metric-card">{row.department}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
