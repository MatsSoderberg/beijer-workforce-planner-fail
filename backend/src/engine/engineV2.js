import maxWeeklyHours from "./constraints/maxWeeklyHours.js";
import {
  runHardConstraints,
  runSoftConstraints,
} from "./constraintRunner.js";

const constraints = [
  maxWeeklyHours,
];

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
    debug: {
      engine: "v2",
      constraintRunnerReady: true,
      hardConstraintCount: constraints.filter((c) => c.type === "hard").length,
      softConstraintCount: constraints.filter((c) => c.type === "soft").length,
    },
  };
}

export function testCandidate(candidate, context = {}) {
  const hard = runHardConstraints({
    candidate,
    context,
    constraints,
  });

  const soft = runSoftConstraints({
    candidate,
    context,
    constraints,
  });

  return {
    passed: hard.passed,
    hardIssues: hard.issues,
    softIssues: soft.issues,
    scoreAdjustment: soft.scoreAdjustment,
  };
}