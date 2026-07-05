function dateAdd(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isSaturday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 6;
}

function isSunday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 0;
}

function isFullTime(employee) {
  return (employee?.employmentPct ?? 100) >= 100;
}

function hasAssignment(schedule = [], employeeName, dateStr) {
  return schedule.some(
    (row) =>
      row.employeeName === employeeName &&
      row.date === dateStr
  );
}

export default {
  id: "weekend-pair",
  type: "hard",
  description:
    "100 %-anställda som arbetar helg ska arbeta både lördag och söndag samma helg.",

  validate(candidate, context) {
    const employee = candidate.employee;
    const employeeName = employee?.name;
    const dateStr = candidate.date;
    const schedule = context.schedule || [];

    if (!employeeName || !dateStr) {
      return { passed: true };
    }

    if (!isFullTime(employee)) {
      return { passed: true };
    }

    if (isSaturday(dateStr)) {
      const sundayStr = dateAdd(dateStr, 1);

      const candidateCreatesSunday =
        candidate.pairedDates?.includes(sundayStr);

      const alreadyHasSunday = hasAssignment(
        schedule,
        employeeName,
        sundayStr
      );

      if (!candidateCreatesSunday && !alreadyHasSunday) {
        return {
          passed: false,
          message: `${employeeName} jobbar lördag ${dateStr} men saknar söndag ${sundayStr}.`,
        };
      }
    }

    if (isSunday(dateStr)) {
      const saturdayStr = dateAdd(dateStr, -1);

      const alreadyHasSaturday = hasAssignment(
        schedule,
        employeeName,
        saturdayStr
      );

      if (!alreadyHasSaturday) {
        return {
          passed: false,
          message: `${employeeName} jobbar söndag ${dateStr} men saknar lördag ${saturdayStr}.`,
        };
      }
    }

    return { passed: true };
  },
};