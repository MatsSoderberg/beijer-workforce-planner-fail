const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const filePath = path.join(__dirname, "..", "data", "scheduleVersions.json");

function ensureStore() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ items: [] }, null, 2), "utf8");
  }
}
function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeStore(store) {
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
}

router.get("/", async (req, res) => {
  try {
    const store = readStore();
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: "Failed to read schedule versions", detail: error.message });
  }
});

router.post("/publish", async (req, res) => {
  try {
    const store = readStore();
    const version = {
      id: `v_${Date.now()}`,
      status: req.body.locked ? "locked" : "published",
      title: req.body.title || "Schemautkast",
      period: req.body.period || null,
      summary: req.body.summary || {},
      rows: req.body.rows || [],
      createdAt: new Date().toISOString(),
    };
    store.items.unshift(version);
    writeStore(store);
    res.json({ ok: true, item: version });
  } catch (error) {
    res.status(500).json({ error: "Failed to publish schedule", detail: error.message });
  }
});

router.post("/:id/lock", async (req, res) => {
  try {
    const store = readStore();
    const item = store.items.find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    item.status = "locked";
    item.lockedAt = new Date().toISOString();
    writeStore(store);
    res.json({ ok: true, item });
  } catch (error) {
    res.status(500).json({ error: "Failed to lock schedule", detail: error.message });
  }
});

module.exports = router;
