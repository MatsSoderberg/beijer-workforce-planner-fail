import React, { useState } from 'react';

const starterQuestions = [
  'Hur många helger har David?',
  'Vilka önskemål har Pia?',
  'Har Tobias några preferenser?',
  'Vilka är de viktigaste avvikelserna?',
  'Hur många preferenser finns i schemat?'
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

function findPref(question, preferences = {}) {
  const q = normalize(question);
  const entries = Object.entries(preferences || {});
  const hit = entries.find(([employeeId, pref]) => {
    const combined = `${employeeId} ${pref?.notes || ''}`.toLowerCase();
    return q.includes(employeeId.toLowerCase()) || q.includes((pref?.employeeName || '').toLowerCase()) || combined.includes(q);
  });
  return hit || null;
}

function summarizePreference(employeeId, pref) {
  const off = (pref?.preferredOffDays || []).join(', ') || 'inga';
  const work = (pref?.preferredWorkDays || []).join(', ') || 'inga';
  const fixed = (pref?.fixedTimeOff || []).join(', ') || 'inga';
  const notes = pref?.notes || 'inga noteringar';
  return `${employeeId}: önskade lediga dagar ${off}, önskade arbetsdagar ${work}, fasta ledigheter ${fixed}, notering: ${notes}.`;
}

function answer(question, generated, preferences) {
  const rows = generated?.rows || [];
  const diagnostics = generated?.diagnostics || null;

  const q = normalize(question);
  const row = findRow(question, rows);

  if (q.includes('preferens') || q.includes('onskemal') || q.includes('önskemål')) {
    if (row && preferences?.[row.employeeId]) {
      return summarizePreference(row.employeeId, preferences[row.employeeId]);
    }
    const total = Object.keys(preferences || {}).length;
    if (q.includes('hur manga') || q.includes('hur många')) {
      return `Det finns ${total} medarbetare med registrerade preferenser i den aktuella planeringen.`;
    }
    return 'Jag hittar inga tydliga preferenser för den frågan ännu.';
  }

  if (!rows.length) {
    return 'Jag saknar genererad schemadata just nu. Kör generering i wizarden först.';
  }

  if (row && q.includes('helg')) {
    const count = row.assignments.filter((a) => a.code === 'H').length;
    return `${row.employeeName} har ${count} helgpass i den senaste genereringen.`;
  }

  if (row && q.includes('tim')) {
    return `${row.employeeName} har totalt ${row.totals?.hours ?? 0} timmar i den senaste genereringen.`;
  }

  if (q.includes('avvik')) {
    const devs = diagnostics?.deviations || [];
    if (!devs.length) return 'Inga avvikelser finns i den senaste genereringen.';
    return `De viktigaste avvikelserna är: ${devs.slice(0, 5).map((d) => d.message).join(' ')}`;
  }

  return 'Jag kunde inte tolka frågan ännu. Testa till exempel: Hur många helger har David? Vilka önskemål har Pia? Vilka är de viktigaste avvikelserna?';
}

export default function StaffingCopilotBackend({ generated, preferences }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hej! Jag läser nu både senaste genererade schema, preferenser och avvikelser.' }
  ]);
  const [input, setInput] = useState('');

  function ask(question) {
    if (!question.trim()) return;
    const response = answer(question, generated, preferences);
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
      <div className="muted">Läser senaste genererade data, preferenser och avvikelser direkt från appen.</div>

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
        <input className="pref-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Fråga om schema, önskemål eller avvikelser..." />
        <button className="btn primary" type="submit">Fråga</button>
      </form>
    </div>
  );
}
