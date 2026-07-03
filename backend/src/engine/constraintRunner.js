export function runHardConstraints({ candidate, context, constraints = [] }) {
  const issues = [];

  for (const constraint of constraints) {
    if (constraint.type !== "hard") continue;
    if (typeof constraint.validate !== "function") continue;

    const result = constraint.validate(candidate, context);

    if (result?.passed === false) {
      issues.push({
        ruleId: constraint.id,
        type: "hard",
        message: result.message || constraint.description,
      });
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

export function runSoftConstraints({ candidate, context, constraints = [] }) {
  const issues = [];
  let scoreAdjustment = 0;

  for (const constraint of constraints) {
    if (constraint.type !== "soft") continue;
    if (typeof constraint.score !== "function") continue;

    const result = constraint.score(candidate, context);

    scoreAdjustment += result?.scoreAdjustment || 0;

    if (result?.message) {
      issues.push({
        ruleId: constraint.id,
        type: "soft",
        message: result.message,
        scoreAdjustment: result?.scoreAdjustment || 0,
      });
    }
  }

  return {
    scoreAdjustment,
    issues,
  };
}