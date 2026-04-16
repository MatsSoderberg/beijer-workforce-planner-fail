const USERS = [
  { email: 'chef@beijer.local', password: 'Beijer123!', role: 'chef', name: 'Chef Nacka' },
  { email: 'pia@beijer.local', password: 'Beijer123!', role: 'personal', name: 'Pia' },
];

const SESSION_KEY = 'beijer_demo_session_v1';

export function login(email, password) {
  const user = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: 'Fel användare eller lösenord' };
  const session = { email: user.email, role: user.role, name: user.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
