import { resetDatabase } from './db.js';

await resetDatabase();
console.log('SQLite database reset with seed data.');
