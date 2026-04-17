import React, { useState } from 'react';

const starterQuestions = [
  'Hur många helger har David?',
  'Jobbar Pia på julafton?',
  'Vem arbetar på 2026-12-24?',
  'Vem har flest helger?',
  'Vilka är de viktigaste avvikelserna?'
];

function normalize(str = '') {
  return str.toLowerCase();
}

function findRow(question, rows = []) {
  const q = normalize(question);
  return rows.find((r) => {
    const name = normalize(r.employeeName || '');
    return q.includes(name) || q.includes(name.split(' ')[0]);
  }) || null;
}

function dateFromQuestion(question) {
  const direct = question.match(/\d{4}-\d{2}-\d{2}/);
  if (direct) return direct[0];
  const q = normalize(question);
  if (q.includes('julafton')) return '2026-12-24';
  if (q.includes('juldagen')) return '2026-12-25';
  return null;
}

function answer(question, generated) {
  const rows = generated?.rows || [];
  const diagnostics = generated?.diagnostics || null;

  if (!rows.length) {
    return 'Jag saknar genererad schemadata just nu. Kör generering i wizarden först.';
  }

  const q = normalize(question);
  const row = findRow(question, rows);
  const date = dateFromQuestion(question);

  if (row && q.includes('helg')) {
    const count = row.assignments.filter((a) => a.code === 'H').length;
    return `${row.employeeName} har ${count} helgpass i den senaste genereringen.`;
  }

  if (row && q.includes('tim')) {
    return `${row.employeeName} har totalt ${row.totals?.hours ?? 0} timmar i den senaste genereringen.`;
  }

  if (row && date) {
    const hit = row.assignments.find((a) => a.date === date);
    if (!hit) return `${row.employeeName} har inget registrerat pass för ${date}.`;
    return `${row.employeeName} har passkod ${hit.code} på ${date}.`;
  }

  if ((q.includes('vem') || q.includes('vilka')) && date && (q.includes('arbetar') || q.includes('jobbar'))) {
    const workers = rows
      .map((r) => ({ name: r.employeeName, a: r.assignments.find((x) => x.date === date) }))
      .filter((x) => x.a && x.a.code !== 'L')
      .map((x) => `${x.name} (${x.a.code})`);
    return workers.length ? `Följande arbetar på ${date}: ${workers.join(', ')}.` : `Ingen arbetar på ${date} i den senaste genereringen.`;
  }

  if (q.includes('flest') && q.includes('helg')) {
    const ranked = rows
      .map((r) => ({ name: r.employeeName, count: r.assignments.filter((a) => a.code === 'H').length }))
      .sort((a, b) => b.count - a.count);
    return ranked.length ? `${ranked[0].name} har flest helgpass i den senaste genereringen, med ${ranked[0].count} helgpass.` : 'Ingen data finns.';
  }

  if (q.includes('avvik')) {
    const devs = diagnostics?.deviations || [];
    if (!devs.length) return 'Inga avvikelser finns i den senaste genereringen.';
    return `De viktigaste avvikelserna är: ${devs.slice(0, 5).map((d) => d.message).join(' ')}`;
  }

  return 'Jag kunde inte tolka frågan ännu. Testa till exempel: Hur många helger har David? Jobbar Pia på julafton? Vem har flest helger?';
}

export default function StaffingCopilotBackend({ generated }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hej! Jag läser nu den senaste genererade schemadatan direkt från appen.' }
  ]);
  const [input, setInput] = useState('');

  function ask(question) {
    if (!question.trim()) return;
    const response = answer(question, generated);
    setMessages((prev) => [...prev, { role: 'user', text: question }, { role: 'assistant', text: response }]);
    setInput('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="card staffing-chat-card">
      <div className="section-title">Bemanningscopilot</div>
      <div className="muted">Läser senaste genererade data från wizarden. Ingen backendcopilot krävs för detta steg.</div>

      <div className="chat-suggestions">
        {starterQuestions.map((q) => (
          <button key={q} className="chat-chip" onClick={() => ask(q)}>{q}</button>
        ))}
      </div>

      <div className="chat-thread">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble ${m.role}`}>{m.text}</div>
        ))}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input className="pref-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Fråga om senaste genererade schema..." />
        <button className="btn primary" type="submit">Fråga</button>
      </form>
    </div>
  );
}
