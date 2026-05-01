# Gas Price Checker — Setup

## Prerequisites
- Node.js LTS (v20 or v22) — download from https://nodejs.org

## First-time setup (run once)
```
npm run install:all
```
This installs dependencies for both server and client.

## Running the app
Open **two** terminal windows:

**Terminal 1 — Backend (port 3001)**
```
cd server
npm run dev
```

**Terminal 2 — Frontend (port 5173)**
```
cd client
npm run dev
```

Then open http://localhost:5173 in your browser.

## How it works
1. **Car selector** pulls real MPG data from the free NHTSA Fuel Economy API (no key needed)
2. **Gas stations** are fetched from OpenStreetMap via the free Overpass API
3. **Gas prices** are pulled from GasBuddy's public endpoint; falls back to EIA weekly regional average if unavailable
4. **True cost** = (gallons × station price) + (round-trip miles ÷ MPG × station price)
   - This accounts for the gas you burn just driving to the station

## APIs used (all free, no API keys required)
| API | Purpose |
|-----|---------|
| fueleconomy.gov | Car MPG lookup |
| overpass-api.de | Gas station locations (OpenStreetMap) |
| GasBuddy public endpoint | Real-time station prices |
| EIA (DEMO_KEY) | Regional price fallback |
| Nominatim (OSM) | ZIP code → coordinates |
