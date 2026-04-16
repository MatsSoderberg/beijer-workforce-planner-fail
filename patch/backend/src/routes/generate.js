
const express = require("express");
const router = express.Router();
const { generateSchedule } = require("../lib/scheduleEngine");

/**
 * Example payload:
 * {
 *   employees: [...],
 *   preferences: [...],
 *   startDate: "2026-09-01",
 *   endDate: "2026-12-31",
 *   rules: {
 *     staffingWeekday: { Kassa: 2, Färg: 1, Järn: 2 },
 *     staffingWeekend: { Kassa: 1, Färg: 1, Järn: 1 }
 *   }
 * }
 */
router.post("/generate", async (req, res) => {
  try {
    const payload = req.body || {};
    const result = generateSchedule(payload);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate schedule", detail: error.message });
  }
});

module.exports = router;
