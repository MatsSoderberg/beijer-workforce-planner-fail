import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { login, requireAuth, requireChef } from './auth.js';
import { getState, updateSection, addEmployee, addTimeOff, saveSchedule, publishRun } from './repository.js';
import { generateSchedule, scheduleSummary } from './scheduler.js';
import { getDb, resetDatabase } from './db.js';

await getDb();
const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await login(req.body?.email, req.body?.password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/state', requireAuth, async (req, res) => {
  const state = await getState();
  if (req.user.role === 'personal' && req.user.employeeName) {
    state.schedule = state.schedule.filter((row) => row.employeeName === req.user.employeeName);
    state.employees = state.employees.filter((emp) => emp.name === req.user.employeeName);
    state.timeOff = state.timeOff.filter((row) => row.employeeName === req.user.employeeName);
  }
  res.json(state);
});

app.put('/api/state/:section', requireAuth, requireChef, async (req, res) => {
  try {
    res.json(await updateSection(req.params.section, req.body));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/employees', requireAuth, requireChef, async (req, res) => {
  res.json(await addEmployee(req.body));
});

app.post('/api/timeoff', requireAuth, async (req, res) => {
  const payload = req.user.role === 'personal' && req.user.employeeName
    ? { ...req.body, employeeName: req.user.employeeName }
    : req.body;
  res.json(await addTimeOff(payload));
});

app.post('/api/schedule/generate', requireAuth, requireChef, async (_req, res) => {
  const state = await getState();
  const generated = generateSchedule(state);
  res.json(await saveSchedule(generated.schedule, generated.metrics.qualityScore, generated.metrics));
});

app.post('/api/schedule/publish', requireAuth, requireChef, async (req, res) => {
  res.json(await publishRun(Boolean(req.body?.published)));
});

app.post('/api/admin/reset', requireAuth, requireChef, async (_req, res) => {
  await resetDatabase();
  res.json(await getState());
});

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

app.get('/api/export/schedule', requireAuth, async (req, res) => {
  const state = await getState();
  const rows = req.user.role === 'personal' && req.user.employeeName
    ? state.schedule.filter((row) => row.employeeName === req.user.employeeName)
    : state.schedule;
  const header = ['date', 'day', 'week', 'dept', 'shiftCode', 'shiftName', 'start', 'end', 'employeeName'];
  const csvRows = rows.map((row) => header.map((h) => csvEscape(row[h])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="schedule.csv"');
  res.send([header.join(','), ...csvRows].join('\n'));
});

app.get('/api/export/summary', requireAuth, requireChef, async (_req, res) => {
  const state = await getState();
  const summary = scheduleSummary(state);
  const header = ['name', 'dept', 'employmentPct', 'hours', 'evenings', 'weekends'];
  const csvRows = summary.map((row) => header.map((h) => csvEscape(row[h])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="summary.csv"');
  res.send([header.join(','), ...csvRows].join('\n'));
});

app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
