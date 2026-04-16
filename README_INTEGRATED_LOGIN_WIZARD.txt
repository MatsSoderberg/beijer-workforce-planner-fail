Det här paketet gör två saker som faktiskt fungerar direkt i frontend:

1. Inloggning
- riktig login-skärm i appen
- demo-konton som fungerar
- session sparas i localStorage
- logga ut fungerar

2. Wizard
- ersätter tidigare halvkopplad wizard
- går att redigera
- går att spara
- går att återuppta efter reload
- genererar schemautkast i frontend
- publiceringsstatus sparas i wizardutkastet

Demo-konton:
- Chef: chef@beijer.local / Beijer123!
- Personal: pia@beijer.local / Beijer123!

Ersätt/lägg till:
- frontend/src/App.jsx
- frontend/src/components/LoginScreen.jsx
- frontend/src/components/EditableSchedulingWizard.jsx
- frontend/src/components/PersonalPreferencesForm.jsx
- frontend/src/lib/auth.js
- frontend/src/styles.css

Det här är den mest sammanhållna frontend-patchen hittills.
Nästa steg efter detta bör vara att koppla samma fungerande wizard till riktig backend-lagring och riktig schemagenerering.