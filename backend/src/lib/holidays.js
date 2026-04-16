function isHoliday(dateKey, holidays) {
  return Array.isArray(holidays) && holidays.includes(dateKey);
}

function getHolidayImpact(dateKey, holidays) {
  return isHoliday(dateKey, holidays)
    ? { isHoliday: true, staffingMultiplier: 0.8, note: "Svensk röd dag" }
    : { isHoliday: false, staffingMultiplier: 1, note: "" };
}

module.exports = { isHoliday, getHolidayImpact };
