import React, { useEffect, useState } from 'react';

const stepOrder = ['store', 'period', 'staffing', 'rules', 'generate', 'review', 'publish'];

const STORAGE_KEY = 'beijer_wizard_nacka_v1';

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

export default function EditableSchedulingWizard() {
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

  async function next() {
    if (key === 'generate') {
      setLoading(true);
      setTimeout(() => {
        const generated = {
          metadata: {
            generatedAt: new Date().toISOString(),
            period: state.period,
            staffing: state.staffing,
            rules: state.rules,
            status: 'generated',
          },
        };
        persist({ ...state, latestGenerated: generated, currentStep: Math.min(state.currentStep + 1, stepOrder.length - 1) });
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
    persist({ ...state, latestGenerated: { ...(state.latestGenerated || {}), publishedAt: new Date().toISOString(), status: 'published' } });
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
    ),
    rules: (
      <div className="stack">
        <label className="rule-card spread"><span>Markera svenska röda dagar</span><input type="checkbox" checked={state.rules.markRedDays} onChange={(e) => persist({ ...state, rules: { ...state.rules, markRedDays: e.target.checked } })} /></label>
        <label className="rule-card spread"><span>Optimera kvällar</span><input type="checkbox" checked={state.rules.optimizeEvenings} onChange={(e) => persist({ ...state, rules: { ...state.rules, optimizeEvenings: e.target.checked } })} /></label>
        <label className="rule-card spread"><span>Ta hänsyn till personliga önskemål</span><input type="checkbox" checked={state.rules.honorPreferences} onChange={(e) => persist({ ...state, rules: { ...state.rules, honorPreferences: e.target.checked } })} /></label>
      </div>
    ),
    generate: (
      <div className="card callout shimmer">
        <div className="section-title">Generera schema</div>
        <div className="muted">Wizarden är nu redigerbar och sparbar. Nästa steg genererar ett schemautkast baserat på vald period och bemanning.</div>
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
