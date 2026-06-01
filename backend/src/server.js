import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { login, requireAuth, requireChef } from './auth.js';
import { getState, updateSection, addEmployee, addTimeOff, saveSchedule, publishRun } from './repository.js';
import { generateSchedule, scheduleSummary } from './scheduler.js';
import { getDb, resetDatabase } from './db.js';
import { initDb, pool } from "./db.js";
import ExcelJS from 'exceljs';
await getDb();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json({ limit: "25mb" }));

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

  const rows =
    req.user.role === 'personal' && req.user.employeeName
      ? state.schedule.filter(
          (row) => row.employeeName === req.user.employeeName
        )
      : state.schedule;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Beijer Workforce Planner';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Schema');

  const dates = rows[0]?.assignments?.map((a) => a.date) || [];

  sheet.columns = [
    { header: 'Medarbetare', key: 'employee', width: 20 },
    { header: 'Avdelning', key: 'department', width: 14 },
    ...dates.map((d) => ({
      header: d,
      key: d,
      width: 14,
    })),
    { header: 'Timmar', key: 'hours', width: 10 },
  ];

  function getDepartmentColor(dept = '') {
    const d = dept.toLowerCase();

    if (d.includes('kassa')) return '6D5BA8';
    if (d.includes('färg')) return '2E8B57';
    if (d.includes('järn')) return 'C98A2E';
    if (d.includes('lager')) return '4682B4';

    return '666666';
  }

  function getShiftColor(code) {
    switch (code) {
      case 'T':
        return 'B8A63B';
      case 'M':
        return '3F78B4';
      case 'D':
        return '3F9B58';
      case 'N':
        return '6F4BB8';
      case 'K':
        return 'A54B4B';
      case 'H':
        return 'D97E2F';
      case 'L':
        return '888888';
      default:
        return '444444';
    }
  }

  rows.forEach((row) => {
    const excelRow = {
      employee: row.employeeName,
      department: row.department,
      hours: row.totals?.hours || 0,
    };

    row.assignments.forEach((a) => {
      excelRow[a.date] =
        a.code === 'L'
          ? 'Ledig'
          : `${a.start || ''}-${a.end || ''}`;
    });

    const addedRow = sheet.addRow(excelRow);

    // Avdelningsfärg
    const deptCell = addedRow.getCell(2);

    deptCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: getDepartmentColor(row.department),
      },
    };

    deptCell.font = {
      color: { argb: 'FFFFFF' },
      bold: true,
    };

    // Passfärger
    row.assignments.forEach((a, idx) => {
      const cell = addedRow.getCell(idx + 3);

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: getShiftColor(a.code),
        },
      };

      cell.font = {
        color: { argb: 'FFFFFF' },
        bold: true,
      };

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
    });
  });

  // Header styling
  const header = sheet.getRow(1);

  header.font = {
    bold: true,
    color: { argb: '000000' },
  };

  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: 'FED141',
    },
  };

  // Freeze top row
  sheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
      xSplit: 2,
    },
  ];

  // Filter
  sheet.autoFilter = {
    from: 'A1',
    to: sheet.getRow(1).lastCell.address,
  };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=beijer_schedule.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
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

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

app.get("/api/planner-state", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT generated_json
      FROM generated_schedules
      ORDER BY created_at DESC
      LIMIT 1
    `);

    res.json(result.rows[0]?.generated_json || null);
  } catch (err) {
    console.error("Failed to load planner state", err);
    res.status(500).json({ error: "Failed to load planner state" });
  }
});

app.post("/api/planner-state", async (req, res) => {
  try {
    const incoming = req.body || {};

    const latest = await pool.query(`
      SELECT generated_json
      FROM generated_schedules
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const previous = latest.rows[0]?.generated_json || {};

    const payload = {
      ...previous,
      ...incoming,
      employees: incoming.employees || previous.employees || [],
      preferences: incoming.preferences || previous.preferences || {},
      generatedSchedule:
        incoming.generatedSchedule !== undefined
          ? incoming.generatedSchedule
          : previous.generatedSchedule || null,
      savedAt: new Date().toISOString(),
    };

    await pool.query(
      `
      INSERT INTO generated_schedules (
        start_date,
        end_date,
        generated_json,
        published
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        payload?.period?.startDate || payload?.generatedSchedule?.metadata?.startDate || null,
        payload?.period?.endDate || payload?.generatedSchedule?.metadata?.endDate || null,
        payload,
        false,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save planner state", err);
    res.status(500).json({ error: "Failed to save planner state" });
  }
});

app.get("/api/rule-packages", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, department, payload, imported_at
      FROM rule_packages
      ORDER BY imported_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to load rule packages", err);
    res.status(500).json({ error: "Failed to load rule packages" });
  }
});

app.post("/api/rule-packages", async (req, res) => {
  try {
    const pkg = req.body;

    await pool.query(
      `
      INSERT INTO rule_packages (
        id,
        name,
        department,
        payload,
        imported_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        department = EXCLUDED.department,
        payload = EXCLUDED.payload,
        imported_at = NOW()
      `,
      [
        pkg.id,
        pkg.name || "Namnlöst regelpaket",
        pkg.department || "Okänd avdelning",
        pkg,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save rule package", err);
    res.status(500).json({ error: "Failed to save rule package" });
  }
});

app.delete("/api/rule-packages/:id", async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM rule_packages WHERE id = $1`,
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete rule package", err);
    res.status(500).json({ error: "Failed to delete rule package" });
  }
});
app.get("/api/schedules", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        version,
        title,
        comment,
        status,
        published,
        generated_by,
        start_date,
        end_date,
        created_at,
        generated_json
      FROM generated_schedules
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to load schedules", err);
    res.status(500).json({ error: "Failed to load schedules" });
  }
});
app.post("/api/schedules", async (req, res) => {
  try {
    const payload = req.body;

    const latest = await pool.query(`
      SELECT MAX(version) AS max_version
      FROM generated_schedules
    `);

    const nextVersion =
      (latest.rows[0]?.max_version || 0) + 1;

    const result = await pool.query(
      `
      INSERT INTO generated_schedules (
        version,
        title,
        comment,
        generated_json,
        status,
        published,
        generated_by,
        start_date,
        end_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        nextVersion,
        payload.title || `Schema v${nextVersion}`,
        payload.comment || "",
        payload.generatedSchedule,
        "draft",
        false,
        payload.generatedBy || "Chef Nacka",
        payload?.period?.startDate || null,
        payload?.period?.endDate || null,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to save schedule version", err);
    res.status(500).json({
      error: "Failed to save schedule version",
    });
  }
});
app.post("/api/schedules/:id/publish", async (req, res) => {
  try {
    const id = req.params.id;

    await pool.query(`
      UPDATE generated_schedules
      SET published = false,
          status = 'draft'
    `);

    await pool.query(
      `
      UPDATE generated_schedules
      SET published = true,
          status = 'published'
      WHERE id = $1
      `,
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to publish schedule", err);
    res.status(500).json({
      error: "Failed to publish schedule",
    });
  }
});
start();
