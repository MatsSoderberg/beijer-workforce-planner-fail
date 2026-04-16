Det här paketet innehåller nästa optimeringsfas.

Backend:
- holidays.js för svenska röda dagar (grundstöd)
- wizardState.js för sparbar wizard
- scheduleVersions.js för publicera/lås/versioner

Frontend:
- scheduleApi.js med wizard/version-anrop
- EditableSchedulingWizard.jsx som är redigerbar och sparbar

Viktigt:
För att använda den fullt ut behöver du:
1. lägga in backend-routes
2. registrera routes i server/app
3. ersätta din nuvarande wizard i App.jsx med EditableSchedulingWizard

Se filerna:
- SERVER_ROUTES_SNIPPET.js
- APP_WIZARD_INTEGRATION_EXAMPLE.js
