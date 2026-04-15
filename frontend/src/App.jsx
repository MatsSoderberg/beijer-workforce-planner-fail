import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  CalendarDays,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Download,
  Wand2,
  Bell,
  Search,
  UserRound,
  Sparkles,
  RefreshCw,
  Shuffle,
  ShieldCheck,
  Clock3,
  FileCheck2,
  Repeat,
  BarChart3,
  ArrowLeftRight,
  CalendarRange,
  Users,
  ChevronRight,
  ChevronLeft,
  Store,
} from 'lucide-react';

const brand = {
  yellow: '#FED141',
  yellowDeep: '#D8A900',
  ink: '#0E1116',
  text: 'rgba(255,255,255,0.96)',
  muted: 'rgba(255,255,255,0.72)',
  glass: 'rgba(255,255,255,0.10)',
  glassStrong: 'rgba(255,255,255,0.16)',
  border: 'rgba(255,255,255,0.18)',
};

const steps = [
  { key: 'store', label: 'Butik', icon: Store },
  { key: 'period', label: 'Period', icon: CalendarRange },
  { key: 'staffing', label: 'Bemanning', icon: Users },
  { key: 'rules', label: 'Regler', icon: ShieldCheck },
  { key: 'generate', label: 'Generera', icon: Sparkles },
  { key: 'review', label: 'Avvikelser', icon: AlertTriangle },
  { key: 'publish', label: 'Publicera', icon: FileCheck2 },
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
  { title: 'Laddar butiksmall', desc: 'Standardvärden för Nacka hämtas automatiskt.', score: 100, icon: Sparkles },
  { title: 'Tilldelar grundbemanning', desc: 'Minimibemanning per avdelning och dagtyp säkras.', score: 98, icon: Users },
  { title: 'Lägger helgrotation', desc: 'Varannan och var tredje helg fördelas enligt regelverk.', score: 91, icon: Repeat },
  { title: 'Optimerar kvällspass', desc: 'Kvällar balanseras utifrån kontrakt och återhämtning.', score: 96, icon: Clock3 },
  { title: 'Kontrollerar avvikelser', desc: 'Regelbrott, timavvikelser och belastning flaggas.', score: 93, icon: ShieldCheck },
  { title: 'Förbereder publicering', desc: 'Schemat låses för granskning och skickas till chefsvy.', score: 93, icon: FileCheck2 },
];

const personalCards = [
  { title: 'Mitt schema', text: 'Se publicerat schema vecka för vecka med tydliga passkoder.', icon: CalendarDays },
  { title: 'Ledighetsönskemål', text: 'Skicka önskemål om semester eller ledighet direkt i appen.', icon: CalendarRange },
  { title: 'Passbyte', text: 'Begär eller godkänn passbyten med kollegor.', icon: ArrowLeftRight },
  { title: 'Notiser', text: 'Få besked när nytt schema publiceras eller ändras.', icon: Bell },
];

function glassCardClass() {
  return 'rounded-3xl border shadow-2xl backdrop-blur-2xl bg-white/10';
}

function glassCardStyle() {
  return { borderColor: brand.border, boxShadow: '0 24px 80px rgba(0,0,0,0.28)' };
}

function passStyle(code) {
  if (code === 'K') return { background: 'linear-gradient(135deg, rgba(159,121,1,0.34), rgba(254,209,65,0.22))', color: '#111' };
  if (code === 'H') return { background: 'linear-gradient(135deg, rgba(254,209,65,0.82), rgba(255,246,199,0.95))', color: '#111' };
  if (code === 'L') return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.68)' };
  if (code === 'T') return { background: 'linear-gradient(135deg, rgba(208,211,212,0.40), rgba(255,255,255,0.14))', color: '#fff' };
  return { background: 'linear-gradient(135deg, rgba(124,135,142,0.30), rgba(255,255,255,0.12))', color: '#fff' };
}

