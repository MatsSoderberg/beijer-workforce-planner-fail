function dateAdd(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isSaturday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 6;
}

function weekdayName(dateStr) {
  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][new Date(`${dateStr}T00:00:00`).getDay()];
}

function hasAssignment(schedule = [], employeeName, dateStr) {
  return schedule.some(
    (row) => row.employeeName === employeeName && row.date === dateStr
  );
}

export default {
  id: "day-off-before-weekend",
  type: "hard",
  description:
    "Medarbetare som arbetar helg ska ha sin fasta lediga vardag före helgen.",

  validate(candidate, context) {
    const employee = candidate.employee;
    const employeeName = employee?.name;
    const dateStr = candidate.date;
    const schedule = context.schedule || [];
    const fixedWeekdayOff = employee?.fixedWeekdayOff;

    if (!employeeName || !dateStr || !fixedWeekdayOff) {
      return { passed: true };
    }

    if (!isSaturday(dateStr)) {
      return { passed: true };
    }

    for (let offset = -5; offset <= -1; offset += 1) {
      const checkDate = dateAdd(dateStr, offset);

      if (weekdayName(checkDate) !== fixedWeekdayOff) {
        continue;
      }

      const worksOnFixedDay = hasAssignment(
        schedule,
        employeeName,
        checkDate
      );

      if (worksOnFixedDay) {
        return {
          passed: false,
          message: `${employeeName} ska vara ledig ${fixedWeekdayOff} före helgen ${dateStr}, men har arbetspass ${checkDate}.`,
        };
      }
    }

    return { passed: true };
  },
};