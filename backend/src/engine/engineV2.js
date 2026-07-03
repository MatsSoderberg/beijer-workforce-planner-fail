export function generateScheduleV2(state) {
  return {
    schedule: [],
    metrics: {
      qualityScore: 0,
      employeeSummary: [],
      summary: {
        preferenceConflicts: 0,
        brokenPreferences: 0,
        totalWeekends: 0,
      },
      deviations: [],
    },
    constraints: {
      hardIssues: [],
      softIssues: [],
      issues: [],
      passed: true,
    },
    engine: "v2",
  };
}