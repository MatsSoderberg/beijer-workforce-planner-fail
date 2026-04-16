export async function fetchWizardState(storeId = "nacka") {
  const res = await fetch(`/api/wizard-state/${storeId}`);
  if (!res.ok) throw new Error("Failed to fetch wizard state");
  return res.json();
}

export async function saveWizardState(storeId = "nacka", payload = {}) {
  const res = await fetch(`/api/wizard-state/${storeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save wizard state");
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

export async function fetchScheduleVersions() {
  const res = await fetch("/api/schedule-versions");
  if (!res.ok) throw new Error("Failed to fetch schedule versions");
  return res.json();
}

export async function publishSchedule(payload = {}) {
  const res = await fetch("/api/schedule-versions/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to publish schedule");
  return res.json();
}
