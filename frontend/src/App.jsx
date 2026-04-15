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

function passClass(code) {
  if (code === 'K') return 'pass pass-k';
  if (code === 'H') return 'pass pass-h';
  if (code === 'L') return 'pass pass-l';
  if (code === 'T') return 'pass pass-t';
  return 'pass pass-d';
}

function KPI({ title, value, sub }) {
  return (
    <div className="glass card kpi">
      <div className="eyebrow">{title}</div>
      <div className="kpi-value">{value}</div>
      <div className="subtle">{sub}</div>
    </div>
  );
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
      <div className="two-col">
        <div className="glass panel">
          <div className="panel-title">Vald butik</div>
          <div className="big-number">Beijer Nacka</div>
          <div className="subtle">Byggvaruhus · Kassa, Färg och Järn</div>
        </div>
        <div className="glass panel">
          <div className="panel-title">Standardmall</div>
          <div className="big-number">Beijer standard</div>
          <div className="subtle">Öppettider, passstruktur och regler är förifyllda.</div>
        </div>
      </div>
    ),
    period: (
      <div className="two-col">
        <div className="glass panel">
          <div className="panel-title">Startdatum</div>
          <div className="big-number">1 sep 2026</div>
        </div>
        <div className="glass panel">
          <div className="panel-title">Slutdatum</div>
          <div className="big-number">31 dec 2026</div>
        </div>
      </div>
    ),
    staffing: (
      <div className="three-col">
        {[
          ['Kassa vardag', '2 personer'],
          ['Färg vardag', '1 person'],
          ['Järn vardag', '2 personer'],
          ['Kassa helg', '1 person'],
          ['Färg helg', '1 person'],
          ['Järn helg', '1 person'],
        ].map(([label, value]) => (
          <div key={label} className="glass panel">
            <div className="panel-title">{label}</div>
            <div className="panel-value">{value}</div>
          </div>
        ))}
      </div>
    ),
    rules: (
      <div className="two-col">
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
          <label key={r} className="glass rule-row">
            <input type="checkbox" defaultChecked />
            <span>{r}</span>
          </label>
        ))}
      </div>
    ),
    generate: (
      <div className="stack">
        <div className="three-col">
          {[
            ['Bemanningsgrad', '98%'],
            ['Helgrättvisa', '89%'],
            ['Kvällsrättvisa', '96%'],
          ].map(([label, value]) => (
            <div key={label} className="glass panel">
              <div className="panel-title">{label}</div>
              <div className="big-number">{value}</div>
            </div>
          ))}
        </div>
        <div className="glass panel highlighted">
          <div className="panel-title">AI-motorn</div>
          {isGenerating ? (
            <div className="stack">
              <div className="inline-row"><span className="spinner"></span><strong>Bygger schemat...</strong></div>
              <div className="glass mini">Analyserar bemanning</div>
              <div className="glass mini">Optimerar helgfördelning</div>
              <div className="glass mini">Balanserar kvällspass</div>
            </div>
          ) : (
            <>
              <div className="panel-value">Redo att generera första schemaversionen</div>
              <div className="subtle">Systemet väger bemanning, timmar, kvällar och helger mot regelverket.</div>
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
          <div key={text} className="glass alert-row">
            <span className={type === 'warning' ? 'status-dot warning' : 'status-dot ok'}></span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    ),
    publish: (
      <div className="stack">
        <div className="four-col">
          {[
            ['Period', 'Sep–Dec'],
            ['Personal', '15'],
            ['Avdelningar', '3'],
            ['Schemakvalitet', '93%'],
          ].map(([label, value]) => (
            <div key={label} className="glass panel">
              <div className="panel-title">{label}</div>
              <div className="big-number">{value}</div>
            </div>
          ))}
        </div>
        <div className="glass panel highlighted">
          <div className="panel-value">Redo att publiceras</div>
          <div className="subtle">Schemat är granskat och klart för publicering till chefsvy och personalvy.</div>
        </div>
      </div>
    ),
  };

  return (
    <div className="wizard-grid">
      <div className="glass card">
        <div className="card-head">
          <div>
            <div className="card-title">Planeringswizard</div>
            <div className="subtle">Guidat steg-för-steg-flöde för chef.</div>
          </div>
        </div>
        <div className="progress-wrap">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="subtle">Steg {current + 1} av {steps.length}</div>
        </div>
        <div className="step-list">
          {steps.map((s, i) => (
            <button key={s.key} className={`step-btn ${i === current ? 'active' : ''}`} onClick={() => setCurrent(i)}>
              <div className="step-index">Steg {i + 1}</div>
              <div className="step-label">{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass card">
        <div className="card-head">
          <div>
            <div className="card-title">{step.label}</div>
            <div className="subtle">Fyll i eller bekräfta det här steget innan du går vidare.</div>
          </div>
        </div>
        {content[step.key]}
        <div className="wizard-actions">
          <button className="btn ghost" onClick={prev} disabled={current === 0}>← Tillbaka</button>
          <button className="btn primary" onClick={next}>
            {step.key === 'publish' ? 'Publicera schema' : 'Nästa steg →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="layout-main">
      <div className="stack">
        <div className="four-col">
          <KPI title="Medarbetare" value="15" sub="3 avdelningar" />
          <KPI title="Schemakvalitet" value="93%" sub="Efter AI-optimering" />
          <KPI title="Avvikelser" value="2" sub="1 prioriterad" />
          <KPI title="Period" value="Sep–Dec" sub="18 veckor" />
        </div>

        <div className="glass card">
          <div className="card-head">
            <div>
              <div className="card-title">Publicerat schema</div>
              <div className="subtle">Chefsvy vecka 41 med timmar och avvikelser direkt i tabellen.</div>
            </div>
          </div>
          <div className="schedule-wrap">
            <div className="schedule-head">
              <div>Medarbetare</div>
              {days.map((d) => <div key={d}>{d}</div>)}
              <div>Timmar</div>
              <div>Avv.</div>
            </div>
            {schedule.map((row) => (
              <div key={row.name} className="schedule-row">
                <div className="glass employee">
                  <div className="employee-name">{row.name}</div>
                  <div className="subtle">{row.dept}</div>
                </div>
                {row.week.map((d, i) => <div key={i} className={passClass(d)}>{d}</div>)}
                <div className="glass metric">{row.hours}</div>
                <div className="glass metric">{row.deviations}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="glass card">
          <div className="card-head">
            <div>
              <div className="card-title">Avvikelsepanel</div>
              <div className="subtle">Det viktigaste för chefen före publicering.</div>
            </div>
          </div>
          <div className="stack">
            <div className="glass alert-row"><span className="status-dot warning"></span><span>David har högre helgbelastning vecka 42 än snittet.</span></div>
            <div className="glass alert-row"><span className="status-dot warning"></span><span>Marianne ligger något högre i helgbelastning på Järn.</span></div>
            <div className="glass alert-row"><span className="status-dot ok"></span><span>Kvällsregler uppfylls för Pia och Tobias.</span></div>
          </div>
        </div>

        <div className="glass card">
          <div className="card-head">
            <div>
              <div className="card-title">Publicering</div>
              <div className="subtle">Klart för granskning och låsning.</div>
            </div>
          </div>
          <div className="stack">
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
    <div className="two-main">
      <div className="glass card">
        <div className="card-head">
          <div>
            <div className="card-title">AI-schemamotor</div>
            <div className="subtle">Visar hur motorn bygger schemat steg för steg.</div>
          </div>
        </div>
        <div className="three-col">
          <div className="glass panel"><div className="panel-title">Motorstatus</div><div className="big-number">Aktiv</div></div>
          <div className="glass panel"><div className="panel-title">Kvalitet</div><div className="big-number">{avgScore}%</div></div>
          <div className="glass panel"><div className="panel-title">Iterationer</div><div className="big-number">3</div></div>
        </div>
        <div className="stack top-gap">
          {engineStages.map((stage, i) => (
            <button key={stage.title} className={`engine-stage ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
              <div>
                <div className="engine-title">{stage.title}</div>
                <div className="subtle">{stage.desc}</div>
              </div>
              <span className="badge">{stage.score}%</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass card">
        <div className="card-head">
          <div>
            <div className="card-title">Optimeringspanel</div>
            <div className="subtle">Gör motorn begriplig för verksamheten och utvecklingsteamet.</div>
          </div>
        </div>
        <div className="glass panel highlighted">
          <div className="panel-title">Aktivt steg</div>
          <div className="panel-value">{engineStages[active].title}</div>
          <div className="subtle">{engineStages[active].desc}</div>
        </div>
        <div className="stack top-gap">
          {[
            ['Bemanningsgrad', 98],
            ['Timbalans', 94],
            ['Helgrättvisa', 89],
            ['Kvällsrättvisa', 96],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="metric-head"><span>{label}</span><span>{value}%</span></div>
              <div className="bar"><div className="bar-fill" style={{ width: `${value}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonalView() {
  return (
    <div className="two-main">
      <div className="stack">
        <div className="three-col">
          <KPI title="Mitt nästa pass" value="Tors 10:30" sub="Kvällspass" />
          <KPI title="Veckotimmar" value="25 h" sub="Uppdaterat" />
          <KPI title="Status" value="Publicerat" sub="Vecka 41" />
        </div>

        <div className="glass card">
          <div className="card-head">
            <div>
              <div className="card-title">Min schemavy</div>
              <div className="subtle">Renare och enklare vy för medarbetare.</div>
            </div>
          </div>
          <div className="simple-head">
            {days.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="simple-grid">
            {['K', 'L', 'K', 'L', 'K', 'L', 'L'].map((code, i) => <div key={i} className={passClass(code)}>{code}</div>)}
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="glass card">
          <div className="card-head">
            <div>
              <div className="card-title">Personalfunktioner</div>
              <div className="subtle">Gör appen användbar även efter publicering.</div>
            </div>
          </div>
          <div className="stack">
            {personalCards.map((item) => (
              <div key={item.title} className="glass panel">
                <div className="panel-value">{item.title}</div>
                <div className="subtle">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass card">
          <div className="card-head">
            <div>
              <div className="card-title">Åtgärder</div>
              <div className="subtle">Exempel på self-service i personalvy.</div>
            </div>
          </div>
          <div className="stack">
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
    <div className="two-main">
      <div className="glass card">
        <div className="card-head">
          <div>
            <div className="card-title">Regelmotor</div>
            <div className="subtle">Det som styr hur AI-motorn prioriterar planeringen.</div>
          </div>
        </div>
        <div className="stack">
          {[
            'Tillåt manuell override',
            'Markera svenska röda dagar',
            'Undvik tidigt pass efter kvällspass',
            'Föreslå kompdag automatiskt',
            'Låt chef publicera med mindre avvikelser',
          ].map((item) => (
            <label key={item} className="glass rule-row spread">
              <span>{item}</span>
              <input type="checkbox" defaultChecked />
            </label>
          ))}
        </div>
      </div>

      <div className="glass card">
        <div className="card-head">
          <div>
            <div className="card-title">Motorns prioritering</div>
            <div className="subtle">Gör det lätt att förstå varför schemat ser ut som det gör.</div>
          </div>
        </div>
        <div className="stack">
          {[
            '1. Bemanning säkras',
            '2. Hårda regler följs',
            '3. Timmar balanseras',
            '4. Helger fördelas rättvist',
            '5. Kvällar fördelas rättvist',
          ].map((label) => (
            <div key={label} className="glass panel">{label}</div>
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
    ? [
        ['dashboard', 'Dashboard'],
        ['wizard', 'Planeringswizard'],
        ['engine', 'AI-motor'],
        ['settings', 'Regler'],
      ]
    : [
        ['personal', 'Min vy'],
        ['engine', 'AI-insikt'],
      ];

  const activeView = role === 'personal' && !['personal', 'engine'].includes(view) ? 'personal' : view;

  return (
    <div className="app-shell">
      <div className="bg-orb orb-a"></div>
      <div className="bg-orb orb-b"></div>
      <div className="bg-orb orb-c"></div>

      <div className="container">
        <div className="hero-glass">
          <div className="hero-copy">
            <div className="hero-tag">Beijer</div>
            <h1>Workforce Planner</h1>
            <p>High-end internapp för bemanningsplanering</p>
          </div>
          <div className="hero-actions">
            <div className="search-box">
              <input placeholder="Sök person, butik, schema..." />
            </div>
            <button className="btn ghost">Notiser</button>
            <div className="segmented">
              <button className={role === 'chef' ? 'active' : ''} onClick={() => setRole('chef')}>Chefsvy</button>
              <button className={role === 'personal' ? 'active' : ''} onClick={() => setRole('personal')}>Personalvy</button>
            </div>
          </div>
        </div>

        <div className="nav-glass">
          {nav.map(([key, label]) => (
            <button key={key} className={`nav-btn ${activeView === key ? 'active' : ''}`} onClick={() => setView(key)}>{label}</button>
          ))}
        </div>

        {role === 'chef' && activeView === 'dashboard' && <Dashboard />}
        {role === 'chef' && activeView === 'wizard' && <Wizard current={wizardStep} setCurrent={setWizardStep} />}
        {activeView === 'engine' && <EngineView />}
        {role === 'chef' && activeView === 'settings' && <SettingsView />}
        {role === 'personal' && activeView === 'personal' && <PersonalView />}
      </div>
    </div>
  );
}
