export async function loadPlannerState() {
  const res = await fetch("/api/planner-state");

  if (!res.ok) {
    throw new Error("Failed to load planner state");
  }

  return res.json();
}

export async function savePlannerState(payload) {
  const res = await fetch("/api/planner-state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to save planner state");
  }

  return res.json();
}
