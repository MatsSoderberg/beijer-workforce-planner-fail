Det här är nästa nivå för bemanningscopilot.

Nu flyttas logiken till backend så att copilotten läser:
- senaste publicerade schemaversion
- schemarader
- sammanfattning/avvikelser från versionen

Paketet innehåller:
- backend/src/lib/copilotAnalyzer.js
- backend/src/routes/copilot.js
- frontend/src/components/StaffingCopilotBackend.jsx
- frontend/src/lib/scheduleApi.append.txt
- SERVER_COPILOT_ROUTE_SNIPPET.js
- APP_COPILOT_INTEGRATION_EXAMPLE.js
- styles.append.txt

Det här är ett viktigt steg eftersom copilotten nu inte längre bara är lokal frontendlogik.
Nästa nivå efter detta är:
- riktig AI/LLM-koppling
- friare språkförståelse
- frågor över flera schemaversioner
- frågor över preferenser, frånvaro och publicerade historikdata