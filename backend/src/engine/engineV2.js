import {
  runHardConstraints,
  runSoftConstraints,
} from "./constraintRunner.js";

import maxWeeklyHours from "./constraints/maxWeeklyHours.js";
import weekendPair from "./constraints/weekendPair.js";
import dayOffBeforeWeekend from "./constraints/dayOffBeforeWeekend.js";

const constraints = [
  maxWeeklyHours,
  weekendPair,
  dayOffBeforeWeekend,
];

export function filterCandidates(candidates = [], context = {}) {
  const accepted = [];
  const rejected = [];

  for (const candidate of candidates) {
    const hard = runHardConstraints({
      candidate,
      context,
      constraints,
    });

    if (!hard.passed) {
      rejected.push({
        candidate,
        issues: hard.issues,
      });

      continue;
    }

    const soft = runSoftConstraints({
      candidate,
      context,
      constraints,
    });

    accepted.push({
      candidate,
      softIssues: soft.issues,
      scoreAdjustment: soft.scoreAdjustment,
    });
  }

  return {
    accepted,
    rejected,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
  };
}

export function testCandidate(candidate, context = {}) {
  const result = filterCandidates([candidate], context);

  return {
    passed: result.acceptedCount === 1,
    hardIssues: result.rejected[0]?.issues || [],
    softIssues: result.accepted[0]?.softIssues || [],
    scoreAdjustment: result.accepted[0]?.scoreAdjustment || 0,
  };
}

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
      candidateFilterReady: true,
      hardConstraintCount: constraints.filter((c) => c.type === "hard").length,
      softConstraintCount: constraints.filter((c) => c.type === "soft").length,
    },
  };
}