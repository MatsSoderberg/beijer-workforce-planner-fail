# Beijer Workforce Planner – Deploy-ready MVP

Detta paket är förberett för **enkel webbdeploy**, främst på **Render**.

## Rekommenderad hosting
- Render (enklast för denna fullstack-MVP)
- Railway fungerar också
- Azure App Service fungerar också

## Vad som är förberett
- Frontend byggs med Vite
- Backend serverar både API och byggd frontend
- SPA fallback för webbrouting
- Filbaserad datalagring i `backend/data/state.json`
- `render.yaml` för snabb deploy
- `Procfile` för kompatibla plattformar

## Lokal körning
```bash
npm install
npm run dev
```

## Lokal produktionskörning
```bash
npm install
npm run build
npm run start
```
Öppna sedan `http://localhost:3001`.

## Deploy på Render
1. Ladda upp detta repo till GitHub.
2. I Render, välj **New + > Blueprint** eller **New Web Service**.
3. Peka på repot.
4. Om du använder Blueprint läser Render in `render.yaml` automatiskt.
5. Annars ange:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
6. Välj Node 20.
7. När deployen är klar öppnar du den publika URL:en.

## Viktigt om data
Denna MVP sparar data i JSON-fil på servern. På vissa hostade plattformar är filsystemet inte permanent över nya deployer eller omstart. För en stabil produktionslösning bör nästa steg vara:
- Postgres
- Azure SQL
- Dataverse

## API
- `GET /api/health`
- `GET /api/state`
- `PUT /api/state/:section`
- `POST /api/employees`
- `POST /api/timeoff`
- `POST /api/schedule/generate`
- `POST /api/schedule/publish`
- `GET /api/export/schedule`
- `GET /api/export/summary`
