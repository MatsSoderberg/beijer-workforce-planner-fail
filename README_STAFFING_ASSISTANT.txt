Det här paketet lägger till en första fungerande AI-/co-pilot-liknande bemanningsassistent i frontend.

Den kan svara på frågor som:
- Hur många helger har David?
- Hur många timmar har Pia?
- Jobbar Pia på julafton?
- Vilken avdelning tillhör Tobias?

Filer:
- frontend/src/components/StaffingAssistant.jsx
- frontend/src/lib/staffingChat.js
- APP_STAFFING_ASSISTANT_INTEGRATION_EXAMPLE.js
- styles.append.txt

Viktigt:
Det här är första versionen och fungerar som en intelligent frågepanel ovanpå aktuell schemadata.
Nästa nivå är att koppla den till:
- verklig backend-data
- publicerade schemaversioner
- OpenAI / Copilot / RAG om du vill ha mer avancerade frågor