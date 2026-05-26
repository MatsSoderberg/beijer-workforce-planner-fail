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
  return text.replace(/\r/g, "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function detectDepartment(text = "") {
  const lower = text.toLowerCase();

  if (lower.includes("färgavdelningen")) return "Färg";
  if (lower.includes("bad/järn") || lower.includes("järn")) return "Bad/Järn";
  if (lower.includes("kassa")) return "Kassa";
  if (lower.includes("lager")) return "Lager";
  if (lower.includes("trähall")) return "Trähall";
  if (lower.includes("säljkontor")) return "Säljkontor";

  return "Okänd avdelning";
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

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    preferredOffDays: detectDays(lower, ["ledig", "lediga"]),
    preferredWorkDays: detectDays(lower, ["jobba", "jobbar", "tidigt"]),
    fixedTimeOff: [],
    notes: line,
    importedRuleTags: {
      prefersEarly:
        lower.includes("helst tidigt") ||
        lower.includes("tidigt") ||
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
        lower.includes("inga 6-15") ||
        lower.includes("inte 6-15"),

      avoidsEightToFive:
        lower.includes("inga 8-17") ||
        lower.includes("inte 8-17"),

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
    },
  };
}

function parseDepartmentRules(lines = []) {
  return lines
    .filter((line) => {
      const lower = line.toLowerCase();
      return (
        lower.startsWith("färgavdelningen") ||
        lower.startsWith("bad/järn") ||
        lower.startsWith("järn") ||
        lower.startsWith("kassa") ||
        lower.startsWith("lager") ||
        lower.startsWith("trähall") ||
        lower.startsWith("säljkontor")
      );
    })
    .map((line) => ({
      department: detectDepartment(line),
      raw: line,
    }));
}

function parseGeneralRules(lines = []) {
  return lines
    .filter((line) => line.toLowerCase().startsWith("generellt"))
    .map((line) => ({
      raw: line,
      preferSimilarHoursAcrossWeeks: line.toLowerCase().includes("lika arbetstider"),
      earlyFridayBeforeFreeWeekend: line.toLowerCase().includes("tidigt den fredagen"),
    }));
}

function mergePreference(existing = {}, imported = {}) {
  return {
    preferredOffDays: Array.from(
      new Set([...(existing.preferredOffDays || []), ...(imported.preferredOffDays || [])])
    ),
    preferredWorkDays: Array.from(
      new Set([...(existing.preferredWorkDays || []), ...(imported.preferredWorkDays || [])])
    ),
    fixedTimeOff: Array.from(
      new Set([...(existing.fixedTimeOff || []), ...(imported.fixedTimeOff || [])])
    ),
    notes: [existing.notes, imported.notes].filter(Boolean).join("\n\n"),
    importedRuleTags: {
      ...(existing.importedRuleTags || {}),
      ...(imported.importedRuleTags || {}),
    },
  };
}

export function mergeImportedPreferences(currentPreferences = {}, preferencesPatch = {}) {
  const merged = { ...currentPreferences };

  Object.entries(preferencesPatch).forEach(([employeeId, importedPref]) => {
    merged[employeeId] = mergePreference(merged[employeeId], importedPref);
  });

  return merged;
}

export function importRulesFromText(text = "", employees = [], packageName = "") {
  const normalized = normalize(text);
  const department = detectDepartment(normalized);
  const name = packageName || `${department} regler`;

  const lines = normalized
    .split(/(?=(?:Färgavdelningen|Bad\/Järn|Generellt|Lucia|Boris|Tobias|Therese|Dinah|Pernilla|Marianne|Marin|Elias|Henrik|Aneta|Björn|Fredrik|Kassa|Lager|Trähall|Säljkontor)\b)/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const departmentRules = parseDepartmentRules(lines);
  const generalRules = parseGeneralRules(lines);
  const employeeRules = lines.map((line) => parseEmployeeRule(line, employees)).filter(Boolean);

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

  const importedAt = new Date().toISOString();

  return {
    id: `${slugify(name)}-${Date.now()}`,
    name,
    department,
    departmentRules,
    generalRules,
    employeeRules,
    preferencesPatch,
    importedAt,
  };
}
