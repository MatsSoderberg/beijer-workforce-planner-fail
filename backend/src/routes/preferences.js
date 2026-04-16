
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const dataFile = path.join(__dirname, "..", "data", "preferences.json");

function ensureFile() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ items: [] }, null, 2), "utf8");
  }
}
function readStore() {
  ensureFile();
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}
function writeStore(store) {
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2), "utf8");
}

router.get("/", async (req, res) => {
  try {
    const store = readStore();
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: "Failed to read preferences", detail: error.message });
  }
});

router.put("/:employeeId", async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const body = req.body || {};
    const store = readStore();

    const item = {
      employeeId,
      preferredOffDays: body.preferredOffDays || [],
      preferredWorkDays: body.preferredWorkDays || [],
      fixedTimeOff: body.fixedTimeOff || [],
      notes: body.notes || "",
    };

    const idx = store.items.findIndex((x) => x.employeeId === employeeId);
    if (idx >= 0) store.items[idx] = item;
    else store.items.push(item);

    writeStore(store);
    res.json({ ok: true, item });
  } catch (error) {
    res.status(500).json({ error: "Failed to save preferences", detail: error.message });
  }
});

module.exports = router;
