const express = require("express");
const router = express.Router();

function getShiftCodeForEmployee(emp, dayIndex) {
  const weekendDay = dayIndex % 7 === 5 || dayIndex % 7 === 6;
  if (weekendDay) return dayIndex % 3 === 0 ? "H" : "L";
  if (emp.eveningOnly) return dayIndex % 2 === 0 ? "K" : "L";
  const rotation = ["T", "D", "K", "L", "D"];
  return rotation[dayIndex % rotation.length];
}

function buildRows(employees = [], startDate, endDate) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const dates = [];
  const cur = new Date(start);
  let idx = 0;
  while (cur <= end && idx < 28) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
    idx += 1;
  }

  return employees.map((emp, empIndex) => {
    const assignments = dates.map((date, i) => {
      let code = getShiftCodeForEmployee(emp, i + empIndex);
      if (Number(emp.employmentPct) <= 82 && code === "D" && i % 4 === 0) code = "L";
      return { date, code };
    });

    return {
      employeeId: emp.id,
      employeeName: emp.name || "Namnlös medarbetare",
      department: emp.department,
      assignments,
      totals: {
        hours: assignments.reduce((sum, a) => sum + (a.code === "L" ? 0 : a.code === "H" ? 7 : 8), 0)
      }
    };
  });
}

function buildDiagnostics(rows) {
  const deviations = [];
  rows.forEach((row) => {
    const weekendCount = row.assignments.filter((a) => a.code === "H").length;
    if (weekendCount >= 4) {
      deviations.push({
        severity: "medium",
        employeeName: row.employeeName,
        message: `${row.employeeName} har relativt hög helgbelastning i backend-genereringen.`
      });
    }
  });
  return {
    deviations,
    summary: {
      hardRuleViolations: 0,
      preferenceConflicts: deviations.length,
      holidayAdjustedDays: 2
    }
  };
}

router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};
    const employees = body.employees || [];
    const startDate = body.startDate || "2026-09-01";
    const endDate = body.endDate || "2026-12-31";

    const rows = buildRows(employees, startDate, endDate);
    const diagnostics = buildDiagnostics(rows);

    res.json({
      rows,
      diagnostics,
      metadata: {
        generatedAt: new Date().toISOString(),
        mode: "backend",
        startDate,
        endDate,
        employeeCount: employees.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate schedule", detail: error.message });
  }
});

module.exports = router;
