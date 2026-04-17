Det här är nästa steg efter valideringen.

Nu kopplas medarbetargriden till wizardens riktiga state:
- medarbetare ligger i App.jsx state
- wizarden får employees + setEmployees som props
- EmployeeGrid renderas i wizardens Bemanning-steg
- lägga till och ta bort medarbetare fungerar direkt i flödet

Det betyder att svaret på din fråga är: ja.
När denna patch är inne kan du lägga till och ta bort medarbetare i wizarden.

Ersätt:
- frontend/src/App.jsx
- frontend/src/components/EditableSchedulingWizard.jsx

Förutsätter att du redan har:
- frontend/src/components/EmployeeGrid.jsx
- CSS från employee-grid-validation-patch i styles.css
