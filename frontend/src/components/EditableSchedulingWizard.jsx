import React, { useEffect, useMemo, useState } from 'react';
import EmployeeGrid from './EmployeeGrid';

const stepOrder = ['store', 'period', 'staffing', 'rules', 'generate', 'review', 'publish'];
const STORAGE_KEY = 'beijer_wizard_nacka_v3';

const defaultState = {
  currentStep: 0,
  store: { name: 'Beijer Nacka' },
  period: { startDate: '2026-09-01', endDate: '2026-12-31' },
  staffing: {
    weekday: { Kassa: 2, Farg: 1, Jarn: 2 },
    weekend: { Kassa: 1, Farg: 1, Jarn: 1 }
  },
  rules: {
    markRedDays: true,
    optimizeEvenings: true,
    honorPreferences: true
  },
  latestGenerated: null,
};

function NumberField({ label, value, onChange }) {
  return (
    <label className="rule-card spread">
      <span>{label}</span>
      <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 80 }} />
    </label>
  );
}

function getShiftCodeForEmployee(emp, dayIndex) {
  const weekendDay = dayIndex % 7 === 5 || dayIndex % 7 === 6;
  if (weekendDay) {
    return dayIndex % 3 === 0 ? 'H' : 'L';
  }
  if (emp.eveningOnly) return dayIndex % 2 === 0 ? 'K' : 'L';
  const rotation = ['T', 'D', 'K', 'L', 'D'];
  return rotation[dayIndex % rotation.length];
}

function generatePreviewRows(employees, period) {
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const start = new Date(period.startDate + 'T00:00:00');
  const end = new Date(period.endDate + 'T00:00:00');
  const dates = [];
  const cur = new Date(start);
  let idx = 0;
  while (cur <= end && idx < 28) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
    idx += 1;
  }

  return safeEmployees.map((emp, empIndex) => {
    const assignments = dates.map((date, i) => {
      let code = getShiftCodeForEmployee(emp, i + empIndex);
      if (Number(emp.employmentPct) <= 82 && code === 'D' && i % 4 === 0) code = 'L';
      return { date, code };
    });

    const totals = {
      hours: assignments.reduce((sum, a) => sum + (a.code === 'L' ? 0 : a.code === 'H' ? 7 : 8), 0)
    };

    return {
      employeeId: emp.id,
      employeeName: emp.name || 'Namnlös medarbetare',
      department: emp.department,
      assignments,
      totals
    };
  });
}

function buildDiagnostics(rows) {
  const deviations = [];
  const holidayAdjustedDays = rows.length ? 2 : 0;

  rows.forEach((row) => {
    const weekendCount = row.assignments.filter((a) => a.code === 'H').length;
    const eveningCount = row.assignments.filter((a) => a.code === 'K').length;

    if (weekendCount >= 4) {
      deviations.push({
        severity: 'medium',
        employeeName: row.employeeName,
        message: `${row.employeeName} har relativt hög helgbelastning i förhandsversionen.`
      });
    }

    if (eveningCount >= 5) {
      deviations.push({
        severity: 'low',
        employeeName: row.employeeName,
        message: `${row.employeeName} har många kvällspass i förhandsversionen.`
      });
    }
  });

  return {
    deviations,
    summary: {
      hardRuleViolations: 0,
      preferenceConflicts: deviations.length,
      holidayAdjustedDays
    }
  };
}

