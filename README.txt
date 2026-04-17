Det här paketet gör nästa bästa steg:

1. Preferenser följer med genereringen
- frontend skickar employees + preferences till /api/schedule/generate
- fallback-genereringen väger också in preferenser
- metadata visar preferenceCount

2. Copilot läser nu schema + preferenser + avvikelser
- frågor om t.ex. "Vilka önskemål har Pia?" fungerar
- frågor om antal preferenser fungerar
- frågor om avvikelser fungerar fortsatt

Filer:
- frontend/src/App.jsx
- frontend/src/components/EditableSchedulingWizard.jsx
- frontend/src/components/StaffingCopilotBackend.jsx
- frontend/src/components/GeneratedSchedulePreview.jsx
- frontend/src/lib/scheduleApi.js
- backend/src/routes/generate.js
