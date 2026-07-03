export default function ConstraintReport({ report }) {
  if (!report) return null;

  const hardIssues = report.hardIssues || [];
  const softIssues = report.softIssues || [];

  return (
    <div className="card">
      <div className="section-title">Regelrapport</div>
      <div className="muted">
        Kontrollerar hard rules och soft rules efter generering.
      </div>

      <div className="top-gap">
        <strong>🔒 Hard Rules</strong>
        {hardIssues.length === 0 ? (
          <div className="muted">✅ Alla hard rules uppfyllda</div>
        ) : (
          hardIssues.map((issue, index) => (
            <div key={index} className="validation-badge warning">
              ❌ {issue.message}
            </div>
          ))
        )}
      </div>

      <div className="top-gap">
        <strong>🟡 Soft Rules</strong>
        {softIssues.length === 0 ? (
          <div className="muted">✅ Inga soft rules brutna</div>
        ) : (
          softIssues.map((issue, index) => (
            <div key={index} className="validation-badge warning">
              ⚠️ {issue.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}