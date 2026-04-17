import React, { useMemo, useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import EditableSchedulingWizard from './components/EditableSchedulingWizard';
import PersonalPreferencesForm from './components/PersonalPreferencesForm';
import StaffingCopilotBackend from './components/StaffingCopilotBackend';
import { getSession, logout } from './lib/auth';

const days = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

const defaultEmployees = [
  { id: 'david', name: 'David', department: 'Kassa', eveningOnly: false, employmentPct: 100 },
  { id: 'hakan', name: 'Håkan', department: 'Kassa', eveningOnly: false, employmentPct: 100 },
  { id: 'katarina', name: 'Katarina', department: 'Kassa', eveningOnly: false, employmentPct: 100 },
  { id: 'pia', name: 'Pia', department: 'Kassa', eveningOnly: false, employmentPct: 82 },
  { id: 'amelie', name: 'Amelie', department: 'Kassa', eveningOnly: false, employmentPct: 100 },
  { id: 'tobias', name: 'Tobias', department: 'Färg', eveningOnly: true, employmentPct: 82 },
  { id: 'boris', name: 'Boris', department: 'Färg', eveningOnly: false, employmentPct: 100 },
  { id: 'therese', name: 'Therese', department: 'Färg', eveningOnly: false, employmentPct: 100 },
  { id: 'fia', name: 'Fia', department: 'Färg', eveningOnly: false, employmentPct: 100 },
  { id: 'pernilla', name: 'Pernilla', department: 'Färg', eveningOnly: false, employmentPct: 100 },
  { id: 'marianne', name: 'Marianne', department: 'Järn', eveningOnly: false, employmentPct: 100 },
  { id: 'elias', name: 'Elias', department: 'Järn', eveningOnly: false, employmentPct: 100 },
  { id: 'junia', name: 'Junia', department: 'Järn', eveningOnly: false, employmentPct: 100 },
  { id: 'marin', name: 'Marin', department: 'Järn', eveningOnly: false, employmentPct: 100 },
  { id: 'aneta', name: 'Aneta', department: 'Järn', eveningOnly: false, employmentPct: 100 },
];

const initialPreferences = {
  pia: {
    preferredOffDays: ['monday'],
    preferredWorkDays: ['tuesday', 'thursday'],
    fixedTimeOff: [],
    notes: 'Kan gärna jobba tisdag/torsdag när det passar, men helst ledig måndagar.',
  },
  tobias: {
    preferredOffDays: [],
    preferredWorkDays: ['tuesday', 'thursday'],
    fixedTimeOff: [],
    notes: 'Jobbar endast kvällar.',
  },
};

const schedule = [
  { name: 'David', dept: 'Kassa', week: ['T', 'D', 'L', 'K', 'D', 'H', 'L'], hours: 40, deviations: 1 },
  { name: 'Håkan', dept: 'Kassa', week: ['D', 'K', 'D', 'L', 'T', 'L', 'L'], hours: 40, deviations: 0 },
  { name: 'Pia', dept: 'Kassa', week: ['K', 'L', 'K', 'L', 'K', 'L', 'L'], hours: 25, deviations: 0 },
  { name: 'Boris', dept: 'Färg', week: ['D', 'L', 'D', 'D', 'K', 'H', 'L'], hours: 40, deviations: 0 },
  { name: 'Tobias', dept: 'Färg', week: ['K', 'L', 'K', 'L', 'K', 'L', 'L'], hours: 25, deviations: 0 },
  { name: 'Marianne', dept: 'Järn', week: ['L', 'D', 'D', 'T', 'L', 'H', 'L'], hours: 32, deviations: 1 },
];

const engineStages = [
  { title: 'Laddar butiksmall', desc: 'Standardvärden för Nacka hämtas automatiskt.', score: 100 },
  { title: 'Tilldelar grundbemanning', desc: 'Minimibemanning per avdelning och dagtyp säkras.', score: 98 },
  { title: 'Lägger helgrotation', desc: 'Varannan och var tredje helg fördelas enligt regelverk.', score: 91 },
  { title: 'Optimerar kvällspass', desc: 'Kvällar balanseras utifrån kontrakt och återhämtning.', score: 96 },
  { title: 'Kontrollerar avvikelser', desc: 'Regelbrott, timavvikelser och belastning flaggas.', score: 93 },
  { title: 'Förbereder publicering', desc: 'Schemat låses för granskning och skickas till chefsvy.', score: 93 },
];

function KPI({ title, value, sub }) {
  return (
    <div className="card stat-card">
      <div className="eyebrow">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="muted">{sub}</div>
    </div>
  );
}

function PassPill({ code }) {
  return <div className={`pass-pill pass-${code.toLowerCase()}`}>{code}</div>;
}

function Dashboard() {
  return (
    <div className="main-layout">
      <div className="stack">
        <div className="grid four">
          <KPI title="Medarbetare" value="15" sub="3 avdelningar" />
          <KPI title="Schemakvalitet" value="93%" sub="Efter AI-optimering" />
          <KPI title="Avvikelser" value="2" sub="1 prioriterad" />
          <KPI title="Period" value="Sep–Dec" sub="18 veckor" />
        </div>
        <div className="card">
          <div className="section-title">Publicerat schema</div>
          <div className="muted">Chefsvy vecka 41 med timmar och avvikelser direkt i tabellen.</div>
          <div className="schedule-wrap">
            <div className="schedule-head">
              <div>Medarbetare</div>
              {days.map((d) => <div key={d}>{d}</div>)}
              <div>Timmar</div>
              <div>Avv.</div>
            </div>
            {schedule.map((row) => (
              <div key={row.name} className="schedule-row">
                <div className="employee-card">
                  <div className="employee-name">{row.name}</div>
                  <div className="muted small">{row.dept}</div>
                </div>
                {row.week.map((code, i) => <PassPill key={i} code={code} />)}
                <div className="metric-card">{row.hours}</div>
                <div className="metric-card">{row.deviations}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="stack">
        <div className="card">
          <div className="section-title">Avvikelsepanel</div>
          <div className="muted">Det viktigaste för chefen före publicering.</div>
          <div className="stack top-gap">
            <div className="alert-card"><span className="dot warning"></span><span>David har högre helgbelastning vecka 42 än snittet.</span></div>
            <div className="alert-card"><span className="dot warning"></span><span>Marianne ligger något högre i helgbelastning på Järn.</span></div>
            <div className="alert-card"><span className="dot ok"></span><span>Kvällsregler uppfylls för Pia och Tobias.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EngineView() {
  const [active, setActive] = useState(3);
  const avgScore = useMemo(() => Math.round(engineStages.reduce((a, b) => a + b.score, 0) / engineStages.length), []);

  return (
    <div className="split-layout">
      <div className="card">
        <div className="section-title">AI-schemamotor</div>
        <div className="muted">Visar hur motorn bygger schemat steg för steg.</div>
        <div className="grid three top-gap">
          <div className="card feature-card compact"><div className="eyebrow">Motorstatus</div><div className="panel-value">Aktiv</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Kvalitet</div><div className="panel-value">{avgScore}%</div></div>
          <div className="card feature-card compact"><div className="eyebrow">Iterationer</div><div className="panel-value">3</div></div>
        </div>
        <div className="stack top-gap">
          {engineStages.map((stage, i) => (
            <button key={stage.title} className={`engine-card ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
              <div>
                <div className="engine-title">{stage.title}</div>
                <div className="muted">{stage.desc}</div>
              </div>
              <span className="score-badge">{stage.score}%</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="section-title">Optimeringspanel</div>
        <div className="muted">Gör motorn begriplig för verksamheten och utvecklingsteamet.</div>
        <div className="card callout top-gap">
          <div className="callout-title">Aktivt steg</div>
          <div className="panel-value">{engineStages[active].title}</div>
          <div className="muted">{engineStages[active].desc}</div>
        </div>
      </div>
    </div>
  );
}

function PreferencesView({ employees }) {
  const [selectedId, setSelectedId] = useState(employees[0]?.id || '');
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saveTick, setSaveTick] = useState(0);
  const selectedEmployee = employees.find((e) => e.id === selectedId) || employees[0];

  useEffect(() => {
    if (!selectedEmployee && employees[0]) setSelectedId(employees[0].id);
  }, [employees, selectedEmployee]);

  function handleSave(nextPref) {
    if (!selectedEmployee) return;
    setPreferences((prev) => ({ ...prev, [selectedEmployee.id]: nextPref }));
    setSaveTick((x) => x + 1);
  }

  if (!selectedEmployee) {
    return (
      <div className="card">
        <div className="section-title">Personliga önskemål</div>
        <div className="muted">Lägg till minst en medarbetare i wizarden först.</div>
      </div>
    );
  }

  return (
    <div className="preferences-layout">
      <aside className="card employee-list-card">
        <div className="section-title">Medarbetare</div>
        <div className="muted">Välj person och registrera önskemål som ska vägas in i schemamotorn.</div>
        <div className="employee-list">
          {employees.map((e) => (
            <button key={e.id} className={`employee-list-item ${selectedId === e.id ? 'active' : ''}`} onClick={() => setSelectedId(e.id)}>
              <div>
                <div className="employee-name">{e.name || 'Namnlös medarbetare'}</div>
                <div className="muted small">{e.department} · {e.employmentPct}% {e.eveningOnly ? '· kväll endast' : ''}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <section className="card">
        <div className="preferences-header">
          <div>
            <div className="section-title">Personliga önskemål</div>
            <div className="muted">Dessa önskemål används som mjuka regler när nytt schema genereras.</div>
          </div>
          <div className="save-pill">Sparade ändringar: {saveTick}</div>
        </div>
        <PersonalPreferencesForm
          employeeName={selectedEmployee.name || 'Medarbetare'}
          value={preferences[selectedEmployee.id] || { preferredOffDays: [], preferredWorkDays: [], fixedTimeOff: [], notes: '' }}
          onSave={handleSave}
        />
      </section>
    </div>
  );
}

function PersonalView() {
  return (
    <div className="split-layout">
      <div className="stack">
        <div className="grid three">
          <KPI title="Mitt nästa pass" value="Tors 10:30" sub="Kvällspass" />
          <KPI title="Veckotimmar" value="25 h" sub="Uppdaterat" />
          <KPI title="Status" value="Publicerat" sub="Vecka 41" />
        </div>
        <div className="card">
          <div className="section-title">Min schemavy</div>
          <div className="muted">Renare och enklare vy för medarbetare.</div>
          <div className="simple-head top-gap">{days.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="simple-grid">
            {['K', 'L', 'K', 'L', 'K', 'L', 'L'].map((code, i) => <PassPill key={i} code={code} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard');
  const [employees, setEmployees] = useState(defaultEmployees);

  useEffect(() => {
    setSession(getSession());
  }, []);

  if (!session) return <LoginScreen onLogin={(user) => setSession(user)} />;

  const role = session.role;
  const nav = role === 'chef'
    ? [['dashboard', 'Dashboard'], ['wizard', 'Planeringswizard'], ['preferences', 'Önskemål'], ['engine', 'AI-motor'], ['copilot', 'Copilot']]
    : [['personal', 'Min vy'], ['engine', 'AI-insikt']];

  const activeView = role === 'personal' && !['personal', 'engine'].includes(view) ? 'personal' : view;

  return (
    <div className="app-shell">
      <div className="orb orb-a"></div>
      <div className="orb orb-b"></div>
      <div className="orb orb-c"></div>
      <div className="container">
        <header className="hero">
          <div>
            <div className="eyebrow dark">Beijer</div>
            <h1>Workforce Planner</h1>
            <p>Modern internapp för bemanningsplanering</p>
          </div>
          <div className="hero-right">
            <div className="hero-chip">{session.name} · {role === 'chef' ? 'Chefsvy' : 'Personalvy'}</div>
            <button className="hero-chip" onClick={() => { logout(); setSession(null); }}>Logga ut</button>
          </div>
        </header>

        <nav className="top-nav">
          {nav.map(([key, label]) => (
            <button key={key} className={activeView === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>
          ))}
        </nav>

        {role === 'chef' && activeView === 'dashboard' && <Dashboard />}
        {role === 'chef' && activeView === 'wizard' && <EditableSchedulingWizard employees={employees} setEmployees={setEmployees} />}
        {role === 'chef' && activeView === 'preferences' && <PreferencesView employees={employees} />}
        {activeView === 'engine' && <EngineView />}
        {role === 'chef' && activeView === 'copilot' && <StaffingCopilotBackend />}
        {role === 'personal' && activeView === 'personal' && <PersonalView />}
      </div>
    </div>
  );
}
