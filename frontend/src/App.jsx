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

function getISOWeek(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  return 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
}

function formatShift(a) {
  if (!a) return "";
  if (a.code === "L") return "Ledig";
  if (a.start && a.end) return `${a.start}-${a.end}`;
  return a.label || a.code || "";
}

function Dashboard({
  generatedSchedule,
  employees,
  dbStatus,
  scheduleVersions,
  onPublishSchedule
}) {
  const weeks = Array.from(
    new Set(
      generatedSchedule?.rows?.[0]?.assignments?.map((a) => getISOWeek(a.date)) || []
    )
  );

  const [selectedWeek, setSelectedWeek] = useState(weeks[0] || null);
  const visibleWeek = selectedWeek || weeks[0];

  const weekDays =
    generatedSchedule?.rows?.[0]?.assignments?.filter(
      (a) => getISOWeek(a.date) === visibleWeek
    ) || [];

  const shiftOptions = [
    { code: "L", label: "Ledig" },
    { code: "T", label: "06:00-15:00" },
    { code: "M", label: "07:00-16:00" },
    { code: "D", label: "08:00-17:00" },
    { code: "N", label: "09:00-18:00" },
    { code: "K", label: "10:00-19:00" },
    { code: "H", label: "09:00-16:00 helg" },
  ];

  function shiftFromCode(code) {
    return {
      L: { code: "L", label: "Ledig", hours: 0, start: "", end: "" },
      T: { code: "T", label: "Tidigt", hours: 8, start: "06:00", end: "15:00" },
      M: { code: "M", label: "Morgon", hours: 8, start: "07:00", end: "16:00" },
      D: { code: "D", label: "Dag", hours: 8, start: "08:00", end: "17:00" },
      N: { code: "N", label: "Normal", hours: 8, start: "09:00", end: "18:00" },
      K: { code: "K", label: "Kväll", hours: 8, start: "10:00", end: "19:00" },
      H: { code: "H", label: "Helg", hours: 7, start: "09:00", end: "16:00" },
    }[code];
  }

  function getDepartmentColor(department = "") {
    const d = department.toLowerCase();
    if (d.includes("lager")) return "rgba(52,152,219,0.22)";
    if (d.includes("färg")) return "rgba(46,204,113,0.22)";
    if (d.includes("järn")) return "rgba(231,76,60,0.22)";
    if (d.includes("kassa")) return "rgba(155,89,182,0.22)";
    if (d.includes("proff")) return "rgba(241,196,15,0.22)";
    return "rgba(255,255,255,0.08)";
  }

  function getShiftColor(code, manuallyEdited) {
    if (manuallyEdited) return "rgba(255,255,255,0.24)";

    switch (code) {
      case "T": return "rgba(241,196,15,0.24)";
      case "M": return "rgba(52,152,219,0.22)";
      case "D": return "rgba(46,204,113,0.22)";
      case "N": return "rgba(26,188,156,0.22)";
      case "K": return "rgba(155,89,182,0.26)";
      case "H": return "rgba(231,76,60,0.24)";
      case "L": return "rgba(255,255,255,0.05)";
      default: return "rgba(255,255,255,0.08)";
    }
  }

  function updateAssignment(employeeId, date, newCode) {
    if (!generatedSchedule) return;

    const updated = {
      ...generatedSchedule,
      rows: generatedSchedule.rows.map((row) => {
        if (row.employeeId !== employeeId) return row;

        const assignments = row.assignments.map((a) => {
          if (a.date !== date) return a;
          const shift = shiftFromCode(newCode);

          return {
            ...a,
            ...shift,
            manuallyEdited: true,
            preferenceReasons: ["Manuellt justerad"],
          };
        });

        return {
          ...row,
          assignments,
          totals: {
            ...row.totals,
            hours: assignments.reduce((sum, a) => sum + (a.hours || 0), 0),
          },
        };
      }),
      metadata: {
        ...(generatedSchedule.metadata || {}),
        manuallyEditedAt: new Date().toISOString(),
      },
    };

    window.dispatchEvent(
      new CustomEvent("beijer:schedule-edited", {
        detail: updated,
      })
    );
  }

  return (
    <div className="main-layout">
      <div className="stack">
        <div className="grid four">
          <KPI title="Medarbetare" value={employees.length} sub="Aktuell personalstyrka" />
          <KPI title="Genererat" value={generatedSchedule ? "Ja" : "Nej"} sub="Senaste schema" />
          <KPI title="Preferenser" value={generatedSchedule?.metadata?.preferenceCount ?? 0} sub="I genereringen" />
          <KPI title="Databas" value={dbStatus} sub="Senaste synkstatus" />
          <KPI title="Schemakvalitet" value={generatedSchedule?.diagnostics?.qualityScore ?? "-"} sub="Poäng av 100" />
          <KPI title="Konflikter" value={generatedSchedule?.diagnostics?.summary?.preferenceConflicts ?? "-"} sub="Totalt antal" />
          <KPI title="Brutna önskemål" value={generatedSchedule?.diagnostics?.summary?.brokenPreferences ?? "-"} sub="Individuella önskemål" />
          <KPI title="Helgpass" value={generatedSchedule?.diagnostics?.summary?.totalWeekends ?? "-"} sub="Totalt i perioden" />
        </div>

        <GeneratedSchedulePreview generated={generatedSchedule} />

        {generatedSchedule?.rows?.length > 0 && (
          <div className="card">
            <div className="section-title">Veckovy</div>

            <div className="top-gap">
              <select
                className="pref-input"
                value={visibleWeek || ""}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
              >
                {weeks.map((week) => (
                  <option key={week} value={week}>
                    Vecka {week}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 10 }}>Medarbetare</th>
                    {weekDays.map((d) => (
                      <th key={d.date} style={{ padding: 10 }}>{d.date}</th>
                    ))}
                    <th style={{ padding: 10 }}>Timmar</th>
                  </tr>
                </thead>

                <tbody>
                  {generatedSchedule.rows.map((row) => {
                    const assignments = row.assignments.filter(
                      (a) => getISOWeek(a.date) === visibleWeek
                    );

                    const hours = assignments.reduce(
                      (sum, a) => sum + (a.hours || 0),
                      0
                    );

                    return (
                      <tr key={row.employeeId}>
                        <td
                          style={{
                            padding: 10,
                            fontWeight: 700,
                            background: getDepartmentColor(row.department),
                            borderRadius: 10,
                          }}
                        >
                          {row.employeeName}
                          <div className="muted small">{row.department}</div>
                        </td>

                        {assignments.map((a) => (
                          <td
                            key={a.date}
                            style={{
                              padding: 10,
                              borderTop: "1px solid rgba(255,255,255,0.12)",
                              background: getShiftColor(a.code, a.manuallyEdited),
                              border: a.preferenceReasons?.length > 0
                                ? "1px solid rgba(255,120,120,0.35)"
                                : "1px solid transparent",
                              borderRadius: 10,
                              transition: "all .18s ease",
                            }}
                          >
                            <select
                              className="pref-input"
                              value={a.code}
                              onChange={(e) =>
                                updateAssignment(row.employeeId, a.date, e.target.value)
                              }
                            >
                              {shiftOptions.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            {a.manuallyEdited && (
                              <div className="save-pill" style={{ marginTop: 6 }}>
                                Justerad
                              </div>
                            )}

                            {a.preferenceReasons?.length > 0 && (
                              <div className="muted small">
                                {a.preferenceReasons[0]}
                              </div>
                            )}
                          </td>
                        ))}

                        <td style={{ padding: 10, fontWeight: 700 }}>
                          {hours}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {generatedSchedule?.diagnostics?.deviations?.length > 0 && (
          <div className="card">
            <div className="section-title">Konflikter & kvalitetsindikatorer</div>

            <div className="stack">
              {generatedSchedule.diagnostics.deviations.slice(0, 8).map((d, idx) => (
                <div key={idx} className="rule-card spread">
                  <div>
                    <strong>{d.category || "Indikator"}</strong>
                    <div className="muted small">{d.message}</div>
                  </div>
                  <div className="save-pill">{d.severity}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-title">Översikt</div>
          <div className="muted">
            Senaste genereringen och medarbetarstyrkan används nu av Copilot och preview.
          </div>
        </div>

        <div className="card" style={{ maxHeight: 420, overflowY: "auto" }}>
          <div className="section-title">Schemaversioner</div>

          <div className="stack">
            {scheduleVersions?.slice(0, 5).map((schedule) => (
              <div key={schedule.id} className="rule-card spread">
                <div>
                  <strong>{schedule.title}</strong>

                  <div className="muted small">
                    Version {schedule.version} · {schedule.status}
                  </div>

                  <div className="muted small">
                    {new Date(schedule.created_at).toLocaleString("sv-SE")}
                  </div>
                </div>

                {!schedule.published && (
                  <button
                    className="btn primary"
                    onClick={() => onPublishSchedule(schedule.id)}
                  >
                    Publicera
                  </button>
                )}

                {schedule.published && (
                  <div className="save-pill">Publicerad</div>
                )}
              </div>
            ))}
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

useEffect(() => {
  function onScheduleEdited(event) {
    handleGeneratedSchedule(event.detail);
  }

  window.addEventListener("beijer:schedule-edited", onScheduleEdited);

  return () => {
    window.removeEventListener("beijer:schedule-edited", onScheduleEdited);
  };
}, [employees, preferences, generatedSchedule]);
  
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
.pref-input {
  background: rgba(20, 24, 26, 0.92);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 12px;
  padding: 8px 10px;
}

.pref-input option {
  background: #202426;
  color: #ffffff;
}

.pref-input:focus {
  outline: 2px solid rgba(254,209,65,0.65);
}
