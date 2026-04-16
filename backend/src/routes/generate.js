
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { generateSchedule } = require("../lib/scheduleEngine");

const prefFile = path.join(__dirname, "..", "data", "preferences.json");

function readPreferences() {
  if (!fs.existsSync(prefFile)) {
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(prefFile, "utf8"));
  return parsed.items || [];
}

const employees = [
  { id: "david", name: "David", department: "Kassa", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "hakan", name: "Håkan", department: "Kassa", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "katarina", name: "Katarina", department: "Kassa", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "pia", name: "Pia", department: "Kassa", eveningOnly: false, employmentPct: 82, contractHours: 33 },
  { id: "amelie", name: "Amelie", department: "Kassa", eveningOnly: false, employmentPct: 100, contractHours: 40 },

  { id: "tobias", name: "Tobias", department: "Färg", eveningOnly: true, employmentPct: 82, contractHours: 33 },
  { id: "boris", name: "Boris", department: "Färg", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "therese", name: "Therese", department: "Färg", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "fia", name: "Fia", department: "Färg", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "pernilla", name: "Pernilla", department: "Färg", eveningOnly: false, employmentPct: 100, contractHours: 40 },

  { id: "marianne", name: "Marianne", department: "Järn", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "elias", name: "Elias", department: "Järn", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "junia", name: "Junia", department: "Järn", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "marin", name: "Marin", department: "Järn", eveningOnly: false, employmentPct: 100, contractHours: 40 },
  { id: "aneta", name: "Aneta", department: "Järn", eveningOnly: false, employmentPct: 100, contractHours: 40 },
];

const defaultRules = {
  staffingWeekday: { Kassa: 2, "Färg": 1, "Järn": 2 },
  staffingWeekend: { Kassa: 1, "Färg": 1, "Järn": 1 },
};

router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};
    const result = generateSchedule({
      employees: body.employees || employees,
      preferences: body.preferences || readPreferences(),
      startDate: body.startDate || "2026-09-01",
      endDate: body.endDate || "2026-12-31",
      rules: body.rules || defaultRules,
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate schedule", detail: error.message });
  }
});

module.exports = router;
