// I App.jsx:

// 1. Importera komponenten
// import StaffingAssistant from "./components/StaffingAssistant";

// 2. Skicka in aktuell schemadata, till exempel från wizardens latestGenerated.rows
// eller från en publicerad schemaversion.

// Exempel i chefsvy:
// {role === 'chef' && activeView === 'engine' && (
//   <div className="split-layout">
//     <EngineView />
//     <StaffingAssistant scheduleRows={currentScheduleRows} />
//   </div>
// )}

// Exempel om du bara vill testa direkt:
// const currentScheduleRows = [
//   {
//     employeeName: "David",
//     department: "Kassa",
//     assignments: [
//       { date: "2026-12-24", code: "L" },
//       { date: "2026-12-25", code: "H" }
//     ],
//     totals: { hours: 40 }
//   }
// ];
