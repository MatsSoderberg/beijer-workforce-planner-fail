import { filterCandidates } from "./engineV2.js";

const context = {
  rules: {
    maxWeeklyHours: 47.5,
  },
  weeklyHours: {
    "2026-36": {
      Marianne: 46,
    },
  },
  schedule: [],
};

const candidates = [
  {
    employee: {
      name: "Marianne",
      employmentPct: 100,
      fixedWeekdayOff: "wednesday",
    },
    date: "2026-09-05",
    weekKey: "2026-36",
    shift: {
      code: "H",
      hours: 7.5,
    },
    pairedDates: ["2026-09-06"],
  },
];

console.log(JSON.stringify(filterCandidates(candidates, context), null, 2));