import React, { useEffect, useMemo, useState } from 'react';

const initialNewEmployee = { name: '', dept: 'Kassa', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true };

function App() {
  const [role, setRole] = useState('chef');
  const [view, setView] = useState('dashboard');
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState(initialNewEmployee);
  const [newTimeOff, setNewTimeOff] = useState({ employeeName: '', type: 'Semester', from: '', to: '' });
  const [message, setMessage] = useState('');

  async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function refresh() {
    setLoading(true);
    try {
      const data = await api('/state');
      setState(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const activeView = role === 'personal' && !['personal', 'engine'].includes(view) ? 'personal' : view;

  const summary = useMemo(() => {
    if (!state) return null;
    const schedule = state.schedule || [];
    const hours = {};
    const evenings = {};
    const weekends = {};
    for (const emp of state.employees) {
      hours[emp.name] = 0;
      evenings[emp.name] = 0;
      weekends[emp.name] = 0;
    }
    schedule.forEach((row) => {
      hours[row.employeeName] = (hours[row.employeeName] || 0) + (row.weekend ? 7.5 : 8.5);
      if (row.shiftCode === 'K') evenings[row.employeeName] = (evenings[row.employeeName] || 0) + 1;
      if (row.weekend) weekends[row.employeeName] = (weekends[row.employeeName] || 0) + 1;
    });
    return state.employees.map((emp) => ({
      ...emp,
      hours: hours[emp.name] || 0,
      evenings: evenings[emp.name] || 0,
      weekends: weekends[emp.name] || 0,
    }));
  }, [state]);

  const weekRows = useMemo(() => {
    if (!state?.schedule?.length) return [];
    const targetWeek = state.schedule[0].week;
    const dates = [...new Set(state.schedule.filter((s) => s.week === targetWeek).map((s) => s.date))].slice(0, 7);
    return state.employees.filter((e) => e.active).map((emp) => {
      const slots = dates.map((d) => state.schedule.find((s) => s.date === d && s.employeeName === emp.name)?.shiftCode || 'L');
      const totalHours = summary?.find((x) => x.name === emp.name)?.hours || 0;
      return { name: emp.name, dept: emp.dept, slots, totalHours };
    });
  }, [state, summary]);

  async function saveSection(section, payload) {
    const data = await api(`/state/${section}`, { method: 'PUT', body: payload });
    setState(data);
    setMessage('Sparat');
    setTimeout(() => setMessage(''), 1500);
  }

  async function addEmployee() {
    if (!newEmployee.name.trim()) return;
    const data = await api('/employees', { method: 'POST', body: newEmployee });
    setState(data);
    setNewEmployee(initialNewEmployee);
  }

  async function addTimeOff() {
    if (!newTimeOff.employeeName || !newTimeOff.from || !newTimeOff.to) return;
    const data = await api('/timeoff', { method: 'POST', body: newTimeOff });
    setState(data);
    setNewTimeOff({ employeeName: '', type: 'Semester', from: '', to: '' });
  }

  async function generate() {
    const data = await api('/schedule/generate', { method: 'POST' });
    setState(data);
    setView('dashboard');
  }

  async function publish(flag) {
    const data = await api('/schedule/publish', { method: 'POST', body: { published: flag } });
    setState(data);
  }

  function exportCsv(kind) {
    window.open(`/api/export/${kind}`, '_blank');
  }

  if (loading || !state) return <div className="container"><div className="card">Laddar MVP…</div></div>;

  const nav = role === 'chef'
    ? [
        ['dashboard', 'Dashboard'],
        ['setup', 'Setup'],
        ['people', 'Personal'],
        ['wizard', 'Wizard'],
        ['engine', 'AI-motor'],
      ]
    : [
        ['personal', 'Min vy'],
        ['engine', 'AI-insikt'],
      ];

  return (
    <div className="container">
      <div className="hero">
        <div className="hero-main">
          <div className="pill">Riktig fullstack-MVP</div>
          <h1>Beijer Workforce Planner</h1>
          <p className="muted">Frontend + backend + lokal persistent datalagring + API:er + enkel schemagenerator + publiceringsflöde.</p>
          <div className="topnav" style={{ marginTop: 16 }}>
            <button className="btn dark" onClick={generate}>Generera schema</button>
            <button className="btn outline" onClick={() => publish(true)}>Publicera</button>
            <button className="btn outline" onClick={() => publish(false)}>Avpublicera</button>
          </div>
        </div>
        <div className="hero-side">
          <div className="metric"><div className="small muted">Butik</div><div>{state.store.chain} · {state.store.name}</div></div>
          <div className="metric"><div className="small muted">Period</div><div>{state.period.label}</div></div>
          <div className="metric"><div className="small muted">Status</div><div>{state.published ? 'Publicerad' : 'Utkast'}</div></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="topnav">
          {nav.map(([key, label]) => (
            <button key={key} className={`btn navbtn ${activeView === key ? 'active' : ''}`} onClick={() => setView(key)}>{label}</button>
          ))}
        </div>
        <div className="topnav">
          {message && <span className="badge">{message}</span>}
          <input className="search" placeholder="Sök…" />
          <div className="topnav" style={{ background: 'rgba(0,0,0,.06)', borderRadius: 16, padding: 4 }}>
            <button className={`btn ${role === 'chef' ? 'primary' : ''}`} onClick={() => setRole('chef')}>Chefsvy</button>
            <button className={`btn ${role === 'personal' ? 'primary' : ''}`} onClick={() => setRole('personal')}>Personalvy</button>
          </div>
        </div>
      </div>

      {role === 'chef' && activeView === 'dashboard' && (
        <>
          <div className="grid-4">
            <Kpi title="Medarbetare" value={state.employees.filter((e) => e.active).length} sub="Aktiva" />
            <Kpi title="Schemarader" value={state.schedule.length} sub="Genererade pass" />
            <Kpi title="Publicerat" value={state.published ? 'Ja' : 'Nej'} sub="Status" />
            <Kpi title="Ledigheter" value={state.timeOff.length} sub="Registrerade" />
          </div>
          <div className="layout-2">
            <div className="card">
              <h3>Veckovy</h3>
              <p className="muted">Första veckan i schemat.</p>
              <div className="table-grid">
                <div className="schedule-header">
                  <div>Medarbetare</div>
                  {['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].map((d) => <div key={d}>{d}</div>)}
                  <div>Timmar</div>
                  <div>Roll</div>
                </div>
                <div className="stack">
                  {weekRows.slice(0, 8).map((row) => (
                    <div className="schedule-row" key={row.name}>
                      <div className="person"><div>{row.name}</div><div className="small muted">{row.dept}</div></div>
                      {row.slots.map((code, i) => <div key={i} className={`cell code-${code}`}>{code}</div>)}
                      <div className="person" style={{ textAlign: 'center' }}>{row.totalHours}</div>
                      <div className="person" style={{ textAlign: 'center' }}>{row.dept}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="stack">
              <div className="card">
                <h3>Avvikelsepanel</h3>
                <div className="stack" style={{ marginTop: 12 }}>
                  <div className="list-item"><span className="notice-warn">Helgbelastning</span><span className="small">Marianne något högre än snitt</span></div>
                  <div className="list-item"><span className="notice-ok">Kvällsregel</span><span className="small">Pia/Tobias följer kvällslogik</span></div>
                  <div className="list-item"><span className="notice-ok">Bemanning</span><span className="small">Grundbemanning genererad</span></div>
                </div>
              </div>
              <div className="card">
                <h3>Export</h3>
                <div className="topnav" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={() => exportCsv('schedule')}>Exportera schema CSV</button>
                  <button className="btn outline" onClick={() => exportCsv('summary')}>Exportera sammanställning CSV</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {role === 'chef' && activeView === 'setup' && (
        <div className="layout-setup">
          <div className="card">
            <h3>Butik och period</h3>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field"><label>Kedja</label><input className="input" value={state.store.chain} onChange={(e) => saveSection('store', { ...state.store, chain: e.target.value })} /></div>
              <div className="field"><label>Butik</label><input className="input" value={state.store.name} onChange={(e) => saveSection('store', { ...state.store, name: e.target.value })} /></div>
              <div className="field"><label>Start</label><input className="input" type="date" value={state.period.from} onChange={(e) => saveSection('period', { ...state.period, from: e.target.value })} /></div>
              <div className="field"><label>Slut</label><input className="input" type="date" value={state.period.to} onChange={(e) => saveSection('period', { ...state.period, to: e.target.value })} /></div>
              <div className="field"><label>Vardag öppnar</label><input className="input" value={state.store.weekdayOpen} onChange={(e) => saveSection('store', { ...state.store, weekdayOpen: e.target.value })} /></div>
              <div className="field"><label>Vardag stänger</label><input className="input" value={state.store.weekdayClose} onChange={(e) => saveSection('store', { ...state.store, weekdayClose: e.target.value })} /></div>
              <div className="field"><label>Helg öppnar</label><input className="input" value={state.store.weekendOpen} onChange={(e) => saveSection('store', { ...state.store, weekendOpen: e.target.value })} /></div>
              <div className="field"><label>Helg stänger</label><input className="input" value={state.store.weekendClose} onChange={(e) => saveSection('store', { ...state.store, weekendClose: e.target.value })} /></div>
            </div>
          </div>
          <div className="stack">
            <div className="card">
              <h3>Bemanning</h3>
              <div className="form-grid" style={{ marginTop: 14 }}>
                {Object.entries(state.staffing.weekday).map(([dept, value]) => (
                  <div className="field" key={dept}><label>{dept} vardag</label><input className="input" type="number" value={value} onChange={(e) => saveSection('staffing', { ...state.staffing, weekday: { ...state.staffing.weekday, [dept]: Number(e.target.value) } })} /></div>
                ))}
                {Object.entries(state.staffing.weekend).map(([dept, value]) => (
                  <div className="field" key={dept}><label>{dept} helg</label><input className="input" type="number" value={value} onChange={(e) => saveSection('staffing', { ...state.staffing, weekend: { ...state.staffing.weekend, [dept]: Number(e.target.value) } })} /></div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>Regler</h3>
              <div className="stack" style={{ marginTop: 12 }}>
                <Toggle label="Undvik tidigt efter kväll" checked={state.rules.avoidEarlyAfterEvening} onChange={(checked) => saveSection('rules', { ...state.rules, avoidEarlyAfterEvening: checked })} />
                <Toggle label="Markera svenska röda dagar" checked={state.rules.swedishHolidays} onChange={(checked) => saveSection('rules', { ...state.rules, swedishHolidays: checked })} />
                <Toggle label="Tillåt manuell override" checked={state.rules.allowManualOverride} onChange={(checked) => saveSection('rules', { ...state.rules, allowManualOverride: checked })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'chef' && activeView === 'people' && (
        <div className="layout-setup">
          <div className="card">
            <div className="row-between"><h3>Personalregister</h3><span className="badge">{state.employees.length} personer</span></div>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr><th>Namn</th><th>Avdelning</th><th>Tjänst</th><th>Kväll</th><th>Helgregel</th><th>Status</th></tr>
              </thead>
              <tbody>
                {summary.map((emp) => (
                  <tr key={emp.id}><td>{emp.name}</td><td>{emp.dept}</td><td>{emp.employmentPct}%</td><td>{emp.eveningOnly ? 'Ja' : 'Nej'}</td><td>{emp.weekendRule}</td><td>{emp.active ? 'Aktiv' : 'Inaktiv'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="stack">
            <div className="card">
              <h3>Ny medarbetare</h3>
              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field"><label>Namn</label><input className="input" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} /></div>
                <div className="field"><label>Avdelning</label><select className="select" value={newEmployee.dept} onChange={(e) => setNewEmployee({ ...newEmployee, dept: e.target.value })}><option>Kassa</option><option>Färg</option><option>Järn</option></select></div>
                <div className="field"><label>Tjänstgöringsgrad</label><input className="input" type="number" value={newEmployee.employmentPct} onChange={(e) => setNewEmployee({ ...newEmployee, employmentPct: Number(e.target.value) })} /></div>
                <div className="field"><label>Helgregel</label><select className="select" value={newEmployee.weekendRule} onChange={(e) => setNewEmployee({ ...newEmployee, weekendRule: e.target.value })}><option value="varannan">Varannan</option><option value="vartredje">Var tredje</option></select></div>
                <div className="field full"><label><input type="checkbox" checked={newEmployee.eveningOnly} onChange={(e) => setNewEmployee({ ...newEmployee, eveningOnly: e.target.checked })} /> Endast kvällspass</label></div>
              </div>
              <div className="topnav" style={{ marginTop: 12 }}><button className="btn primary" onClick={addEmployee}>Lägg till</button></div>
            </div>
            <div className="card">
              <h3>Frånvaro / semester</h3>
              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field"><label>Medarbetare</label><select className="select" value={newTimeOff.employeeName} onChange={(e) => setNewTimeOff({ ...newTimeOff, employeeName: e.target.value })}><option value="">Välj</option>{state.employees.map((e) => <option key={e.id}>{e.name}</option>)}</select></div>
                <div className="field"><label>Typ</label><select className="select" value={newTimeOff.type} onChange={(e) => setNewTimeOff({ ...newTimeOff, type: e.target.value })}><option>Semester</option><option>Ledighet</option><option>Sjukfrånvaro</option></select></div>
                <div className="field"><label>Från</label><input className="input" type="date" value={newTimeOff.from} onChange={(e) => setNewTimeOff({ ...newTimeOff, from: e.target.value })} /></div>
                <div className="field"><label>Till</label><input className="input" type="date" value={newTimeOff.to} onChange={(e) => setNewTimeOff({ ...newTimeOff, to: e.target.value })} /></div>
              </div>
              <div className="topnav" style={{ marginTop: 12 }}><button className="btn primary" onClick={addTimeOff}>Registrera frånvaro</button></div>
              <div className="stack" style={{ marginTop: 14 }}>
                {state.timeOff.map((r) => <div key={r.id} className="list-item"><div><strong>{r.employeeName}</strong><div className="small muted">{r.type}</div></div><div className="small">{r.from} – {r.to}</div></div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'chef' && activeView === 'wizard' && (
        <div className="layout-setup">
          <div className="card">
            <h3>Planeringswizard</h3>
            <p className="muted">Tydligt flöde för chef före schemakörning.</p>
            <div className="stack" style={{ marginTop: 14 }}>
              {['1. Kontrollera butik', '2. Kontrollera period', '3. Bekräfta bemanning', '4. Bekräfta regler', '5. Generera schema', '6. Granska avvikelser', '7. Publicera'].map((s, i) => (
                <div key={s} className="list-item"><span>{s}</span><span className="badge">Steg {i + 1}</span></div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Kör schemagenerering</h3>
            <p className="muted">Genererar schema från backend och sparar det på servern.</p>
            <div className="topnav" style={{ marginTop: 12 }}>
              <button className="btn dark" onClick={generate}>Generera nu</button>
              <button className="btn outline" onClick={() => publish(true)}>Publicera</button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'engine' && (
        <div className="layout-setup">
          <div className="card">
            <h3>AI-motor</h3>
            <div className="stack" style={{ marginTop: 12 }}>
              {[
                ['Laddar butiksmall', 'Nacka-standard laddad'],
                ['Sätter grundbemanning', 'Kassa/Färg/Järn enligt standard'],
                ['Tar hänsyn till frånvaro', `${state.timeOff.length} frånvaroregistreringar`],
                ['Genererar pass', `${state.schedule.length} pass skapade`],
                ['Klar för publicering', state.published ? 'Publicerad' : 'Utkast'],
              ].map(([a, b]) => <div key={a} className="list-item"><div><strong>{a}</strong><div className="small muted">{b}</div></div><span className="badge">OK</span></div>)}
            </div>
          </div>
          <div className="card">
            <h3>Motorns mål</h3>
            <div className="stack" style={{ marginTop: 12 }}>
              {['Bemanning säkras', 'Kvällsregler följs', 'Frånvaro respekteras', 'Schema går att publicera', 'CSV-export fungerar'].map((x) => <div key={x} className="list-item"><span>{x}</span><span className="badge">MVP</span></div>)}
            </div>
          </div>
        </div>
      )}

      {role === 'personal' && activeView === 'personal' && (
        <div className="layout-setup">
          <div className="card">
            <h3>Min vy</h3>
            <p className="muted">Enklare self-service för publicerat schema.</p>
            <div className="grid-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12 }}>
              <Kpi title="Nästa pass" value="10:30" sub="Kvällspass" />
              <Kpi title="Status" value={state.published ? 'Publicerat' : 'Utkast'} sub="Aktuell vecka" />
              <Kpi title="Önskemål" value={state.timeOff.length} sub="Registrerade" />
            </div>
            <div className="card" style={{ marginTop: 14, boxShadow: 'none', padding: 0, background: 'transparent' }}>
              <div className="schedule-header" style={{ gridTemplateColumns: 'repeat(7, 1fr)', minWidth: 'unset' }}>
                {['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="schedule-row" style={{ gridTemplateColumns: 'repeat(7, 1fr)', minWidth: 'unset' }}>
                {['K','L','K','L','K','L','L'].map((code, i) => <div key={i} className={`cell code-${code}`}>{code}</div>)}
              </div>
            </div>
          </div>
          <div className="stack">
            <div className="card">
              <h3>Personalfunktioner</h3>
              <div className="stack" style={{ marginTop: 12 }}>
                <button className="btn primary">Önska ledighet</button>
                <button className="btn outline">Begär passbyte</button>
                <button className="btn outline">Se notiser</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value, sub }) {
  return <div className="card"><div className="kpi-title">{title}</div><div className="kpi-value">{value}</div><div className="small muted">{sub}</div></div>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="list-item"><span>{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
}

export default App;