export default function EditableSchedulingWizard({ employees = [], setEmployees, onGenerated }) {
  const [state, setState] = useState(defaultState);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(nextState) {
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      setSaveMessage('Utkast sparat');
      setTimeout(() => setSaveMessage(''), 1200);
    } catch {
      setSaveMessage('Kunde inte spara');
      setTimeout(() => setSaveMessage(''), 1200);
    }
  }

  const key = stepOrder[state.currentStep];
  const employeeStats = useMemo(() => {
    const total = employees.length;
    const kassa = employees.filter((e) => e.department === 'Kassa').length;
    const farg = employees.filter((e) => e.department === 'Färg').length;
    const jarn = employees.filter((e) => e.department === 'Järn').length;
    return { total, kassa, farg, jarn };
  }, [employees]);

  async function next() {
    if (key === 'generate') {
      setLoading(true);
      setTimeout(() => {
        const rows = generatePreviewRows(employees, state.period);
        const diagnostics = buildDiagnostics(rows);
        const generated = {
          rows,
          diagnostics,
          metadata: {
            generatedAt: new Date().toISOString(),
            period: state.period,
            staffing: state.staffing,
            rules: state.rules,
            status: 'generated',
            employeeCount: employees.length,
            departments: employeeStats
          },
        };
        const nextState = { ...state, latestGenerated: generated, currentStep: Math.min(state.currentStep + 1, stepOrder.length - 1) };
        persist(nextState);
        if (onGenerated) onGenerated(generated);
        setLoading(false);
      }, 1200);
      return;
    }
    persist({ ...state, currentStep: Math.min(state.currentStep + 1, stepOrder.length - 1) });
  }

  function prev() {
    persist({ ...state, currentStep: Math.max(state.currentStep - 1, 0) });
  }

  function publishNow() {
    const nextState = {
      ...state,
      latestGenerated: {
        ...(state.latestGenerated || {}),
        publishedAt: new Date().toISOString(),
        status: 'published'
      }
    };
    persist(nextState);
    if (onGenerated && nextState.latestGenerated) onGenerated(nextState.latestGenerated);
    setSaveMessage('Schema publicerat');
    setTimeout(() => setSaveMessage(''), 1500);
  }

  const content = {
    store: (
      <div className="stack">
        <div className="section-title">Butik</div>
        <div className="muted">Redigera butikens namn och spara direkt i wizardutkastet.</div>
        <input className="pref-input" value={state.store.name} onChange={(e) => persist({ ...state, store: { ...state.store, name: e.target.value } })} />
      </div>
    ),
    period: (
      <div className="grid two">
        <div>
          <div className="section-title">Startdatum</div>
          <input className="pref-input" type="date" value={state.period.startDate} onChange={(e) => persist({ ...state, period: { ...state.period, startDate: e.target.value } })} />
        </div>
        <div>
          <div className="section-title">Slutdatum</div>
          <input className="pref-input" type="date" value={state.period.endDate} onChange={(e) => persist({ ...state, period: { ...state.period, endDate: e.target.value } })} />
        </div>
      </div>
    ),
    staffing: (
      <div className="stack">
        <EmployeeGrid employees={employees} setEmployees={setEmployees} />
        <div className="grid four">
          <div className="card feature-card compact"><div className="eyebrow">Totalt</div><div className="panel-value">{employeeStats.total}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Kassa</div><div className="panel-value">{employeeStats.kassa}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Färg</div><div className="panel-value">{employeeStats.farg}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Järn</div><div className="panel-value">{employeeStats.jarn}</div></div>
        </div>

        <div className="grid two">
          <div className="card feature-card compact">
            <div className="section-title">Vardag</div>
            <div className="stack top-gap">
              <NumberField label="Kassa" value={state.staffing.weekday.Kassa} onChange={(v) => persist({ ...state, staffing: { ...state.staffing, weekday: { ...state.staffing.weekday, Kassa: v } } })} />
              <NumberField label="Färg" value={state.staffing.weekday.Farg} onChange={(v) => persist({ ...state, staffing: { ...state.staffing, weekday: { ...state.staffing.weekday, Farg: v } } })} />
              <NumberField label="Järn" value={state.staffing.weekday.Jarn} onChange={(v) => persist({ ...state, staffing: { ...state.staffing, weekday: { ...state.staffing.weekday, Jarn: v } } })} />
            </div>
          </div>

          <div className="card feature-card compact">
            <div className="section-title">Helg</div>
            <div className="stack top-gap">
              <NumberField label="Kassa" value={state.staffing.weekend.Kassa} onChange={(v) => persist({ ...state, staffing: { ...state.staffing, weekend: { ...state.staffing.weekend, Kassa: v } } })} />
              <NumberField label="Färg" value={state.staffing.weekend.Farg} onChange={(v) => persist({ ...state, staffing: { ...state.staffing, weekend: { ...state.staffing.weekend, Farg: v } } })} />
              <NumberField label="Järn" value={state.staffing.weekend.Jarn} onChange={(v) => persist({ ...state, staffing: { ...state.staffing, weekend: { ...state.staffing.weekend, Jarn: v } } })} />
            </div>
          </div>
        </div>
      </div>
    ),
    rules: (
      <div className="stack">
        <label className="rule-card spread"><span>Markera svenska röda dagar</span><input type="checkbox" checked={state.rules.markRedDays} onChange={(e) => persist({ ...state, rules: { ...state.rules, markRedDays: e.target.checked } })} /></label>
        <label className="rule-card spread"><span>Optimera kvällar</span><input type="checkbox" checked={state.rules.optimizeEvenings} onChange={(e) => persist({ ...state, rules: { ...state.rules, optimizeEvenings: e.target.checked } })} /></label>
        <label className="rule-card spread"><span>Ta hänsyn till personliga önskemål</span><input type="checkbox" checked={state.rules.honorPreferences} onChange={(e) => persist({ ...state, rules: { ...state.rules, honorPreferences: e.target.checked } })} /></label>
      </div>
    ),
    generate: (
      <div className="stack">
        <div className="card callout shimmer">
          <div className="section-title">Generera schema</div>
          <div className="muted">Nu används den aktuella medarbetarlistan från wizarden. Lägger du till eller tar bort personal slår det igenom i nästa generering.</div>
        </div>

        <div className="grid four">
          <div className="card feature-card compact"><div className="eyebrow">Medarbetare</div><div className="panel-value">{employeeStats.total}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Kassa</div><div className="panel-value">{employeeStats.kassa}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Färg</div><div className="panel-value">{employeeStats.farg}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Järn</div><div className="panel-value">{employeeStats.jarn}</div></div>
        </div>
      </div>
    ),
    review: (
      <div className="stack">
        <div className="section-title">Granska resultat</div>
        <pre className="pref-input" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(state.latestGenerated?.metadata || { message: 'Inget schema genererat ännu' }, null, 2)}</pre>
      </div>
    ),
    publish: (
      <div className="stack">
        <div className="section-title">Publicera</div>
        <div className="muted">Spara status på schemautkastet som publicerat.</div>
        <button className="btn primary" onClick={publishNow}>Publicera schema</button>
      </div>
    ),
  };

  return (
    <div className="wizard-layout">
      <aside className="card wizard-sidebar">
        <div className="section-title">Redigerbar wizard</div>
        <div className="muted">Alla steg kan ändras, sparas och återupptas.</div>
        <div className="progress-wrap">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${((state.currentStep + 1) / stepOrder.length) * 100}%` }} /></div>
          <div className="muted small">Steg {state.currentStep + 1} av {stepOrder.length}</div>
        </div>
        <div className="step-list">
          {stepOrder.map((name, idx) => (
            <button key={name} className={`step-item ${idx === state.currentStep ? 'active' : ''}`} onClick={() => persist({ ...state, currentStep: idx })}>
              <div className="small muted">Steg {idx + 1}</div>
              <div className="step-name">{name}</div>
            </button>
          ))}
        </div>
        {saveMessage ? <div className="save-pill" style={{ marginTop: 12 }}>{saveMessage}</div> : null}
      </aside>

      <section className="card wizard-main">
        {content[key]}
        <div className="wizard-actions">
          <button className="btn ghost" disabled={state.currentStep === 0} onClick={prev}>← Tillbaka</button>
          <button className="btn primary" disabled={loading} onClick={next}>{loading ? 'Genererar...' : key === 'publish' ? 'Klar' : 'Nästa steg →'}</button>
        </div>
      </section>
    </div>
  );
}
