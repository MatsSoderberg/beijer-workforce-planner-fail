export async function loadRulePackages() {
  const res = await fetch("/api/rule-packages");

  if (!res.ok) {
    throw new Error("Failed to load rule packages");
  }

  return res.json();
}

export async function saveRulePackage(pkg) {
  const res = await fetch("/api/rule-packages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pkg),
  });

  if (!res.ok) {
    throw new Error("Failed to save rule package");
  }

  return res.json();
}

export async function deleteRulePackage(id) {
  const res = await fetch(`/api/rule-packages/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete rule package");
  }

  return res.json();
}
