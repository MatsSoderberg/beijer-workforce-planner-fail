import { loadRulePackages, saveRulePackage, deleteRulePackage } from '../lib/rulePackageApi';
import React, { useEffect, useMemo, useState } from 'react';
import EmployeeGrid from './EmployeeGrid';
import { generateScheduleFromBackend, generateScheduleFallback } from '../lib/scheduleApi';
import { importRulesFromText, mergeImportedPreferences } from '../lib/importRulesFromText';

const stepOrder = ['store', 'period', 'staffing', 'rules', 'generate', 'review', 'publish'];
const STORAGE_KEY = 'beijer_wizard_nacka_v6';

const defaultState = {
  currentStep: 0,
  store: { name: 'Beijer Nacka' },
  period: { startDate: '2026-09-01', endDate: '2026-12-31' },
  staffing: {
    weekday: { Kassa: 2, Farg: 1, Jarn: 2 },
    weekend: { Kassa: 1, Farg: 1, Jarn: 1 },
  },
  rules: {
    markRedDays: true,
    optimizeEvenings: true,
    honorPreferences: true,
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

function mapPreferences(preferences = {}) {
  return Object.entries(preferences).map(([employeeId, pref]) => ({
    employeeId,
    preferredOffDays: pref?.preferredOffDays || [],
    preferredWorkDays: pref?.preferredWorkDays || [],
    fixedTimeOff: pref?.fixedTimeOff || [],
    notes: pref?.notes || '',
    importedRuleTags: pref?.importedRuleTags || {},
  }));
}

export default function EditableSchedulingWizard({
  employees = [],
  setEmployees,
  preferences = {},
  setPreferences,
  onGenerated,
}) {
  const [state, setState] = useState(defaultState);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [importText, setImportText] = useState('');
  const [importPackageName, setImportPackageName] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importedRulePackages, setImportedRulePackages] = useState([]);

  useEffect(() => {
  async function loadPackages() {
    try {
      const packages = await loadRulePackages();
      setImportedRulePackages(packages.map((p) => p.payload || p));
    } catch (err) {
      console.warn('Could not load rule packages', err);
    }
  }

  loadPackages();
}, []);

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

  async function handleImportRules() {
  const result = importRulesFromText(importText, employees, importPackageName);

  setImportResult(result);
  setImportedRulePackages((prev) => [...prev, result]);

  if (setPreferences) {
    setPreferences((prev) => mergeImportedPreferences(prev, result.preferencesPatch));
  }

  try {
    await saveRulePackage(result);
  } catch (err) {
    console.warn('Could not save rule package', err);
  }

  setImportText('');
  setImportPackageName('');

  setSaveMessage(`Importerade ${result.name}: ${result.employeeRules.length} individuella regler`);
  setTimeout(() => setSaveMessage(''), 1800);
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

      try {
        const payload = {
          employees: employees.map((e) => ({
            id: e.id,
            name: e.name || 'Namnlös medarbetare',
            department: e.department,
            eveningOnly: !!e.eveningOnly,
            employmentPct: Number(e.employmentPct || 100),
            contractHours: Math.round(40 * (Number(e.employmentPct || 100) / 100)),
          })),
          preferences: mapPreferences(preferences),
          startDate: state.period.startDate,
          endDate: state.period.endDate,
          rules: {
            staffingWeekday: {
              Kassa: state.staffing.weekday.Kassa,
              Färg: state.staffing.weekday.Farg,
              Järn: state.staffing.weekday.Jarn,
            },
            staffingWeekend: {
              Kassa: state.staffing.weekend.Kassa,
              Färg: state.staffing.weekend.Farg,
              Järn: state.staffing.weekend.Jarn,
            },
            markRedDays: state.rules.markRedDays,
            optimizeEvenings: state.rules.optimizeEvenings,
            honorPreferences: state.rules.honorPreferences,
            importedRulePackages,
          },
        };

        let generated;
        try {
          generated = await generateScheduleFromBackend(payload);
        } catch {
          generated = generateScheduleFallback(payload);
        }

        generated.metadata = {
          ...(generated.metadata || {}),
          employeeCount: employees.length,
          departments: employeeStats,
          preferenceCount: Object.keys(preferences || {}).length,
          importedRulePackages: importedRulePackages.length,
        };

        const nextState = {
          ...state,
          latestGenerated: generated,
          currentStep: Math.min(state.currentStep + 1, stepOrder.length - 1),
        };

        persist(nextState);
        if (onGenerated) onGenerated(generated);
      } finally {
        setLoading(false);
      }

      return;
    }

    persist({
      ...state,
      currentStep: Math.min(state.currentStep + 1, stepOrder.length - 1),
    });
  }

  function prev() {
    persist({
      ...state,
      currentStep: Math.max(state.currentStep - 1, 0),
    });
  }

  function publishNow() {
    const nextState = {
      ...state,
      latestGenerated: {
        ...(state.latestGenerated || {}),
        publishedAt: new Date().toISOString(),
        status: 'published',
      },
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
        <input
          className="pref-input"
          value={state.store.name}
          onChange={(e) => persist({ ...state, store: { ...state.store, name: e.target.value } })}
        />
      </div>
    ),

    period: (
      <div className="grid two">
        <div>
          <div className="section-title">Startdatum</div>
          <input
            className="pref-input"
            type="date"
            value={state.period.startDate}
            onChange={(e) => persist({ ...state, period: { ...state.period, startDate: e.target.value } })}
          />
        </div>
        <div>
          <div className="section-title">Slutdatum</div>
          <input
            className="pref-input"
            type="date"
            value={state.period.endDate}
            onChange={(e) => persist({ ...state, period: { ...state.period, endDate: e.target.value } })}
          />
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
        <label className="rule-card spread">
          <span>Markera svenska röda dagar</span>
          <input type="checkbox" checked={state.rules.markRedDays} onChange={(e) => persist({ ...state, rules: { ...state.rules, markRedDays: e.target.checked } })} />
        </label>

        <label className="rule-card spread">
          <span>Optimera kvällar</span>
          <input type="checkbox" checked={state.rules.optimizeEvenings} onChange={(e) => persist({ ...state, rules: { ...state.rules, optimizeEvenings: e.target.checked } })} />
        </label>

        <label className="rule-card spread">
          <span>Ta hänsyn till personliga önskemål</span>
          <input type="checkbox" checked={state.rules.honorPreferences} onChange={(e) => persist({ ...state, rules: { ...state.rules, honorPreferences: e.target.checked } })} />
        </label>

        <div className="card feature-card compact">
          <div className="section-title">Importera schemaönskemål</div>
          <div className="muted">
            Klistra in text från dokumentet. Systemet delar upp innehållet i avdelningsregler,
            individuella önskemål och generella regler.
          </div>

          <input
            className="pref-input"
            style={{ marginTop: 12 }}
            value={importPackageName}
            onChange={(e) => setImportPackageName(e.target.value)}
            placeholder="Namn på regelpaket, t.ex. Färg/Järn eller Kassa"
          />

          <textarea
            className="pref-input"
            style={{ minHeight: 180, marginTop: 12 }}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Klistra in schemaönskemål här..."
          />

          <button className="btn primary" onClick={handleImportRules} style={{ marginTop: 12 }}>
            Importera schemaönskemål
          </button>

          {importResult ? (
            <div className="top-gap">
              <div className="save-pill">
                {importResult.employeeRules.length} individuella regler ·{' '}
                {importResult.departmentRules.length} avdelningsregler ·{' '}
                {importResult.generalRules.length} generella regler
              </div>
            </div>
          ) : null}

          {importedRulePackages.length > 0 ? (
            <div className="top-gap">
              <div className="section-title">Aktiva regelpaket</div>
              {importedRulePackages.map((pkg) => (
                <div key={pkg.id} className="rule-card spread">
                  <span>
                    {pkg.name} · {pkg.department} · {pkg.employeeRules.length} individuella regler
                  </span>
                  <button
                    className="btn ghost"
                    onClick={async () => {
  setImportedRulePackages((prev) => prev.filter((p) => p.id !== pkg.id));

  try {
    await deleteRulePackage(pkg.id);
  } catch (err) {
    console.warn('Could not delete rule package', err);
  }
}}
                  >
                    Ta bort
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    ),

    generate: (
      <div className="stack">
        <div className="card callout shimmer">
          <div className="section-title">Generera schema</div>
          <div className="muted">
            Nu skickas medarbetare, preferenser och aktiva regelpaket till genereringen.
          </div>
        </div>

        <div className="grid four">
          <div className="card feature-card compact"><div className="eyebrow">Medarbetare</div><div className="panel-value">{employeeStats.total}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Preferenser</div><div className="panel-value">{Object.keys(preferences || {}).length}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Färg</div><div className="panel-value">{employeeStats.farg}</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Järn</div><div className="panel-value">{employeeStats.jarn}</div></div>
        </div>

        {importedRulePackages.length > 0 ? (
          <div className="card feature-card compact">
            <div className="section-title">Aktiva regelpaket</div>
            <div className="muted">
              {importedRulePackages.length} regelpaket följer med till genereringen.
            </div>
          </div>
        ) : null}
      </div>
    ),

    review: (
      <div className="stack">
        <div className="section-title">Granska resultat</div>
        <pre className="pref-input" style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(state.latestGenerated?.metadata || { message: 'Inget schema genererat ännu' }, null, 2)}
        </pre>
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
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${((state.currentStep + 1) / stepOrder.length) * 100}%` }} />
          </div>
          <div className="muted small">Steg {state.currentStep + 1} av {stepOrder.length}</div>
        </div>

        <div className="step-list">
          {stepOrder.map((name, idx) => (
            <button
              key={name}
              className={`step-item ${idx === state.currentStep ? 'active' : ''}`}
              onClick={() => persist({ ...state, currentStep: idx })}
            >
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
          <button className="btn ghost" disabled={state.currentStep === 0} onClick={prev}>
            ← Tillbaka
          </button>

          <button className="btn primary" disabled={loading} onClick={next}>
            {loading ? 'Genererar...' : key === 'publish' ? 'Klar' : 'Nästa steg →'}
          </button>
        </div>
      </section>
    </div>
  );
}
