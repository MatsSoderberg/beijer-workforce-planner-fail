function getWeekdayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'][d.getDay()];
}

function getISOWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1)/7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}

function getShiftTemplate(code) {
  if (code === 'L') return { label: 'Ledig', startTime: '', endTime: '' };
  if (code === 'H') return { label: 'Helg', startTime: '09:00', endTime: '16:00' };
  if (code === 'T') return { label: 'Tidigt', startTime: '06:00', endTime: '14:30' };
  if (code === 'D') return { label: 'Dag', startTime: '08:00', endTime: '16:30' };
  if (code === 'K') return { label: 'Kväll', startTime: '10:30', endTime: '19:00' };
  return { label: code, startTime: '', endTime: '' };
}

function getShiftCodeForEmployee(emp, dayIndex) {
  const weekendDay = dayIndex % 7 === 5 || dayIndex % 7 === 6;
  if (weekendDay) return dayIndex % 3 === 0 ? 'H' : 'L';
  if (emp.eveningOnly) return dayIndex % 2 === 0 ? 'K' : 'L';
  const rotation = ['T', 'D', 'K', 'L', 'D'];
  return rotation[dayIndex % rotation.length];
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
  const start = new Date(payload.startDate + 'T00:00:00');
  const end = new Date(payload.endDate + 'T00:00:00');
  const dates = [];
  const cur = new Date(start);
  let idx = 0;
  while (cur <= end && idx < 126) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
    idx += 1;
  }

  const rows = (payload.employees || []).map((emp, empIndex) => {
    const assignments = dates.map((date, i) => {
      const code = getShiftCodeForEmployee(emp, i + empIndex);
      const tpl = getShiftTemplate(code);
      return {
        date,
        weekKey: getISOWeek(date),
        weekdayLabel: getWeekdayName(date),
        code,
        shiftLabel: tpl.label,
        startTime: tpl.startTime,
        endTime: tpl.endTime
      };
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

  const weekCount = rows[0] ? [...new Set(rows[0].assignments.map(a => a.weekKey))].length : 0;

  return {
    rows,
    diagnostics: {
      deviations: [],
      summary: { hardRuleViolations: 0, preferenceConflicts: 0, holidayAdjustedDays: 0, generatedWeeks: weekCount }
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: 'fallback',
      startDate: payload.startDate,
      endDate: payload.endDate,
      generatedWeeks: weekCount
    }
  };
}
