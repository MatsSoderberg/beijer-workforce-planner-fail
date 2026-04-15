export const DEFAULT_STATE = {
  store: {
    chain: 'Beijer Byggmaterial',
    name: 'Nacka',
    code: 'SE-NAC-01',
    weekdayOpen: '06:00',
    weekdayClose: '19:00',
    weekendOpen: '09:00',
    weekendClose: '16:00'
  },
  period: {
    from: '2026-09-01',
    to: '2026-12-31',
    label: 'Höstschema 2026'
  },
  staffing: {
    weekday: { Kassa: 2, 'Färg': 1, 'Järn': 2 },
    weekend: { Kassa: 1, 'Färg': 1, 'Järn': 1 }
  },
  rules: {
    maxEveningsInRow: 2,
    maxDaysInRow: 6,
    avoidEarlyAfterEvening: true,
    swedishHolidays: true,
    allowManualOverride: true
  },
  employees: [
    { id: 1, name: 'David', dept: 'Kassa', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 2, name: 'Håkan', dept: 'Kassa', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 3, name: 'Katarina', dept: 'Kassa', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 4, name: 'Pia', dept: 'Kassa', employmentPct: 82, eveningOnly: true, weekendRule: 'varannan', active: true },
    { id: 5, name: 'Amelie', dept: 'Kassa', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 6, name: 'Tobias', dept: 'Färg', employmentPct: 82, eveningOnly: true, weekendRule: 'varannan', active: true },
    { id: 7, name: 'Boris', dept: 'Färg', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 8, name: 'Therese', dept: 'Färg', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 9, name: 'Fia', dept: 'Färg', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 10, name: 'Pernilla', dept: 'Färg', employmentPct: 100, eveningOnly: false, weekendRule: 'varannan', active: true },
    { id: 11, name: 'Marianne', dept: 'Järn', employmentPct: 100, eveningOnly: false, weekendRule: 'vartredje', active: true },
    { id: 12, name: 'Elias', dept: 'Järn', employmentPct: 100, eveningOnly: false, weekendRule: 'vartredje', active: true },
    { id: 13, name: 'Junia', dept: 'Järn', employmentPct: 100, eveningOnly: false, weekendRule: 'vartredje', active: true },
    { id: 14, name: 'Marin', dept: 'Järn', employmentPct: 100, eveningOnly: false, weekendRule: 'vartredje', active: true },
    { id: 15, name: 'Aneta', dept: 'Järn', employmentPct: 100, eveningOnly: false, weekendRule: 'vartredje', active: true }
  ],
  timeOff: [
    { id: 1, employeeName: 'Pia', type: 'Semester', from: '2026-10-14', to: '2026-10-18' }
  ],
  schedule: [],
  published: false
};
