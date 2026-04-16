Det här paketet är integrationssteget efter regelmotor v2.

Det innehåller:
1. Regelmotor v2-filer
2. Route-filer för preferenser + schemagenerering
3. API-helper för frontend
4. Exempelkomponent som visar hur personalönskemål matas in och skickas med till generate-anrop
5. Server-snippet för hur du kopplar in routes
6. Regelmatris + nästa optimeringssteg

Rekommenderad implementationsordning:
A. Lägg in backend-filerna
B. Registrera /api/preferences och /api/schedule i server/app
C. Lägg in frontend/src/lib/scheduleApi.js
D. Lägg in PersonalPreferencesForm och SchedulingAdminExample
E. Byt ut generate-anropet i wizard/admin så att preferences skickas med
F. Verifiera att en preferens som 'ledig monday' påverkar resultatet

Mål efter denna patch:
- Systemet går från ren MVP-logik till regelstyrd, preferensbaserad planering
- Det blir enklare att fortsätta optimera mot mer färdig lösning