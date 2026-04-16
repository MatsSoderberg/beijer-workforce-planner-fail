
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { answerFromSchedule, buildContextSummary } = require("../lib/copilotAnalyzer");

const versionsFile = path.join(__dirname, "..", "data", "scheduleVersions.json");

function readVersions() {
  if (!fs.existsSync(versionsFile)) {
    return { items: [] };
  }
  return JSON.parse(fs.readFileSync(versionsFile, "utf8"));
}

function getLatestPublishedVersion() {
  const store = readVersions();
  return (store.items || []).find((x) => x.status === "published" || x.status === "locked") || null;
}

router.get("/context", async (req, res) => {
  try {
    const version = getLatestPublishedVersion();
    if (!version) return res.json({ hasVersion: false, context: null });
    res.json({
      hasVersion: true,
      context: buildContextSummary(version),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load copilot context", detail: error.message });
  }
});

router.post("/ask", async (req, res) => {
  try {
    const question = req.body?.question || "";
    const version = getLatestPublishedVersion();

    if (!version) {
      return res.json({
        ok: true,
        answer: "Det finns ingen publicerad schemaversion ännu. Publicera ett schema först så kan jag svara på frågor om bemanningen.",
        source: "copilot-backend",
        usedVersion: null,
      });
    }

    const answer = answerFromSchedule(question, version.rows || [], {
      deviations: version.summary?.deviations || [],
      summary: version.summary || {},
    });

    const fallback = "Jag kunde inte tolka frågan ännu. Testa till exempel: Hur många helger har David? Jobbar Pia på julafton? Vem arbetar på 2026-12-24? Vilka är de viktigaste avvikelserna?";
    res.json({
      ok: true,
      answer: answer || fallback,
      source: "copilot-backend",
      usedVersion: {
        id: version.id,
        title: version.title,
        status: version.status,
        createdAt: version.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to answer copilot question", detail: error.message });
  }
});

module.exports = router;
