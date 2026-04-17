Den här patchen lägger till smart validering direkt i EmployeeGrid.

Nytt:
- varning om namn saknas
- varning om ogiltig avdelning
- varning om felaktig eller extrem sysselsättningsgrad
- varning om kväll-only på tveksamma kombinationer
- sammanfattande varningar för avdelningar utan medarbetare
- tydlig status: validering kräver åtgärd / inga valideringsfel

Filer:
- frontend/src/components/EmployeeGrid.jsx
- styles.append.txt

För att använda:
1. Lägg in EmployeeGrid.jsx
2. Lägg till CSS från styles.append.txt i din styles.css
3. Rendera komponenten i wizarden:
   <EmployeeGrid employees={employees} setEmployees={setEmployees} />
