export async function loadSchedules() {
  const res = await fetch("/api/schedules");

  if (!res.ok) {
    throw new Error("Failed to load schedules");
  }

  return res.json();
}

export async function saveScheduleVersion(payload) {
  const res = await fetch("/api/schedules", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to save schedule version");
  }

  return res.json();
}

export async function publishSchedule(id) {
  const res = await fetch(`/api/schedules/${id}/publish`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to publish schedule");
  }

  return res.json();
}