function KPI({ title, value, sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className={glassCardClass()} style={glassCardStyle()}>
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-[0.14em]" style={{ color: brand.muted }}>{title}</div>
          <div className="mt-2 text-3xl font-semibold" style={{ color: brand.text }}>{value}</div>
          {sub && <div className="mt-1 text-sm" style={{ color: brand.muted }}>{sub}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Header({ role, setRole }) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border shadow-2xl backdrop-blur-2xl" style={{ borderColor: brand.border, background: 'linear-gradient(135deg, rgba(254,209,65,0.92), rgba(255,248,221,0.34) 42%, rgba(255,255,255,0.08) 100%)', boxShadow: '0 28px 90px rgba(0,0,0,0.30)' }}>
      <motion.div
        className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full blur-2xl"
        animate={{ x: [0, 22, 0], y: [0, 16, 0], opacity: [0.28, 0.48, 0.28] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.12) 55%, transparent 72%)' }}
      />
      <motion.div
        className="pointer-events-none absolute right-[-40px] top-[-20px] h-72 w-72 rounded-full blur-3xl"
        animate={{ x: [0, -24, 0], y: [0, 12, 0], opacity: [0.14, 0.30, 0.14] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 50%, transparent 74%)' }}
      />
      <div className="relative flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-black/70">Beijer</div>
          <div className="text-3xl font-semibold text-black md:text-4xl">Workforce Planner</div>
          <div className="mt-1 text-sm text-black/70">High-end internapp för bemanningsplanering</div>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <Input placeholder="Sök person, butik, schema..." className="w-64 rounded-2xl border-white/40 bg-white/45 pl-9 text-neutral-900 placeholder:text-neutral-600 backdrop-blur-md" />
          </div>
          <Button variant="outline" className="rounded-2xl border-white/40 bg-white/45 text-neutral-900 hover:bg-white/65 backdrop-blur-md"><Bell className="mr-2 h-4 w-4" />Notiser</Button>
          <div className="flex rounded-2xl border border-white/30 bg-white/30 p-1 backdrop-blur-md">
            <button onClick={() => setRole('chef')} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${role === 'chef' ? 'bg-black text-white shadow-sm' : 'text-neutral-900/85 hover:bg-white/45'}`}>Chefsvy</button>
            <button onClick={() => setRole('personal')} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${role === 'personal' ? 'bg-black text-white shadow-sm' : 'text-neutral-900/85 hover:bg-white/45'}`}>Personalvy</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <KPI title="Medarbetare" value="15" sub="3 avdelningar" />
          <KPI title="Schemakvalitet" value="93%" sub="Efter AI-optimering" />
          <KPI title="Avvikelser" value="2" sub="1 prioriterad" />
          <KPI title="Period" value="Sep–Dec" sub="18 veckor" />
        </div>

        <Card className={glassCardClass()} style={glassCardStyle()}>
          <CardHeader>
            <CardTitle style={{ color: brand.text }}>Publicerat schema</CardTitle>
            <CardDescription style={{ color: brand.muted }}>Chefsvy vecka 41 med timmar och avvikelser direkt i tabellen.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[1050px]">
              <div className="mb-2 grid grid-cols-[180px_repeat(7,1fr)_100px_110px] gap-2 text-xs" style={{ color: brand.muted }}>
                <div>Medarbetare</div>
                {days.map((d) => <div key={d}>{d}</div>)}
                <div>Timmar</div>
                <div>Avv.</div>
              </div>
              <div className="space-y-2">
                {schedule.map((row) => (
                  <div key={row.name} className="grid grid-cols-[180px_repeat(7,1fr)_100px_110px] gap-2">
                    <div className="rounded-xl border bg-white/12 px-3 py-2 backdrop-blur-md" style={{ borderColor: brand.border }}>
                      <div className="font-medium" style={{ color: brand.text }}>{row.name}</div>
                      <div className="text-xs" style={{ color: brand.muted }}>{row.dept}</div>
                    </div>
                    {row.week.map((d, i) => (
                      <div key={i} className="rounded-xl py-2 text-center font-semibold" style={passStyle(d)}>{d}</div>
                    ))}
                    <div className="rounded-xl border bg-white/12 py-2 text-center backdrop-blur-md" style={{ borderColor: brand.border, color: brand.text }}>{row.hours}</div>
                    <div className="rounded-xl border bg-white/12 py-2 text-center backdrop-blur-md" style={{ borderColor: brand.border, color: brand.text }}>{row.deviations}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className={glassCardClass()} style={glassCardStyle()}>
          <CardHeader>
            <CardTitle style={{ color: brand.text }}>Avvikelsepanel</CardTitle>
            <CardDescription style={{ color: brand.muted }}>Det viktigaste för chefen före publicering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 rounded-xl border bg-white/8 p-3 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <AlertTriangle className="mt-0.5 text-amber-400" />
              <div className="text-sm" style={{ color: brand.text }}>David har högre helgbelastning vecka 42 än snittet.</div>
            </div>
            <div className="flex gap-3 rounded-xl border bg-white/8 p-3 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <AlertTriangle className="mt-0.5 text-amber-400" />
              <div className="text-sm" style={{ color: brand.text }}>Marianne ligger något högre i helgbelastning på Järn.</div>
            </div>
            <div className="flex gap-3 rounded-xl border bg-white/8 p-3 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <CheckCircle2 className="mt-0.5 text-green-400" />
              <div className="text-sm" style={{ color: brand.text }}>Kvällsregler uppfylls för Pia och Tobias.</div>
            </div>
          </CardContent>
        </Card>

        <Card className={glassCardClass()} style={glassCardStyle()}>
          <CardHeader>
            <CardTitle style={{ color: brand.text }}>Publicering</CardTitle>
            <CardDescription style={{ color: brand.muted }}>Klart för granskning och låsning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full rounded-2xl border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #FED141, #E8B800)', color: '#111' }}>Publicera schema</Button>
            <Button variant="outline" className="w-full rounded-2xl border-white/20 bg-white/6 text-white hover:bg-white/12"><Download className="mr-2 h-4 w-4" />Exportera Excel</Button>
            <Button variant="outline" className="w-full rounded-2xl border-white/20 bg-white/6 text-white hover:bg-white/12"><Lock className="mr-2 h-4 w-4" />Lås schema</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WizardStepPanel({ current, setCurrent }) {
  const step = steps[current];
  const StepIcon = step.icon;
  const progress = ((current + 1) / steps.length) * 100;
  const [isGenerating, setIsGenerating] = useState(false);

  const next = () => {
    if (step.key === 'generate') {
      setIsGenerating(true);
      setTimeout(() => {
        setIsGenerating(false);
        setCurrent(Math.min(current + 1, steps.length - 1));
      }, 2200);
      return;
    }
    setCurrent(Math.min(current + 1, steps.length - 1));
  };

  const prev = () => setCurrent(Math.max(current - 1, 0));

  const content = {
    store: (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white/8 p-5 backdrop-blur-md" style={{ borderColor: brand.border }}>
          <div className="text-sm font-semibold" style={{ color: brand.text }}>Vald butik</div>
          <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>Beijer Nacka</div>
          <div className="mt-1 text-sm" style={{ color: brand.muted }}>Byggvaruhus · Kassa, Färg och Järn</div>
        </div>
        <div className="rounded-2xl border bg-white/8 p-5 backdrop-blur-md" style={{ borderColor: brand.border }}>
          <div className="text-sm font-semibold" style={{ color: brand.text }}>Standardmall</div>
          <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>Beijer standard</div>
          <div className="mt-1 text-sm" style={{ color: brand.muted }}>Öppettider, passstruktur och regler är förifyllda.</div>
        </div>
      </div>
    ),
    period: (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white/8 p-5 backdrop-blur-md" style={{ borderColor: brand.border }}>
          <div className="text-sm font-semibold" style={{ color: brand.text }}>Startdatum</div>
          <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>1 sep 2026</div>
        </div>
        <div className="rounded-2xl border bg-white/8 p-5 backdrop-blur-md" style={{ borderColor: brand.border }}>
          <div className="text-sm font-semibold" style={{ color: brand.text }}>Slutdatum</div>
          <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>31 dec 2026</div>
        </div>
      </div>
    ),
    staffing: (
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Kassa vardag', '2 personer'],
          ['Färg vardag', '1 person'],
          ['Järn vardag', '2 personer'],
          ['Kassa helg', '1 person'],
          ['Färg helg', '1 person'],
          ['Järn helg', '1 person'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white/8 p-5 backdrop-blur-md" style={{ borderColor: brand.border }}>
            <div className="text-sm" style={{ color: brand.muted }}>{label}</div>
            <div className="mt-2 text-xl font-semibold" style={{ color: brand.text }}>{value}</div>
          </div>
        ))}
      </div>
    ),
    rules: (
      <div className="grid gap-3 md:grid-cols-2">
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
          <div key={r} className="flex items-center gap-3 rounded-xl border bg-white/8 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
            <Switch defaultChecked />
            <div className="text-sm" style={{ color: brand.text }}>{r}</div>
          </div>
        ))}
      </div>
    ),
    generate: (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Bemanningsgrad', '98%'],
            ['Helgrättvisa', '89%'],
            ['Kvällsrättvisa', '96%'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-white/8 p-5 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <div className="text-sm" style={{ color: brand.muted }}>{label}</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>{value}</div>
            </div>
          ))}
        </div>
        {isGenerating ? (
          <div className="rounded-2xl border bg-white/10 p-6 backdrop-blur-md" style={{ borderColor: 'rgba(254,209,65,0.35)' }}>
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-yellow-300" />
              <div className="text-lg font-semibold" style={{ color: brand.text }}>AI-motorn bygger schemat</div>
            </div>
            <div className="mt-4 space-y-3">
              {['Analyserar bemanning', 'Optimerar helgfördelning', 'Balanserar kvällspass'].map((line) => (
                <div key={line} className="flex items-center gap-3 rounded-xl bg-white/6 p-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span style={{ color: brand.text }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white/8 p-6 backdrop-blur-md" style={{ borderColor: brand.border }}>
            <div className="text-lg font-semibold" style={{ color: brand.text }}>Redo att generera första schemaversionen</div>
            <div className="mt-1 text-sm" style={{ color: brand.muted }}>Systemet kommer nu att väga bemanning, timmar, kvällar och helger mot regelverket.</div>
          </div>
        )}
      </div>
    ),
    review: (
      <div className="space-y-3">
        {[
          ['warning', 'David har högre helgbelastning vecka 42 än snittet.'],
          ['warning', 'Marianne ligger något högre i helgbelastning på Järn.'],
          ['ok', 'Kvällsregler uppfylls för Pia och Tobias.'],
        ].map(([type, text]) => (
          <div key={text} className="flex gap-3 rounded-xl border bg-white/8 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
            {type === 'warning' ? <AlertTriangle className="mt-0.5 text-amber-400" /> : <CheckCircle2 className="mt-0.5 text-green-400" />}
            <div className="text-sm" style={{ color: brand.text }}>{text}</div>
          </div>
        ))}
      </div>
    ),
    publish: (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Period', 'Sep–Dec'],
            ['Personal', '15'],
            ['Avdelningar', '3'],
            ['Schemakvalitet', '93%'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-white/8 p-5 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <div className="text-sm" style={{ color: brand.muted }}>{label}</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-white/10 p-6 backdrop-blur-md" style={{ borderColor: 'rgba(254,209,65,0.35)' }}>
          <div className="flex items-center gap-3">
            <FileCheck2 className="text-green-400" />
            <div className="text-lg font-semibold" style={{ color: brand.text }}>Redo att publiceras</div>
          </div>
          <div className="mt-2 text-sm" style={{ color: brand.muted }}>Schemat är granskat och klart för publicering till chefsvy och personalvy.</div>
        </div>
      </div>
    ),
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Card className={glassCardClass()} style={glassCardStyle()}>
        <CardHeader>
          <CardTitle style={{ color: brand.text }}>Planeringswizard</CardTitle>
          <CardDescription style={{ color: brand.muted }}>Guidat steg-för-steg-flöde för chef.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={progress} />
          <div className="text-sm" style={{ color: brand.muted }}>Steg {current + 1} av {steps.length}</div>
          <div className="space-y-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <button key={s.key} onClick={() => setCurrent(i)} className={`w-full rounded-2xl border px-3 py-3 text-left transition ${i === current ? 'bg-white/18' : 'bg-transparent hover:bg-white/8'}`} style={{ borderColor: i === current ? 'rgba(254,209,65,0.40)' : 'transparent' }}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl p-2" style={{ background: i === current ? 'rgba(254,209,65,0.90)' : 'rgba(255,255,255,0.10)', color: i === current ? '#111' : '#fff' }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: brand.muted }}>Steg {i + 1}</div>
                      <div className="font-medium" style={{ color: brand.text }}>{s.label}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={glassCardClass()} style={glassCardStyle()}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'rgba(254,209,65,0.90)', color: '#111' }}>
              <StepIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle style={{ color: brand.text }}>{step.label}</CardTitle>
              <CardDescription style={{ color: brand.muted }}>Fyll i eller bekräfta det här steget innan du går vidare.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.24 }}
            >
              {content[step.key]}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-3">
            <Button variant="outline" onClick={prev} disabled={current === 0} className="rounded-2xl border-white/20 bg-white/6 text-white hover:bg-white/12 disabled:opacity-40">
              <ChevronLeft className="mr-2 h-4 w-4" /> Tillbaka
            </Button>
            <Button onClick={next} className="rounded-2xl border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #FED141, #E8B800)', color: '#111' }}>
              {step.key === 'publish' ? 'Publicera schema' : 'Nästa steg'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EngineView() {
  const [active, setActive] = useState(3);
  const avgScore = useMemo(() => Math.round(engineStages.reduce((a, b) => a + b.score, 0) / engineStages.length), []);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className={glassCardClass()} style={glassCardStyle()}>
        <CardHeader>
          <CardTitle style={{ color: brand.text }}>AI-schemamotor</CardTitle>
          <CardDescription style={{ color: brand.muted }}>Visar hur motorn bygger schemat steg för steg.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-white/10 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <div className="text-xs uppercase" style={{ color: brand.muted }}>Motorstatus</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>Aktiv</div>
            </div>
            <div className="rounded-2xl border bg-white/10 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <div className="text-xs uppercase" style={{ color: brand.muted }}>Kvalitet</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>{avgScore}%</div>
            </div>
            <div className="rounded-2xl border bg-white/10 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <div className="text-xs uppercase" style={{ color: brand.muted }}>Iterationer</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: brand.text }}>3</div>
            </div>
          </div>

          <div className="space-y-3">
            {engineStages.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = i === active;
              return (
                <button key={stage.title} onClick={() => setActive(i)} className={`w-full rounded-2xl border p-4 text-left transition ${isActive ? 'bg-white/18' : 'bg-white/8 hover:bg-white/12'}`} style={{ borderColor: isActive ? 'rgba(254,209,65,0.55)' : brand.border }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="rounded-xl p-2" style={{ background: isActive ? brand.yellow : 'rgba(255,255,255,0.12)', color: isActive ? '#111' : '#fff' }}><Icon className="h-4 w-4" /></div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: brand.text }}>{stage.title}</div>
                        <div className="mt-1 text-sm" style={{ color: brand.muted }}>{stage.desc}</div>
                      </div>
                    </div>
                    <Badge variant="secondary">{stage.score}%</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={glassCardClass()} style={glassCardStyle()}>
        <CardHeader>
          <CardTitle style={{ color: brand.text }}>Optimeringspanel</CardTitle>
          <CardDescription style={{ color: brand.muted }}>Gör motorn begriplig för verksamheten och utvecklingsteamet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border bg-white/12 p-5 backdrop-blur-md" style={{ borderColor: 'rgba(254,209,65,0.32)' }}>
            <div className="text-sm font-semibold" style={{ color: brand.text }}>Aktivt steg: {engineStages[active].title}</div>
            <div className="mt-1 text-sm" style={{ color: brand.muted }}>{engineStages[active].desc}</div>
          </div>

          <div className="space-y-4">
            {[
              ['Bemanningsgrad', 98, Users],
              ['Timbalans', 94, BarChart3],
              ['Helgrättvisa', 89, Repeat],
              ['Kvällsrättvisa', 96, Clock3],
            ].map(([label, value, Icon]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-sm" style={{ color: brand.text }}>
                  <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ background: 'linear-gradient(90deg, #FED141, #E8B800)' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" className="rounded-2xl border-white/20 bg-white/6 text-white hover:bg-white/12"><RefreshCw className="mr-2 h-4 w-4" />Kör om</Button>
            <Button variant="outline" className="rounded-2xl border-white/20 bg-white/6 text-white hover:bg-white/12"><Shuffle className="mr-2 h-4 w-4" />Justera viktning</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PersonalView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <KPI title="Mitt nästa pass" value="Tors 10:30" sub="Kvällspass" />
          <KPI title="Veckotimmar" value="25 h" sub="Uppdaterat" />
          <KPI title="Status" value="Publicerat" sub="Vecka 41" />
        </div>

        <Card className={glassCardClass()} style={glassCardStyle()}>
          <CardHeader>
            <CardTitle style={{ color: brand.text }}>Min schemavy</CardTitle>
            <CardDescription style={{ color: brand.muted }}>Renare och enklare vy för medarbetare.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-7 gap-2 text-xs" style={{ color: brand.muted }}>
              {days.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['K', 'L', 'K', 'L', 'K', 'L', 'L'].map((code, i) => (
                <div key={i} className="rounded-2xl py-4 text-center font-semibold" style={passStyle(code)}>{code}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className={glassCardClass()} style={glassCardStyle()}>
          <CardHeader>
            <CardTitle style={{ color: brand.text }}>Personalfunktioner</CardTitle>
            <CardDescription style={{ color: brand.muted }}>Gör appen användbar även efter publicering.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {personalCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border bg-white/8 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
                  <div className="rounded-xl p-2" style={{ background: 'rgba(254,209,65,0.22)', color: '#111' }}><Icon className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: brand.text }}>{item.title}</div>
                    <div className="mt-1 text-sm" style={{ color: brand.muted }}>{item.text}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className={glassCardClass()} style={glassCardStyle()}>
          <CardHeader>
            <CardTitle style={{ color: brand.text }}>Åtgärder</CardTitle>
            <CardDescription style={{ color: brand.muted }}>Exempel på self-service i personalvy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full rounded-2xl border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #FED141, #E8B800)', color: '#111' }}><CalendarRange className="mr-2 h-4 w-4" />Önska ledighet</Button>
            <Button variant="outline" className="w-full rounded-2xl border-white/20 bg-white/6 text-white hover:bg-white/12"><ArrowLeftRight className="mr-2 h-4 w-4" />Begär passbyte</Button>
            <Button variant="outline" className="w-full rounded-2xl border-white/20 bg-white/6 text-white hover:bg-white/12"><Bell className="mr-2 h-4 w-4" />Se notiser</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className={glassCardClass()} style={glassCardStyle()}>
        <CardHeader>
          <CardTitle style={{ color: brand.text }}>Regelmotor</CardTitle>
          <CardDescription style={{ color: brand.muted }}>Det som styr hur AI-motorn prioriterar planeringen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            'Tillåt manuell override',
            'Markera svenska röda dagar',
            'Undvik tidigt pass efter kvällspass',
            'Föreslå kompdag automatiskt',
            'Låt chef publicera med mindre avvikelser',
          ].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl border bg-white/8 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <span className="text-sm" style={{ color: brand.text }}>{item}</span>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={glassCardClass()} style={glassCardStyle()}>
        <CardHeader>
          <CardTitle style={{ color: brand.text }}>Motorns prioritering</CardTitle>
          <CardDescription style={{ color: brand.muted }}>Gör det lätt att förstå varför schemat ser ut som det gör.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ['1. Bemanning säkras', Users],
            ['2. Hårda regler följs', ShieldCheck],
            ['3. Timmar balanseras', BarChart3],
            ['4. Helger fördelas rättvist', Repeat],
            ['5. Kvällar fördelas rättvist', Clock3],
          ].map(([label, Icon]) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border bg-white/10 p-4 backdrop-blur-md" style={{ borderColor: brand.border }}>
              <Icon className="h-4 w-4 text-white" />
              <span className="text-sm" style={{ color: brand.text }}>{label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlannerHighEndV4() {
  const [view, setView] = useState('dashboard');
  const [role, setRole] = useState('chef');
  const [wizardStep, setWizardStep] = useState(0);

  const nav = role === 'chef'
    ? [
        { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { key: 'wizard', icon: Wand2, label: 'Planeringswizard' },
        { key: 'engine', icon: Sparkles, label: 'AI-motor' },
        { key: 'settings', icon: Settings2, label: 'Regler' },
      ]
    : [
        { key: 'personal', icon: UserRound, label: 'Min vy' },
        { key: 'engine', icon: Sparkles, label: 'AI-insikt' },
      ];

  const activeView = role === 'personal' && !['personal', 'engine'].includes(view) ? 'personal' : view;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(254,209,65,0.10), transparent 24%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.08), transparent 22%), radial-gradient(circle at 70% 70%, rgba(159,121,1,0.12), transparent 24%), linear-gradient(180deg, #0B0F14 0%, #121926 100%)' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[-8%] top-[8%] h-[340px] w-[340px] rounded-full blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, -20, 0], opacity: [0.18, 0.30, 0.18] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(circle, rgba(254,209,65,0.48) 0%, rgba(254,209,65,0.06) 56%, transparent 72%)' }}
        />
        <motion.div
          className="absolute right-[-6%] top-[18%] h-[300px] w-[300px] rounded-full blur-3xl"
          animate={{ x: [0, -26, 0], y: [0, 24, 0], opacity: [0.12, 0.24, 0.12] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.04) 52%, transparent 72%)' }}
        />
        <motion.div
          className="absolute left-[35%] bottom-[-8%] h-[320px] w-[320px] rounded-full blur-3xl"
          animate={{ x: [0, -18, 0], y: [0, 12, 0], opacity: [0.10, 0.18, 0.10] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(circle, rgba(159,121,1,0.42) 0%, rgba(159,121,1,0.04) 50%, transparent 72%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] space-y-6 p-6">
        <Header role={role} setRole={setRole} />

        <div className="flex flex-wrap gap-2 rounded-3xl border p-2 backdrop-blur-xl bg-white/8" style={{ borderColor: brand.border, boxShadow: '0 16px 50px rgba(0,0,0,0.18)' }}>
          {nav.map((n) => (
            <Button key={n.key} variant={activeView === n.key ? 'default' : 'outline'} onClick={() => setView(n.key)} className={`rounded-2xl ${activeView === n.key ? 'bg-white text-black hover:bg-white' : 'border-white/20 bg-white/6 text-white hover:bg-white/12'}`}>
              <n.icon className="mr-2 h-4 w-4" />
              {n.label}
            </Button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {role === 'chef' && activeView === 'dashboard' && <Dashboard />}
          {role === 'chef' && activeView === 'wizard' && <WizardStepPanel current={wizardStep} setCurrent={setWizardStep} />}
          {activeView === 'engine' && <EngineView />}
          {role === 'chef' && activeView === 'settings' && <SettingsView />}
          {role === 'personal' && activeView === 'personal' && <PersonalView />}
        </motion.div>
      </div>
    </div>
  );
}
