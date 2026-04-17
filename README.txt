Det här paketet gör båda sakerna samtidigt:

1. Copilot kopplas till den senaste genererade datan i appen
- App.jsx håller generatedSchedule i state
- wizarden skickar upp onGenerated
- Copilot får generated={generatedSchedule}
- Dashboard kan visa preview på samma generering

2. Backend-generering kopplas till samma employees-state
- wizarden skickar aktuell employees-lista till /api/schedule/generate
- om backend inte svarar används en lokal fallback
- genereringen använder alltså nu samma medarbetare som du lägger till/tar bort i wizarden

Filer:
- frontend/src/App.jsx
- frontend/src/components/EditableSchedulingWizard.jsx
- frontend/src/components/StaffingCopilotBackend.jsx
- frontend/src/components/GeneratedSchedulePreview.jsx
- frontend/src/lib/scheduleApi.js
- backend/src/routes/generate.js

Det här är det mest sammanhängande steget hittills mellan:
- personalgrid
- generering
- preview
- copilot
