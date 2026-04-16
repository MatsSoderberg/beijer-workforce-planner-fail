// I App.jsx:
//
// import StaffingCopilotBackend from "./components/StaffingCopilotBackend";
//
// Exempel som egen flik i chefsvy:
// ['copilot', 'Copilot']
//
// Render:
// {role === 'chef' && activeView === 'copilot' && <StaffingCopilotBackend />}
//
// Detta gör att chatten inte längre läser tillfällig frontend-data,
// utan senaste publicerade schemaversion från backend.
