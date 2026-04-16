import React, { useMemo, useState } from 'react';
import { answerStaffingQuestionV2 } from '../lib/staffingChat';

const starterQuestions = [
  'Hur många helger har David?',
  'Hur många timmar har Pia?',
  'Jobbar Pia på julafton?',
  'Vem arbetar på 2026-12-24?',
  'Vem har flest helger?',
  'Har Tobias några preferensavvikelser?',
];

export default function StaffingAssistantV2({ scheduleRows = [], diagnostics = null, title = 'Bemanningscopilot' }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hej! Jag kan svara på frågor om schema, helger, timmar, röda dagar och avvikelser i den aktuella schemaversionen.',
    },
  ]);
  const [input, setInput] = useState('');

  const hasData = useMemo(() => Array.isArray(scheduleRows) && scheduleRows.length > 0, [scheduleRows]);

  function ask(question) {
    if (!question.trim()) return;
    const answer = answerStaffingQuestionV2(question, { scheduleRows, diagnostics });
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: question },
      { role: 'assistant', text: hasData ? answer : 'Jag saknar schemadata just nu. Generera eller ladda ett schema först.' },
    ]);
    setInput('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="card staffing-chat-card">
      <div className="section-title">{title}</div>
      <div className="muted">Ställ frågor om den aktuella schemaversionen, preferenserna och avvikelserna.</div>

      <div className="chat-suggestions">
        {starterQuestions.map((q) => (
          <button key={q} className="chat-chip" onClick={() => ask(q)}>{q}</button>
        ))}
      </div>

      <div className="chat-thread">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          className="pref-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv din fråga om bemanningen..."
        />
        <button className="btn primary" type="submit">Fråga</button>
      </form>
    </div>
  );
}
