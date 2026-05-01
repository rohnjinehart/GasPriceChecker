# Gas Price Checker

A web app that finds nearby gas stations and calculates the true cost of filling up at each one, factoring in the fuel you burn driving there and back.

## What it does

- Detects your location via GPS, ZIP code, or manual coordinates
- Finds gas stations within a radius you choose
- Pulls real-time gas prices for each station
- Calculates the true total cost: gas purchased + fuel cost of the round trip to the station
- Ranks stations by true cost, not just listed price

## Tech stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Gas station locations:** OpenStreetMap via Overpass API (free)
- **Gas prices:** GasBuddy public endpoint, falls back to EIA weekly regional average
- **Car MPG data:** NHTSA Fuel Economy API (free, no key required)
- **ZIP geocoding:** Nominatim (OpenStreetMap, free)

No paid APIs. No API keys required.

## Running locally

**Requirements:** Node.js v18+

Install dependencies:
```
npm run install:all
```

Start the backend (runs on port 3001):
```
cd server
npm run dev
```

Start the frontend (runs on port 5173):
```
cd client
npm run dev
```

Open `http://localhost:5173`.

## How the cost calculation works

```
true cost = (gallons x price) + (round trip miles / MPG x price)
```

A station 5 miles away with a lower listed price can still cost more overall once you account for the gas used to get there. This app surfaces that.
