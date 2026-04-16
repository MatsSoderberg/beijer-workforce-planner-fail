import React, { useMemo, useState } from 'react';

const steps = [
  { key: 'store', label: 'Butik' },
  { key: 'period', label: 'Period' },
  { key: 'staffing', label: 'Bemanning' },
  { key: 'rules', label: 'Regler' },
  { key: 'generate', label: 'Generera' },
  { key: 'review', label: 'Avvikelser' },
  { key: 'publish', label: 'Publicera' },
];

const days = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

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

const personalCards = [
  { title: 'Mitt schema', text: 'Se publicerat schema vecka för vecka med tydliga passkoder.' },
  { title: 'Ledighetsönskemål', text: 'Skicka önskemål om semester eller ledighet direkt i appen.' },
  { title: 'Passbyte', text: 'Begär eller godkänn passbyten med kollegor.' },
  { title: 'Notiser', text: 'Få besked när nytt schema publiceras eller ändras.' },
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

function Wizard({ current, setCurrent }) {
  const step = steps[current];
  const progress = Math.round(((current + 1) / steps.length) * 100);
  const [isGenerating, setIsGenerating] = useState(false);

  const next = () => {
    if (step.key === 'generate') {
      setIsGenerating(true);
      setTimeout(() => {
        setIsGenerating(false);
        setCurrent(Math.min(current + 1, steps.length - 1));
      }, 1800);
      return;
    }
    setCurrent(Math.min(current + 1, steps.length - 1));
  };

  const prev = () => setCurrent(Math.max(current - 1, 0));

  const content = {
    store: (
      <div className="grid two">
        <div className="card feature-card">
          <div className="eyebrow">Vald butik</div>
          <div className="feature-value">Beijer Nacka</div>
          <div className="muted">Byggvaruhus · Kassa, Färg och Järn</div>
        </div>
        <div className="card feature-card">
          <div className="eyebrow">Standardmall</div>
          <div className="feature-value">Beijer standard</div>
          <div className="muted">Öppettider, passstruktur och regler är förifyllda.</div>
        </div>
      </div>
    ),
    period: (
      <div className="grid two">
        <div className="card feature-card">
          <div className="eyebrow">Startdatum</div>
          <div className="feature-value">1 sep 2026</div>
        </div>
        <div className="card feature-card">
          <div className="eyebrow">Slutdatum</div>
          <div className="feature-value">31 dec 2026</div>
        </div>
      </div>
    ),
    staffing: (
      <div className="grid three">
        {[
          ['Kassa vardag', '2 personer'],
          ['Färg vardag', '1 person'],
          ['Järn vardag', '2 personer'],
          ['Kassa helg', '1 person'],
          ['Färg helg', '1 person'],
          ['Järn helg', '1 person'],
        ].map(([label, value]) => (
          <div key={label} className="card feature-card">
            <div className="eyebrow">{label}</div>
            <div className="panel-value">{value}</div>
          </div>
        ))}
      </div>
    ),
    rules: (
      <div className="grid two">
        {[
          'Kassa och Färg varannan helg',
          'Järn var tredje helg',
          'Ledig fredag före helg på Järn',
          'Ledig måndag efter helg på Järn',
          'Pia kväll endast',
          'Tobias kväll endast',
          'Undvik tidigt pass efter kvällspass',
          'Optimera kvällsrättvisa',
        ].map((r) => (
          <label key={r} className="rule-card">
            <input type="checkbox" defaultChecked />
            <span>{r}</span>
          </label>
        ))}
      </div>
    ),
    generate: (
      <div className="stack">
        <div className="grid three">
          {[
            ['Bemanningsgrad', '98%'],
            ['Helgrättvisa', '89%'],
            ['Kvällsrättvisa', '96%'],
          ].map(([label, value]) => (
            <div key={label} className="card feature-card">
              <div className="eyebrow">{label}</div>
              <div className="feature-value">{value}</div>
            </div>
          ))}
        </div>
        <div className="card callout">
          <div className="callout-title">AI-motorn</div>
          {isGenerating ? (
            <div className="stack">
              <div className="loading-row"><span className="spinner"></span><strong>Bygger schemat...</strong></div>
              <div className="mini-chip">Analyserar bemanning</div>
              <div className="mini-chip">Optimerar helgfördelning</div>
              <div className="mini-chip">Balanserar kvällspass</div>
            </div>
          ) : (
            <>
              <div className="panel-value">Redo att generera första schemaversionen</div>
              <div className="muted">Systemet väger bemanning, timmar, kvällar och helger mot regelverket.</div>
            </>
          )}
        </div>
      </div>
    ),
    review: (
      <div className="stack">
        {[
          ['warning', 'David har högre helgbelastning vecka 42 än snittet.'],
          ['warning', 'Marianne ligger något högre i helgbelastning på Järn.'],
          ['ok', 'Kvällsregler uppfylls för Pia och Tobias.'],
        ].map(([type, text]) => (
          <div key={text} className="alert-card">
            <span className={`dot ${type}`}></span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    ),
    publish: (
      <div className="stack">
        <div className="grid four">
          {[
            ['Period', 'Sep–Dec'],
            ['Personal', '15'],
            ['Avdelningar', '3'],
            ['Schemakvalitet', '93%'],
          ].map(([label, value]) => (
            <div key={label} className="card feature-card">
              <div className="eyebrow">{label}</div>
              <div className="feature-value">{value}</div>
            </div>
          ))}
        </div>
        <div className="card callout">
          <div className="callout-title">Redo att publiceras</div>
          <div className="muted">Schemat är granskat och klart för publicering till chefsvy och personalvy.</div>
        </div>
      </div>
    ),
  };

  return (
    <div className="wizard-layout">
      <aside className="card wizard-sidebar">
        <div className="section-title">Planeringswizard</div>
        <div className="muted">Guidat steg-för-steg-flöde för chef.</div>

        <div className="progress-wrap">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="muted small">Steg {current + 1} av {steps.length}</div>
        </div>

        <div className="step-list">
          {steps.map((s, i) => (
            <button key={s.key} className={`step-item ${i === current ? 'active' : ''}`} onClick={() => setCurrent(i)}>
              <div className="small muted">Steg {i + 1}</div>
              <div className="step-name">{s.label}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="card wizard-main">
        <div className="section-title">{step.label}</div>
        <div className="muted">Fyll i eller bekräfta det här steget innan du går vidare.</div>
        <div className="content-gap">{content[step.key]}</div>
        <div className="wizard-actions">
          <button className="btn ghost" onClick={prev} disabled={current === 0}>← Tillbaka</button>
          <button className="btn primary" onClick={next}>{step.key === 'publish' ? 'Publicera schema' : 'Nästa steg →'}</button>
        </div>
      </section>
    </div>
  );
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

        <div className="card">
          <div className="section-title">Publicering</div>
          <div className="muted">Klart för granskning och låsning.</div>
          <div className="stack top-gap">
            <button className="btn primary wide">Publicera schema</button>
            <button className="btn ghost wide">Exportera Excel</button>
            <button className="btn ghost wide">Lås schema</button>
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

        <div className="stack top-gap">
          {[
            ['Bemanningsgrad', 98],
            ['Timbalans', 94],
            ['Helgrättvisa', 89],
            ['Kvällsrättvisa', 96],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="bar-head"><span>{label}</span><span>{value}%</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${value}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
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

      <div className="stack">
        <div className="card">
          <div className="section-title">Personalfunktioner</div>
          <div className="muted">Gör appen användbar även efter publicering.</div>
          <div className="stack top-gap">
            {personalCards.map((item) => (
              <div key={item.title} className="card feature-card compact">
                <div className="panel-value">{item.title}</div>
                <div className="muted">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Åtgärder</div>
          <div className="muted">Exempel på self-service i personalvy.</div>
          <div className="stack top-gap">
            <button className="btn primary wide">Önska ledighet</button>
            <button className="btn ghost wide">Begär passbyte</button>
            <button className="btn ghost wide">Se notiser</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="split-layout">
      <div className="card">
        <div className="section-title">Regelmotor</div>
        <div className="muted">Det som styr hur AI-motorn prioriterar planeringen.</div>
        <div className="stack top-gap">
          {[
            'Tillåt manuell override',
            'Markera svenska röda dagar',
            'Undvik tidigt pass efter kvällspass',
            'Föreslå kompdag automatiskt',
            'Låt chef publicera med mindre avvikelser',
          ].map((item) => (
            <label key={item} className="rule-card spread">
              <span>{item}</span>
              <input type="checkbox" defaultChecked />
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Motorns prioritering</div>
        <div className="muted">Gör det lätt att förstå varför schemat ser ut som det gör.</div>
        <div className="stack top-gap">
          {[
            '1. Bemanning säkras',
            '2. Hårda regler följs',
            '3. Timmar balanseras',
            '4. Helger fördelas rättvist',
            '5. Kvällar fördelas rättvist',
          ].map((label) => (
            <div key={label} className="card feature-card compact">{label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [role, setRole] = useState('chef');
  const [wizardStep, setWizardStep] = useState(0);

  const nav = role === 'chef'
    ? [['dashboard', 'Dashboard'], ['wizard', 'Planeringswizard'], ['engine', 'AI-motor'], ['settings', 'Regler']]
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
            <input className="search" placeholder="Sök person, butik, schema..." />
            <button className="hero-chip">Notiser</button>
            <div className="role-toggle">
              <button className={role === 'chef' ? 'active' : ''} onClick={() => setRole('chef')}>Chefsvy</button>
              <button className={role === 'personal' ? 'active' : ''} onClick={() => setRole('personal')}>Personalvy</button>
            </div>
          </div>
        </header>

        <nav className="top-nav">
          {nav.map(([key, label]) => (
            <button key={key} className={activeView === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>
          ))}
        </nav>

        {role === 'chef' && activeView === 'dashboard' && <Dashboard />}
        {role === 'chef' && activeView === 'wizard' && <Wizard current={wizardStep} setCurrent={setWizardStep} />}
        {activeView === 'engine' && <EngineView />}
        {role === 'chef' && activeView === 'settings' && <SettingsView />}
        {role === 'personal' && activeView === 'personal' && <PersonalView />}
      </div>
    </div>
  );
}
