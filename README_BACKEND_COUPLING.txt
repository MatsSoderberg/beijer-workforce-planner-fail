Det här är nästa steg efter att preferenser blivit synliga i frontend.

Nu kopplar vi ihop:
- sparade preferenser i backend
- faktisk läsning från /api/preferences
- faktisk schemagenerering via /api/schedule/generate
- frontend-API för att spara/läsa/generera

Vad du ska lägga in:
1. backend/src/routes/preferences.js
2. backend/src/routes/generate.js
3. backend/src/data/preferences.json
4. frontend/src/lib/scheduleApi.js
5. frontend/src/lib/usePreferencesState.example.js
6. använd server-snippeten för att registrera routes

Viktigt:
Det här är fortfarande en mellanversion på väg från MVP till färdig lösning.
Men efter denna patch används preferenserna inte bara visuellt utan även i backendflödet.