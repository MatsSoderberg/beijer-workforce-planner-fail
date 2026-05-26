const DAY_MAP = {
  måndag: "monday",
  måndagar: "monday",
  tisdag: "tuesday",
  tisdagar: "tuesday",
  onsdag: "wednesday",
  onsdagar: "wednesday",
  torsdag: "thursday",
  torsdagar: "thursday",
  fredag: "friday",
  fredagar: "friday",
  lördag: "saturday",
  lördagar: "saturday",
  söndag: "sunday",
  söndagar: "sunday",
};

function normalize(text = "") {
  return text
    .replace(/\r/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function detectDays(text = "", prefixWords = []) {
  const found = [];
  const lower = text.toLowerCase();

  Object.entries(DAY_MAP).forEach(([sv, en]) => {
    const hasDay = lower.includes(sv);
    const hasPrefix =
      prefixWords.length === 0 ||
      prefixWords.some((p) => lower.includes(`${p} ${sv}`));

    if (hasDay && hasPrefix && !found.includes(en)) {
      found.push(en);
    }
  });

  return found;
}

function parseEmployeeRule(line, employees = []) {
  const employee = employees.find((e) =>
    line.toLowerCase().startsWith((e.name || "").toLowerCase())
  );

  if (!employee) return null;

  const lower = line.toLowerCase();

  const preferredOffDays = detectDays(lower, ["ledig", "lediga"]);
  const preferredWorkDays = detectDays(lower, ["jobba", "jobbar", "tidigt"]);

  const tags = {
    prefersEarly:
      lower.includes("helst tidigt") ||
      lower.includes("morgon") ||
      lower.includes("6-15") ||
      lower.includes("7-16"),

    prefersLate:
      lower.includes("hellre sena") ||
      lower.includes("sena pass") ||
      lower.includes("10-19") ||
      lower.includes("kväll"),

    avoidsEarly:
      lower.includes("aldrig jobba 6-15") ||
      lower.includes("inga 6-15"),

    avoidsEightToFive:
      lower.includes("inga 8-17"),

    eveningOnly:
      lower.includes("bara kväll") ||
      lower.includes("endast kväll"),

    everySecondWeekend:
      lower.includes("varannan helg"),

    everyThirdWeekend:
      lower.includes("var 3:e helg") ||
      lower.includes("var tredje helg"),

    twoWeekRotation:
      lower.includes("2 veckors rull") ||
      lower.includes("två veckors rull"),

    compDaySameWeekendWeek:
      lower.includes("ledig dag samma vecka") ||
      lower.includes("ledig dag den veckan"),

    compDayWeekAfterWeekend:
      lower.includes("veckan efter"),

    preferConsecutiveDaysOff:
      lower.includes("ledig flera dagar") ||
      lower.includes("flera dagar i samband") ||
      lower.includes("sammanhängande"),
  };

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    preferredOffDays,
    preferredWorkDays,
    fixedTimeOff: [],
    notes: line,
    importedRuleTags: tags,
  };
}

function parseDepartmentRules(lines = []) {
  const departmentRules = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();

    if (
      lower.startsWith("färgavdelningen") ||
      lower.startsWith("bad/järn") ||
      lower.startsWith("bad") ||
      lower.startsWith("järn")
    ) {
      departmentRules.push({
        raw: line,
        department:
          lower.startsWith("färgavdelningen")
            ? "Färg"
            : "Bad/Järn",
        staffing: {
          early0615: /(\d+)\s*stycken?\s*6-15/.exec(lower)?.[1] || null,
          morning0716: /(\d+)\s*person(?:er)?\s*7-16/.exec(lower)?.[1] || null,
          day0817: /(\d+)\s*styck\s*8-17|(\d+)\s*8-17/.exec(lower)?.[1] || null,
          day0918: /(\d+)\s*person(?:er)?\s*9-18/.exec(lower)?.[1] || null,
          late1019: /(\d+)\s*stycken?\s*10-19|(\d+)\s*person(?:er)?\s*10-19/.exec(lower)?.[1] || null,
          weekend0916: /(\d+)\s*(stycken|personer).*9-16/.exec(lower)?.[1] || null,
        },
      });
    }
  });

  return departmentRules;
}

function parseGeneralRules(lines = []) {
  return lines
    .filter((line) => line.toLowerCase().startsWith("generellt"))
    .map((line) => ({
      raw: line,
      preferSimilarHoursAcrossWeeks:
        line.toLowerCase().includes("lika arbetstider"),
      earlyFridayBeforeFreeWeekend:
        line.toLowerCase().includes("tidigt den fredagen"),
    }));
}

export function importRulesFromText(text = "", employees = []) {
  const normalized = normalize(text);
  const lines = normalized
    .split(/(?=(?:Färgavdelningen|Bad\/Järn|Generellt|Lucia|Boris|Tobias|Therese|Dinah|Pernilla|Marianne|Marin|Elias|Henrik|Aneta|Björn|Fredrik)\b)/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const departmentRules = parseDepartmentRules(lines);
  const generalRules = parseGeneralRules(lines);

  const employeeRules = lines
    .map((line) => parseEmployeeRule(line, employees))
    .filter(Boolean);

  const preferencesPatch = {};

  employeeRules.forEach((rule) => {
    preferencesPatch[rule.employeeId] = {
      preferredOffDays: rule.preferredOffDays,
      preferredWorkDays: rule.preferredWorkDays,
      fixedTimeOff: rule.fixedTimeOff,
      notes: rule.notes,
      importedRuleTags: rule.importedRuleTags,
    };
  });

  return {
    departmentRules,
    generalRules,
    employeeRules,
    preferencesPatch,
    importedAt: new Date().toISOString(),
  };
}
