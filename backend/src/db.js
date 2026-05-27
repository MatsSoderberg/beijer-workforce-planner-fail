import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export async function initDb() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS stores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      store_id UUID,
      name TEXT NOT NULL,
      department TEXT,
      employment_pct INTEGER DEFAULT 100,
      evening_only BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS employee_preferences (
      employee_id TEXT PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
      preferred_off_days JSONB DEFAULT '[]',
      preferred_work_days JSONB DEFAULT '[]',
      fixed_time_off JSONB DEFAULT '[]',
      notes TEXT DEFAULT '',
      imported_rule_tags JSONB DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rule_packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT,
      payload JSONB NOT NULL,
      imported_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS generated_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      start_date DATE,
      end_date DATE,
      generated_json JSONB NOT NULL,
      published BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Database initialized");
}
export function getDb() {
  return pool;
}
export async function resetDatabase() {
  await pool.query(`
    DROP TABLE IF EXISTS generated_schedules;
    DROP TABLE IF EXISTS rule_packages;
    DROP TABLE IF EXISTS employee_preferences;
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS stores;
  `);

  await initDb();
}
