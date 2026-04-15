import { getDb } from './db.js';

function parseSetting(row) {
  return row ? JSON.parse(row.value) : null;
}

async function getSetting(key) {
  const db = await getDb();
  const row = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
  return parseSetting(row);
}

export async function getUsersForDebug() {
  const db = await getDb();
  return db.all('SELECT id, email, role, displayName, employeeName FROM users ORDER BY id');
}

export async function getState() {
  const db = await getDb();
  const [store, period, staffing, rules, employees, timeOff, publishedRun] = await Promise.all([
    getSetting('store'),
    getSetting('period'),
    getSetting('staffing'),
    getSetting('rules'),
    db.all('SELECT id, name, dept, employmentPct, eveningOnly, weekendRule, active FROM employees ORDER BY id'),
    db.all('SELECT id, employeeName, type, fromDate as from, toDate as to FROM time_off ORDER BY fromDate'),
    db.get('SELECT id, published, qualityScore, metrics FROM schedule_runs WHERE published = 1 ORDER BY id DESC LIMIT 1')
  ]);

  let schedule = [];
  let engine = null;
  if (publishedRun) {
    schedule = await db.all('SELECT * FROM schedule_entries WHERE runId = ? ORDER BY date, dept, id', [publishedRun.id]);
    engine = { runId: publishedRun.id, qualityScore: publishedRun.qualityScore, metrics: JSON.parse(publishedRun.metrics) };
  } else {
    const latestRun = await db.get('SELECT id, published, qualityScore, metrics FROM schedule_runs ORDER BY id DESC LIMIT 1');
    if (latestRun) {
      schedule = await db.all('SELECT * FROM schedule_entries WHERE runId = ? ORDER BY date, dept, id', [latestRun.id]);
      engine = { runId: latestRun.id, qualityScore: latestRun.qualityScore, metrics: JSON.parse(latestRun.metrics) };
    }
  }

  return {
    store,
    period,
    staffing,
    rules,
    employees: employees.map((e) => ({ ...e, eveningOnly: Boolean(e.eveningOnly), active: Boolean(e.active) })),
    timeOff,
    schedule,
    published: Boolean(publishedRun),
    engine
  };
}

export async function updateSection(section, value) {
  const db = await getDb();
  const allowed = new Set(['store', 'period', 'staffing', 'rules']);
  if (!allowed.has(section)) throw new Error('Unknown section');
  await db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [section, JSON.stringify(value)]
  );
  return getState();
}

export async function addEmployee(employee) {
  const db = await getDb();
  await db.run(
    'INSERT INTO employees (name, dept, employmentPct, eveningOnly, weekendRule, active) VALUES (?, ?, ?, ?, ?, ?)',
    [employee.name, employee.dept, employee.employmentPct, employee.eveningOnly ? 1 : 0, employee.weekendRule, employee.active === false ? 0 : 1]
  );
  return getState();
}

export async function addTimeOff(timeOff) {
  const db = await getDb();
  await db.run(
    'INSERT INTO time_off (employeeName, type, fromDate, toDate) VALUES (?, ?, ?, ?)',
    [timeOff.employeeName, timeOff.type, timeOff.from, timeOff.to]
  );
  return getState();
}

export async function saveSchedule(scheduleRows, qualityScore, metrics) {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO schedule_runs (createdAt, published, qualityScore, metrics) VALUES (?, 0, ?, ?)',
    [new Date().toISOString(), qualityScore, JSON.stringify(metrics)]
  );
  const runId = result.lastID;
  for (const row of scheduleRows) {
    await db.run(
      `INSERT INTO schedule_entries (runId, date, day, week, dept, shiftCode, shiftName, start, end, employeeName, weekend, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [runId, row.date, row.day, row.week, row.dept, row.shiftCode, row.shiftName, row.start, row.end, row.employeeName, row.weekend ? 1 : 0, row.notes || null]
    );
  }
  return getState();
}

export async function publishRun(published) {
  const db = await getDb();
  const latestRun = await db.get('SELECT id FROM schedule_runs ORDER BY id DESC LIMIT 1');
  if (!latestRun) return getState();
  await db.run('UPDATE schedule_runs SET published = 0');
  if (published) {
    await db.run('UPDATE schedule_runs SET published = 1 WHERE id = ?', [latestRun.id]);
  }
  return getState();
}
