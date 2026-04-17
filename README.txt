Det här paketet lägger till:
- exakta tider per pass
- en veckobrowser för alla veckor

Filer:
- frontend/src/lib/scheduleApi.js
- backend/src/routes/generate.js
- frontend/src/components/GeneratedSchedulePreview.jsx
- frontend/src/components/WeeklyScheduleBrowser.jsx
- styles.append.txt

För att visa alla veckor:
import WeeklyScheduleBrowser from './components/WeeklyScheduleBrowser';
<WeeklyScheduleBrowser generated={generatedSchedule} />
