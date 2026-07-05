export default {
  id: "max-weekly-hours",
  type: "hard",
  description: "Ingen medarbetare får överskrida max antal timmar per vecka.",

  validate(candidate, context) {
    const employeeName = candidate.employee?.name;
    const shiftHours = candidate.shift?.hours || 0;
    const weekKey = candidate.weekKey;

    const currentHours =
      context.weeklyHours?.[weekKey]?.[employeeName] || 0;

    const maxWeeklyHours =
      context.rules?.maxWeeklyHours ||
      candidate.employee?.maxWeeklyHours ||
      47.5;

    const projectedHours = currentHours + shiftHours;

    if (projectedHours > maxWeeklyHours) {
      return {
        passed: false,
        message: `${employeeName} skulle få ${projectedHours} timmar vecka ${weekKey}, vilket överstiger max ${maxWeeklyHours}.`,
      };
    }

    return {
      passed: true,
    };
  },
};