import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import { DEFAULT_STATE } from './defaultState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'app.db');
let dbPromise;

function safeJson(value) {
  return JSON.stringify(value ?? {});
}

export async function getDb() {
  if (!dbPromise) {
    fs.mkdirSync(dataDir, { recursive: true });
    dbPromise = open({ filename: dbPath, driver: sqlite3.Database });
    const db = await dbPromise;
    await db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        dept TEXT NOT NULL,
        employmentPct INTEGER NOT NULL,
        eveningOnly INTEGER NOT NULL DEFAULT 0,
        weekendRule TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS time_off (
        id INTEGER PRIMARY KEY,
        employeeName TEXT NOT NULL,
        type TEXT NOT NULL,
        fromDate TEXT NOT NULL,
        toDate TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS schedule_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdAt TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 0,
        qualityScore INTEGER NOT NULL DEFAULT 0,
        metrics TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS schedule_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        runId INTEGER NOT NULL,
        date TEXT NOT NULL,
        day TEXT NOT NULL,
        week INTEGER NOT NULL,
        dept TEXT NOT NULL,
        shiftCode TEXT NOT NULL,
        shiftName TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        employeeName TEXT NOT NULL,
        weekend INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (runId) REFERENCES schedule_runs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL,
        displayName TEXT NOT NULL,
        employeeName TEXT
      );
    `);
    await seedDatabase(db);
  }
  return dbPromise;
}

async function upsertSetting(db, key, value) {
  await db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

async function seedUsers(db) {
  const count = await db.get('SELECT COUNT(*) as count FROM users');
  if (count.count > 0) return;

  const users = [
    { email: 'chef@beijer.local', password: 'Beijer123!', role: 'chef', displayName: 'Butikschef Nacka', employeeName: null },
    { email: 'pia@beijer.local', password: 'Beijer123!', role: 'personal', displayName: 'Pia', employeeName: 'Pia' },
    { email: 'david@beijer.local', password: 'Beijer123!', role: 'personal', displayName: 'David', employeeName: 'David' }
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await db.run(
      'INSERT INTO users (email, passwordHash, role, displayName, employeeName) VALUES (?, ?, ?, ?, ?)',
      [user.email, passwordHash, user.role, user.displayName, user.employeeName]
    );
  }
}

async function seedDatabase(db) {
  const settingsCount = await db.get('SELECT COUNT(*) as count FROM settings');
  if (settingsCount.count === 0) {
    await upsertSetting(db, 'store', safeJson(DEFAULT_STATE.store));
    await upsertSetting(db, 'period', safeJson(DEFAULT_STATE.period));
    await upsertSetting(db, 'staffing', safeJson(DEFAULT_STATE.staffing));
    await upsertSetting(db, 'rules', safeJson(DEFAULT_STATE.rules));
  }

  const employeeCount = await db.get('SELECT COUNT(*) as count FROM employees');
  if (employeeCount.count === 0) {
    for (const emp of DEFAULT_STATE.employees) {
      await db.run(
        'INSERT INTO employees (id, name, dept, employmentPct, eveningOnly, weekendRule, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [emp.id, emp.name, emp.dept, emp.employmentPct, emp.eveningOnly ? 1 : 0, emp.weekendRule, emp.active ? 1 : 0]
      );
    }
  }

  const timeOffCount = await db.get('SELECT COUNT(*) as count FROM time_off');
  if (timeOffCount.count === 0) {
    for (const row of DEFAULT_STATE.timeOff) {
      await db.run(
        'INSERT INTO time_off (id, employeeName, type, fromDate, toDate) VALUES (?, ?, ?, ?, ?)',
        [row.id, row.employeeName, row.type, row.from, row.to]
      );
    }
  }

  await seedUsers(db);
}

export async function resetDatabase() {
  const db = await getDb();
  await db.exec(`
    DELETE FROM schedule_entries;
    DELETE FROM schedule_runs;
    DELETE FROM time_off;
    DELETE FROM employees;
    DELETE FROM users;
    DELETE FROM settings;
  `);
  await seedDatabase(db);
}
