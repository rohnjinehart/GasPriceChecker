import { useState } from 'react'

export default function LocationInput({ onLocation }) {
  const [geoStatus, setGeoStatus] = useState(null) // null | 'loading' | 'ok' | 'err'
  const [manualLat, setManualLat] = useState('')
  const [manualLon, setManualLon] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [mode, setMode] = useState('auto') // 'auto' | 'zip' | 'manual'

  function useGPS() {
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoStatus('ok')
        onLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
        })
      },
      () => {
        setGeoStatus('err')
      },
      { timeout: 8000 }
    )
  }

  async function useZip() {
    if (!zipCode.match(/^\d{5}$/)) return
    try {
      // Nominatim (OSM) free geocoding — no key needed
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1`,
        { headers: { 'User-Agent': 'GasPriceChecker/1.0' } }
      )
      const data = await r.json()
      if (!data.length) { alert('ZIP code not found'); return }
      onLocation({
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        label: `ZIP ${zipCode} — ${data[0].display_name.split(',')[0]}`
      })
    } catch {
      alert('Could not geocode ZIP code')
    }
  }

  function useManual() {
    const lat = parseFloat(manualLat)
    const lon = parseFloat(manualLon)
    if (isNaN(lat) || isNaN(lon)) return
    onLocation({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` })
  }

  return (
    <div>
      <div className="tab-row">
        <button className={`tab ${mode === 'auto' ? 'active' : ''}`} onClick={() => setMode('auto')}>
          Use GPS
        </button>
        <button className={`tab ${mode === 'zip' ? 'active' : ''}`} onClick={() => setMode('zip')}>
          ZIP Code
        </button>
        <button className={`tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
          Coordinates
        </button>
      </div>

      {mode === 'auto' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={useGPS} disabled={geoStatus === 'loading'}>
            {geoStatus === 'loading' ? 'Detecting...' : 'Detect My Location'}
          </button>
          {geoStatus === 'ok' && <span className="status ok">Location detected</span>}
          {geoStatus === 'err' && <span className="status err">GPS unavailable — try ZIP code</span>}
        </div>
      )}

      {mode === 'zip' && (
        <div className="form-row">
          <div className="field" style={{ maxWidth: 180 }}>
            <label>ZIP Code</label>
            <input
              type="text"
              maxLength={5}
              placeholder="e.g. 90210"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" onClick={useZip} disabled={!zipCode.match(/^\d{5}$/)}>
            Set Location
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="form-row">
          <div className="field">
            <label>Latitude</label>
            <input type="number" step="any" placeholder="e.g. 37.7749" value={manualLat} onChange={e => setManualLat(e.target.value)} />
          </div>
          <div className="field">
            <label>Longitude</label>
            <input type="number" step="any" placeholder="e.g. -122.4194" value={manualLon} onChange={e => setManualLon(e.target.value)} />
          </div>
          <button className="btn btn-ghost" onClick={useManual}>Set Location</button>
        </div>
      )}
    </div>
  )
}
