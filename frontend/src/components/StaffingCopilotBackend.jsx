import React, { useState } from 'react';

const starterQuestions = [
  'Hur många helger har David?',
  'Jobbar Pia på julafton?',
  'Vem arbetar på 2026-12-24?',
  'Vem har flest helger?',
  'Vilka är de viktigaste avvikelserna?'
];

function answer(question) {
  const q = question.toLowerCase();
  if (q.includes('david') && q.includes('helg')) return 'David har 1 helgpass i den här demoversionen.';
  if (q.includes('pia') && (q.includes('julafton') || q.includes('2026-12-24'))) return 'Jag har inte en publicerad schemaversion med julafton laddad ännu i den här säkra fallback-vyn.';
  if (q.includes('vem') && q.includes('2026-12-24')) return 'Jag behöver riktig publicerad schemadata för att svara säkert på den frågan.';
  if (q.includes('flest') && q.includes('helg')) return 'I den här fallback-vyn har jag inte full publicerad jämförelsedata ännu.';
  if (q.includes('avvik')) return 'Nuvarande demovy visar två exempelavvikelser: David har hög helgbelastning och Marianne har något högre helgbelastning på Järn.';
  return 'Copilot kör nu i build-säker fallback-läge. När backendkopplingen är stabil kan jag svara på fler frågor om publicerat schema.';
}

export default function StaffingCopilotBackend() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hej! Jag är bemanningscopilot. Den här versionen är en build-säker fallback så att Copilot syns i gränssnittet.' }
  ]);
  const [input, setInput] = useState('');

  function ask(question) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }, { role: 'assistant', text: answer(question) }]);
    setInput('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="card staffing-chat-card">
      <div className="section-title">Bemanningscopilot</div>
      <div className="muted">Build-säker fallbackvy. Visar Copilot i UI utan backendberoenden.</div>

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
        <input className="pref-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Fråga om bemanningen..." />
        <button className="btn primary" type="submit">Fråga</button>
      </form>
    </div>
  );
}
