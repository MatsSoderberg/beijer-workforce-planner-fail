export function validateWeekendPairs(schedule = [], employees = []) {
  const issues = [];

  const fullTimeEmployees = new Set(
    employees
      .filter((e) => (e.employmentPct ?? 100) >= 100)
      .map((e) => e.name)
  );

  const byEmployeeDate = new Map();

  for (const row of schedule) {
    const key = `${row.employeeName}|${row.date}`;
    byEmployeeDate.set(key, row);
  }

  for (const row of schedule) {
    if (!row.weekend) continue;
    if (row.day !== "Lör") continue;
    if (!fullTimeEmployees.has(row.employeeName)) continue;

    const saturday = new Date(`${row.date}T00:00:00`);
    const sunday = new Date(saturday);
    sunday.setDate(sunday.getDate() + 1);

    const sundayDate = sunday.toISOString().slice(0, 10);
    const sundayKey = `${row.employeeName}|${sundayDate}`;

    if (!byEmployeeDate.has(sundayKey)) {
      issues.push({
        ruleId: "weekend-pair",
        severity: "hard",
        employeeName: row.employeeName,
        date: row.date,
        message: `${row.employeeName} jobbar lördag ${row.date} men saknar söndag ${sundayDate}.`,
      });
    }
  }

  return issues;
}

export function validateScheduleConstraints(state = {}, schedule = []) {
  const employees = state.employees || [];

  const issues = [
    ...validateWeekendPairs(schedule, employees),
  ];

  return {
    hardIssues: issues.filter((i) => i.severity === "hard"),
    softIssues: issues.filter((i) => i.severity === "soft"),
    issues,
    passed: issues.length === 0,
  };
}