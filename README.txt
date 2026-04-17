Det här är nästa steg efter att medarbetargriden kopplats in i wizarden.

Nu används den aktuella medarbetarlistan faktiskt i genereringen:
- lägga till medarbetare påverkar genererat schema
- ta bort medarbetare påverkar genererat schema
- genereringen visar employeeCount och departments från aktuell state
- ny preview-komponent visar schema baserat på aktuell personal

Ersätt:
- frontend/src/App.jsx
- frontend/src/components/EditableSchedulingWizard.jsx

Lägg till:
- frontend/src/components/GeneratedSchedulePreview.jsx

Tips:
Om du vill visa previewn i dashboard eller wizard review direkt kan du rendera:
<GeneratedSchedulePreview generated={generatedSchedule} />

Nästa rekommenderade steg:
- koppla Copilot till den här genererade datan
- eller koppla backend-schemagenerering till samma employees-state
