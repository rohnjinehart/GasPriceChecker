import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// --- NHTSA fuel economy API (free, no key) ---
// Returns list of years available
app.get('/api/vehicles/years', async (req, res) => {
  try {
    const r = await fetch('https://www.fueleconomy.gov/ws/rest/vehicle/menu/year', {
      headers: { Accept: 'application/json' }
    })
    const data = await r.json()
    const years = data.menuItem.map(i => i.value).reverse()
    res.json(years)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/vehicles/makes', async (req, res) => {
  const { year } = req.query
  if (!year) return res.status(400).json({ error: 'year required' })
  try {
    const r = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=${year}`, {
      headers: { Accept: 'application/json' }
    })
    const data = await r.json()
    const items = Array.isArray(data.menuItem) ? data.menuItem : [data.menuItem]
    res.json(items.map(i => i.value))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/vehicles/models', async (req, res) => {
  const { year, make } = req.query
  if (!year || !make) return res.status(400).json({ error: 'year and make required' })
  try {
    const r = await fetch(
      `https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=${year}&make=${encodeURIComponent(make)}`,
      { headers: { Accept: 'application/json' } }
    )
    const data = await r.json()
    const items = Array.isArray(data.menuItem) ? data.menuItem : [data.menuItem]
    res.json(items.map(i => i.value))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/vehicles/options', async (req, res) => {
  const { year, make, model } = req.query
  if (!year || !make || !model) return res.status(400).json({ error: 'year, make, model required' })
  try {
    const r = await fetch(
      `https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
      { headers: { Accept: 'application/json' } }
    )
    const data = await r.json()
    const items = Array.isArray(data.menuItem) ? data.menuItem : [data.menuItem]
    res.json(items.map(i => ({ text: i.text, value: i.value })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get MPG for a specific vehicle ID
app.get('/api/vehicles/mpg/:id', async (req, res) => {
  try {
    const r = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/${req.params.id}`, {
      headers: { Accept: 'application/json' }
    })
    const data = await r.json()
    res.json({
      city: parseFloat(data.city08),
      highway: parseFloat(data.highway08),
      combined: parseFloat(data.comb08),
      fuelType: data.fuelType
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Gas stations via Overpass API (OpenStreetMap, free) ---
// Returns nearby gas stations with coordinates and name
app.get('/api/stations', async (req, res) => {
  const { lat, lon, radius = 8000 } = req.query
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' })

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="fuel"](around:${radius},${lat},${lon});
      way["amenity"="fuel"](around:${radius},${lat},${lon});
    );
    out center;
  `

  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    })
    const data = await r.json()

    const stations = data.elements.map(el => {
      const slat = el.lat ?? el.center?.lat
      const slon = el.lon ?? el.center?.lon
      return {
        id: el.id,
        name: el.tags?.name || el.tags?.brand || 'Gas Station',
        brand: el.tags?.brand || null,
        lat: slat,
        lon: slon,
        distanceMiles: haversine(parseFloat(lat), parseFloat(lon), slat, slon)
      }
    }).filter(s => s.lat && s.lon)

    res.json(stations)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GasBuddy-style prices via NREL Alternative Fuels Station API (free, no key for basic) ---
// Since GasBuddy has no official API, we use the EIA weekly retail gas price by region
// and supplement with manual/crowdsourced prices. For station-level prices, we use
// a public GasBuddy scrape endpoint that returns nearby prices.
app.get('/api/prices', async (req, res) => {
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' })

  try {
    // Use GasBuddy's public-facing search endpoint (no auth required)
    const gbUrl = `https://www.gasbuddy.com/assets-v2/api/location/search?lat=${lat}&lng=${lon}&search_radius=10`
    const r = await fetch(gbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json'
      }
    })

    if (!r.ok) throw new Error(`GasBuddy returned ${r.status}`)
    const data = await r.json()

    const prices = (data.stations || []).map(s => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lon: s.lng,
      price: s.price ? parseFloat(s.price) : null,
      fuelType: 'regular'
    })).filter(s => s.price !== null)

    res.json(prices)
  } catch {
    // GasBuddy fallback: return EIA regional average so the app still works
    try {
      const eiaPrice = await getEIARegionalPrice()
      res.json({ fallback: true, regionalAverage: eiaPrice, message: 'Using EIA regional average — GasBuddy unavailable' })
    } catch (e2) {
      res.status(500).json({ error: 'Could not fetch gas prices: ' + e2.message })
    }
  }
})

// EIA free API — weekly retail gasoline prices by region (no key needed for this endpoint)
async function getEIARegionalPrice() {
  const r = await fetch(
    'https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=DEMO_KEY&frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=1&facets[product][]=EPM0&facets[duoarea][]=NUS',
    { headers: { Accept: 'application/json' } }
  )
  const data = await r.json()
  return parseFloat(data.response.data[0].value)
}

// --- Combined search: stations + prices merged ---
app.get('/api/search', async (req, res) => {
  const { lat, lon, radius, mpg, gallons } = req.query
  if (!lat || !lon || !mpg) return res.status(400).json({ error: 'lat, lon, mpg required' })

  const userMpg = parseFloat(mpg)
  const userGallons = parseFloat(gallons) || 10 // how many gallons they plan to buy

  try {
    // Fetch stations from OSM
    const stationsRes = await fetch(`http://localhost:${PORT}/api/stations?lat=${lat}&lon=${lon}&radius=${radius || 8000}`)
    const stations = await stationsRes.json()

    // Try to get GasBuddy prices
    let priceMap = {}
    let regionalFallback = null

    const pricesRes = await fetch(`http://localhost:${PORT}/api/prices?lat=${lat}&lon=${lon}`)
    const pricesData = await pricesRes.json()

    if (pricesData.fallback) {
      regionalFallback = pricesData.regionalAverage
    } else {
      // Match prices to stations by proximity (within 0.05 miles)
      for (const p of pricesData) {
        let bestStation = null
        let bestDist = 0.1
        for (const s of stations) {
          const d = haversine(p.lat, p.lon, s.lat, s.lon)
          if (d < bestDist) { bestDist = d; bestStation = s }
        }
        if (bestStation) priceMap[bestStation.id] = p.price
      }
    }

    // Build results with true cost calculation
    const results = stations.map(station => {
      const price = priceMap[station.id] ?? regionalFallback ?? null
      if (price === null) return null

      // True cost = cost of gas bought + cost of driving to station and back
      // driving cost = (round trip miles / mpg) * gas price
      const roundTripMiles = station.distanceMiles * 2
      const drivingGasCost = (roundTripMiles / userMpg) * price
      const gasCost = price * userGallons
      const trueCost = gasCost + drivingGasCost
      const trueUnitPrice = trueCost / userGallons

      return {
        ...station,
        price,
        gasCost: round2(gasCost),
        drivingCost: round2(drivingGasCost),
        trueCost: round2(trueCost),
        trueUnitPrice: round2(trueUnitPrice),
        isPriceFallback: !!regionalFallback
      }
    }).filter(Boolean)

    results.sort((a, b) => a.trueCost - b.trueCost)

    res.json({ results, regionalFallback })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8 // miles
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function deg2rad(d) { return d * (Math.PI / 180) }
function round2(n) { return Math.round(n * 100) / 100 }

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
