import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readState, writeState, ensureDataFile } from './store.js';
import { generateSchedule, scheduleSummary } from './scheduler.js';

ensureDataFile();
const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/state', (_req, res) => res.json(readState()));

app.put('/api/state/:section', (req, res) => {
  const state = readState();
  const section = req.params.section;
  if (!(section in state)) return res.status(404).send('Unknown section');
  state[section] = req.body;
  writeState(state);
  res.json(state);
});

app.post('/api/employees', (req, res) => {
  const state = readState();
  const nextId = Math.max(0, ...state.employees.map((e) => e.id || 0)) + 1;
  state.employees.push({ id: nextId, ...req.body });
  writeState(state);
  res.json(state);
});

app.post('/api/timeoff', (req, res) => {
  const state = readState();
  const nextId = Math.max(0, ...state.timeOff.map((e) => e.id || 0)) + 1;
  state.timeOff.push({ id: nextId, ...req.body });
  writeState(state);
  res.json(state);
});

app.post('/api/schedule/generate', (_req, res) => {
  const state = readState();
  state.schedule = generateSchedule(state);
  writeState(state);
  res.json(state);
});

app.post('/api/schedule/publish', (req, res) => {
  const state = readState();
  state.published = Boolean(req.body?.published);
  writeState(state);
  res.json(state);
});

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

app.get('/api/export/schedule', (_req, res) => {
  const state = readState();
  const header = ['date', 'day', 'week', 'dept', 'shiftCode', 'shiftName', 'start', 'end', 'employeeName'];
  const rows = state.schedule.map((row) => header.map((h) => csvEscape(row[h])).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="schedule.csv"');
  res.send(csv);
});

app.get('/api/export/summary', (_req, res) => {
  const state = readState();
  const summary = scheduleSummary(state);
  const header = ['name', 'dept', 'employmentPct', 'hours', 'evenings', 'weekends'];
  const rows = summary.map((row) => header.map((h) => csvEscape(row[h])).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="summary.csv"');
  res.send(csv);
});

app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
