
import { useEffect, useState } from "react";
import { fetchPreferences, savePreferences, generateSchedule } from "../lib/scheduleApi";

export function usePreferencesState(initialEmployeeId) {
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    fetchPreferences()
      .then((data) => {
        const map = {};
        (data.items || []).forEach((x) => {
          map[x.employeeId] = x;
        });
        setPreferences(map);
      })
      .catch(console.error);
  }, []);

  async function persistPreference(employeeId, value) {
    const saved = await savePreferences(employeeId, value);
    setPreferences((prev) => ({ ...prev, [employeeId]: saved.item }));
  }

  async function runGeneration(payload = {}) {
    setLoading(true);
    try {
      const generated = await generateSchedule({
        ...payload,
        preferences: Object.values(preferences),
      });
      setLastGenerated(generated);
      return generated;
    } finally {
      setLoading(false);
    }
  }

  return {
    preferences,
    persistPreference,
    runGeneration,
    loading,
    lastGenerated,
  };
}
