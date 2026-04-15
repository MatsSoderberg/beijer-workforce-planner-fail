import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'beijer-mvp-secret';

export async function login(email, password) {
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new Error('Fel e-post eller lösenord');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Fel e-post eller lösenord');
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    employeeName: user.employeeName
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  return { token, user: payload };
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireChef(req, res, next) {
  if (req.user?.role !== 'chef') return res.status(403).json({ error: 'Chef access required' });
  next();
}
