import React, { useEffect, useState } from 'react';
import { askCopilot, fetchCopilotContext } from '../lib/scheduleApi';

const starterQuestions = [
  'Hur många helger har David?',
  'Jobbar Pia på julafton?',
  'Vem arbetar på 2026-12-24?',
  'Vem har flest helger?',
  'Vilka är de viktigaste avvikelserna?',
];

export default function StaffingCopilotBackend() {
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hej! Jag är bemanningscopilot och läser den senaste publicerade schemaversionen.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCopilotContext().then((data) => setContext(data)).catch(() => {});
  }, []);

  async function ask(question) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const result = await askCopilot(question);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result.answer,
          meta: result.usedVersion ? `Källa: ${result.usedVersion.title}` : null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Det gick inte att hämta svar från bemanningscopilot just nu.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="card staffing-chat-card">
      <div className="section-title">Bemanningscopilot</div>
      <div className="muted">
        {context?.hasVersion
          ? `Läser senaste publicerade schema: ${context.context?.title || 'schema'}`
          : 'Ingen publicerad schemaversion ännu.'}
      </div>

      <div className="chat-suggestions">
        {starterQuestions.map((q) => (
          <button key={q} className="chat-chip" onClick={() => ask(q)}>{q}</button>
        ))}
      </div>

      <div className="chat-thread">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble ${m.role}`}>
            <div>{m.text}</div>
            {m.meta ? <div className="chat-meta">{m.meta}</div> : null}
          </div>
        ))}
        {loading ? <div className="chat-bubble assistant">Tänker…</div> : null}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          className="pref-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Fråga om publicerat schema..."
        />
        <button className="btn primary" type="submit">Fråga</button>
      </form>
    </div>
  );
}
