
export async function fetchPreferences() {
  const res = await fetch("/api/preferences");
  if (!res.ok) throw new Error("Failed to fetch preferences");
  return res.json();
}

export async function savePreferences(employeeId, payload) {
  const res = await fetch(`/api/preferences/${employeeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save preferences");
  return res.json();
}

export async function generateSchedule(payload = {}) {
  const res = await fetch("/api/schedule/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to generate schedule");
  return res.json();
}
