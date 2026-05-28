import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import EditableSchedulingWizard from './components/EditableSchedulingWizard';
import PersonalPreferencesForm from './components/PersonalPreferencesForm';
import StaffingCopilotBackend from './components/StaffingCopilotBackend';
import GeneratedSchedulePreview from './components/GeneratedSchedulePreview';
import { getSession, logout } from './lib/auth';
import { loadPlannerState, savePlannerState } from './lib/plannerStateApi';
import { loadSchedules, saveScheduleVersion, publishSchedule } from './lib/scheduleVersionApi';

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

function KPI({ title, value, sub }) {
  return (
    <div className="card stat-card">
      <div className="eyebrow">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="muted">{sub}</div>
    </div>
  );
}

function Dashboard({ generatedSchedule, employees, dbStatus }) {
  return (
    <div className="main-layout">
      <div className="stack">
        <div className="grid four">
          <KPI title="Medarbetare" value={employees.length} sub="Aktuell personalstyrka" />
          <KPI title="Genererat" value={generatedSchedule ? 'Ja' : 'Nej'} sub="Senaste schema" />
          <KPI title="Preferenser" value={generatedSchedule?.metadata?.preferenceCount ?? 0} sub="I genereringen" />
          <KPI title="Databas" value={dbStatus} sub="Senaste synkstatus" />
        </div>

        <GeneratedSchedulePreview generated={generatedSchedule} />
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-title">Översikt</div>
          <div className="muted">
            Senaste genereringen och medarbetarstyrkan används nu av Copilot och preview.
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesView({ employees, preferences, setPreferences }) {
  const [selectedId, setSelectedId] = useState(employees[0]?.id || '');
  const [saveTick, setSaveTick] = useState(0);

  const selectedEmployee =
    employees.find((e) => e.id === selectedId) || employees[0];

  useEffect(() => {
    if (!selectedEmployee && employees[0]) {
      setSelectedId(employees[0].id);
    }
  }, [employees, selectedEmployee]);

  function handleSave(nextPref) {
    if (!selectedEmployee) return;

    setPreferences((prev) => ({
      ...prev,
      [selectedEmployee.id]: nextPref,
    }));

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
        <div className="muted">
          Välj person och registrera önskemål som ska vägas in i schemamotorn.
        </div>

        <div className="employee-list">
          {employees.map((e) => (
            <button
              key={e.id}
              className={`employee-list-item ${selectedId === e.id ? 'active' : ''}`}
              onClick={() => setSelectedId(e.id)}
            >
              <div>
                <div className="employee-name">
                  {e.name || 'Namnlös medarbetare'}
                </div>
                <div className="muted small">
                  {e.department} · {e.employmentPct}%{' '}
                  {e.eveningOnly ? '· kväll endast' : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="card">
        <div className="preferences-header">
          <div>
            <div className="section-title">Personliga önskemål</div>
            <div className="muted">
              Dessa önskemål skickas nu med i genereringen.
            </div>
          </div>

          <div className="save-pill">Sparade ändringar: {saveTick}</div>
        </div>

        <PersonalPreferencesForm
          employeeName={selectedEmployee.name || 'Medarbetare'}
          value={
            preferences[selectedEmployee.id] || {
              preferredOffDays: [],
              preferredWorkDays: [],
              fixedTimeOff: [],
              notes: '',
            }
          }
          onSave={handleSave}
        />
      </section>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard');
  const [employees, setEmployees] = useState(defaultEmployees);
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [dbStatus, setDbStatus] = useState('Ej laddad');
  const [plannerLoaded, setPlannerLoaded] = useState(false);

  const [scheduleVersions, setScheduleVersions] = useState([]);

  useEffect(() => {
    setSession(getSession());
  }, []);
  useEffect(() => {
  async function loadVersions() {
    try {
      const versions = await loadSchedules();
      setScheduleVersions(versions);
    } catch (err) {
      console.warn('Could not load schedule versions', err);
    }
  }

  loadVersions();
}, []);

  useEffect(() => {
    async function loadFromDb() {
      try {
        const saved = await loadPlannerState();

        if (saved?.employees) {
          setEmployees(saved.employees);
        }

        if (saved?.preferences) {
          setPreferences(saved.preferences);
        }

        if (saved?.generatedSchedule) {
          setGeneratedSchedule(saved.generatedSchedule);
        }

        setDbStatus(saved ? 'Laddad' : 'Tom');
      } catch (err) {
        console.warn('Could not load planner state from database', err);
        setDbStatus('Fel vid laddning');
      } finally {
        setPlannerLoaded(true);
      }
    }

    loadFromDb();
  }, []);

  useEffect(() => {
    if (!plannerLoaded) return;

    const timer = setTimeout(() => {
      savePlannerState({
        employees,
        preferences,
        generatedSchedule: generatedSchedule || undefined,
        savedAt: new Date().toISOString(),
      })
        .then(() => {
          setDbStatus('Sparad');
        })
        .catch((err) => {
          console.warn('Could not save planner state to database', err);
          setDbStatus('Fel vid sparning');
        });
    }, 1200);

    return () => clearTimeout(timer);
  }, [plannerLoaded, employees, preferences, generatedSchedule]);

  async function handleGeneratedSchedule(generated) {
    setGeneratedSchedule(generated);
    setView('dashboard');

    try {
      await savePlannerState({
        employees,
        preferences,
        generatedSchedule: generated,
        savedAt: new Date().toISOString(),
      });
      const savedVersion = await saveScheduleVersion({
  title: `Schema ${new Date().toLocaleDateString('sv-SE')}`,
  comment: '',
  generatedSchedule: generated,
  generatedBy: session?.name || 'Chef',
});

setScheduleVersions((prev) => [savedVersion, ...prev]);

      setDbStatus('Schema sparat');
    } catch (err) {
      console.warn('Could not save generated schedule to database', err);
      setDbStatus('Fel vid schemasparning');
    }
  }

  if (!session) {
    return <LoginScreen onLogin={(user) => setSession(user)} />;
  }

  const role = session.role;

  const nav =
    role === 'chef'
      ? [
          ['dashboard', 'Dashboard'],
          ['wizard', 'Planeringswizard'],
          ['preferences', 'Önskemål'],
          ['copilot', 'Copilot'],
        ]
      : [['personal', 'Min vy']];

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
            <div className="hero-chip">
              {session.name} · {role === 'chef' ? 'Chefsvy' : 'Personalvy'}
            </div>

            <div className="hero-chip">DB: {dbStatus}</div>

            <button
              className="hero-chip"
              onClick={() => {
                logout();
                setSession(null);
              }}
            >
              Logga ut
            </button>
          </div>
        </header>

        <nav className="top-nav">
          {nav.map(([key, label]) => (
            <button
              key={key}
              className={view === key ? 'active' : ''}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>

       
        {role === 'chef' && view === 'dashboard' && (
           <Dashboard
    generatedSchedule={generatedSchedule}
    employees={employees}
    dbStatus={dbStatus}
    scheduleVersions={scheduleVersions}
    onPublishSchedule={async (id) => {
      await publishSchedule(id);
      const versions = await loadSchedules();
      setScheduleVersions(versions);
    }}
  />
)}

        {role === 'chef' && view === 'wizard' && (
          <EditableSchedulingWizard
            employees={employees}
            setEmployees={setEmployees}
            preferences={preferences}
            setPreferences={setPreferences}
            onGenerated={handleGeneratedSchedule}
          />
        )}

        {role === 'chef' && view === 'preferences' && (
          <PreferencesView
            employees={employees}
            preferences={preferences}
            setPreferences={setPreferences}
          />
        )}

        {role === 'chef' && view === 'copilot' && (
          <StaffingCopilotBackend
            generated={generatedSchedule}
            preferences={preferences}
          />
        )}

        {role !== 'chef' && view === 'personal' && (
          <div className="card">
            <div className="section-title">Min vy</div>
            <div className="muted">
              Personalvy kommer senare att visa individuellt schema och önskemål.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
