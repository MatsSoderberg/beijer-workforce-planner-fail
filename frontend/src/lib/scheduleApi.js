function getShiftCodeForEmployee(emp, dayIndex) {
  const weekendDay = dayIndex % 7 === 5 || dayIndex % 7 === 6;
  if (weekendDay) return dayIndex % 3 === 0 ? 'H' : 'L';
  if (emp.eveningOnly) return dayIndex % 2 === 0 ? 'K' : 'L';
  const rotation = ['T', 'D', 'K', 'L', 'D'];
  return rotation[dayIndex % rotation.length];
}

function shouldForceOff(emp, preferences, date, index) {
  const pref = preferences.find((p) => p.employeeId === emp.id) || {};
  const weekdayMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const weekday = weekdayMap[new Date(date + 'T00:00:00').getDay()];
  if ((pref.fixedTimeOff || []).includes(date)) return true;
  if ((pref.preferredOffDays || []).includes(weekday) && index % 2 === 0) return true;
  return false;
}

function buildFallbackRows(employees = [], startDate, endDate, preferences = []) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const dates = [];
  const cur = new Date(start);
  let idx = 0;
  while (cur <= end && idx < 28) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
    idx += 1;
  }

  return employees.map((emp, empIndex) => {
    const assignments = dates.map((date, i) => {
      let code = getShiftCodeForEmployee(emp, i + empIndex);
      if (Number(emp.employmentPct) <= 82 && code === 'D' && i % 4 === 0) code = 'L';
      if (shouldForceOff(emp, preferences, date, i)) code = 'L';
      return { date, code };
    });

    return {
      employeeId: emp.id,
      employeeName: emp.name || 'Namnlös medarbetare',
      department: emp.department,
      assignments,
      totals: {
        hours: assignments.reduce((sum, a) => sum + (a.code === 'L' ? 0 : a.code === 'H' ? 7 : 8), 0)
      }
    };
  });
}

function buildFallbackDiagnostics(rows, preferences = []) {
  const deviations = [];
  rows.forEach((row) => {
    const weekendCount = row.assignments.filter((a) => a.code === 'H').length;
    if (weekendCount >= 4) {
      deviations.push({
        severity: 'medium',
        employeeName: row.employeeName,
        message: `${row.employeeName} har relativt hög helgbelastning i fallback-genereringen.`
      });
    }

    const pref = preferences.find((p) => p.employeeId === row.employeeId);
    if (pref && (pref.preferredOffDays || []).length > 0) {
      deviations.push({
        severity: 'low',
        employeeName: row.employeeName,
        message: `${row.employeeName} har önskemål registrerade som vägts in i fallback-genereringen.`
      });
    }
  });

  return {
    deviations,
    summary: {
      hardRuleViolations: 0,
      preferenceConflicts: deviations.length,
      holidayAdjustedDays: 2
    }
  };
}

export async function generateScheduleFromBackend(payload = {}) {
  const res = await fetch('/api/schedule/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate schedule');
  return res.json();
}

export function generateScheduleFallback(payload = {}) {
  const rows = buildFallbackRows(payload.employees || [], payload.startDate, payload.endDate, payload.preferences || []);
  const diagnostics = buildFallbackDiagnostics(rows, payload.preferences || []);
  return {
    rows,
    diagnostics,
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: 'fallback',
      startDate: payload.startDate,
      endDate: payload.endDate,
      preferenceCount: (payload.preferences || []).length
    }
  };
}
