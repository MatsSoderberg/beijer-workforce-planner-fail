const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const filePath = path.join(__dirname, "..", "data", "wizardState.json");

function ensureStore() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ current: {} }, null, 2), "utf8");
  }
}
function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeStore(store) {
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
}

router.get("/:storeId", async (req, res) => {
  try {
    const store = readStore();
    res.json(store.current[req.params.storeId] || null);
  } catch (error) {
    res.status(500).json({ error: "Failed to read wizard state", detail: error.message });
  }
});

router.put("/:storeId", async (req, res) => {
  try {
    const store = readStore();
    store.current[req.params.storeId] = { ...req.body, updatedAt: new Date().toISOString() };
    writeStore(store);
    res.json({ ok: true, item: store.current[req.params.storeId] });
  } catch (error) {
    res.status(500).json({ error: "Failed to save wizard state", detail: error.message });
  }
});

module.exports = router;
