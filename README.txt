Den här patchen ersätter bara frontend/src/App.jsx och lägger in Copilot som en synlig flik i chefsvyn.

För att det ska fungera måste du också redan ha:
- frontend/src/components/StaffingCopilotBackend.jsx
- frontend/src/lib/scheduleApi.js med fetchCopilotContext + askCopilot
- backend copilot-route inkopplad
