Det här är nästa optimeringssteg.

Nu förbättras lösningen med:
- röda dagar direkt in i schemamotorn
- rikare diagnostik / avvikelsemodell
- bättre underlag för att förstå konflikter i schemat
- frontendpanel för riktig diagnostik

Filer att lägga in:
- backend/src/lib/scheduleEngine.js  (ersätt)
- backend/src/routes/generate.js     (ersätt)
- frontend/src/components/ScheduleDiagnosticsPanel.jsx
- frontend/src/lib/scheduleApi.append.txt (appenda i befintlig scheduleApi.js)
- backend/src/data/swedishHolidays.2026.json om den saknas

Efter denna patch rekommenderar jag:
1. visa diagnostics-panelen direkt efter generate i wizard
2. koppla schedule versions till UI
3. gå från JSON-lagring till databas
4. börja global optimera hela perioden istället för dag-för-dag greedy
