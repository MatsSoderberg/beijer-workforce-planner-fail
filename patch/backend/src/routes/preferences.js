
const express = require("express");
const router = express.Router();

/**
 * In-memory example route handler.
 * Replace storage with DB calls in your real backend.
 */
let preferences = [
  {
    employeeId: "pia",
    preferredOffDays: ["monday"],
    preferredWorkDays: [],
    fixedTimeOff: [],
    notes: "Önskar helst ledig på måndagar."
  },
  {
    employeeId: "tobias",
    preferredOffDays: [],
    preferredWorkDays: ["tuesday","thursday"],
    fixedTimeOff: [],
    notes: "Vill gärna jobba tisdag/torsdag kväll."
  }
];

router.get("/", async (req, res) => {
  res.json({ items: preferences });
});

router.put("/:employeeId", async (req, res) => {
  const employeeId = req.params.employeeId;
  const body = req.body || {};
  const next = {
    employeeId,
    preferredOffDays: body.preferredOffDays || [],
    preferredWorkDays: body.preferredWorkDays || [],
    fixedTimeOff: body.fixedTimeOff || [],
    notes: body.notes || "",
  };
  const idx = preferences.findIndex(p => p.employeeId === employeeId);
  if (idx >= 0) preferences[idx] = next;
  else preferences.push(next);
  res.json({ ok: true, item: next });
});

module.exports = router;
