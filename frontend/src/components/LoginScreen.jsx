import React, { useState } from 'react';
import { login } from '../lib/auth';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('chef@beijer.local');
  const [password, setPassword] = useState('Beijer123!');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error || 'Fel användare/lösenord');
      return;
    }
    setError('');
    onLogin?.(result.user);
  }

  return (
    <div className="app-shell">
      <div className="orb orb-a"></div>
      <div className="orb orb-b"></div>
      <div className="orb orb-c"></div>
      <div className="container">
        <div className="login-wrap">
          <div className="card login-card">
            <div className="eyebrow">Beijer</div>
            <h2 className="login-title">Logga in</h2>
            <div className="muted">Demo-inloggning som faktiskt fungerar i frontend.</div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="pref-block">
                <div className="pref-label">E-post</div>
                <input className="pref-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="pref-block">
                <div className="pref-label">Lösenord</div>
                <input className="pref-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {error ? <div className="login-error">{error}</div> : null}

              <button className="btn primary wide" type="submit">Logga in</button>
            </form>

            <div className="login-helper">
              <div><strong>Chef:</strong> chef@beijer.local / Beijer123!</div>
              <div><strong>Personal:</strong> pia@beijer.local / Beijer123!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
