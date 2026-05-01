import { useState } from 'react'
import CarSelector from './components/CarSelector.jsx'
import ManualMpg from './components/ManualMpg.jsx'
import LocationInput from './components/LocationInput.jsx'
import Results from './components/Results.jsx'

export default function App() {
  const [mpgMode, setMpgMode] = useState('car') // 'car' | 'manual'
  const [mpg, setMpg] = useState(null)
  const [gallons, setGallons] = useState(10)
  const [location, setLocation] = useState(null) // { lat, lon, label }
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [radius, setRadius] = useState(5) // miles

  async function handleSearch() {
    if (!location || !mpg) return
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const radiusMeters = radius * 1609
      const url = `/api/search?lat=${location.lat}&lon=${location.lon}&radius=${radiusMeters}&mpg=${mpg}&gallons=${gallons}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const canSearch = location && mpg && !loading

  return (
    <div>
      <h1>Gas Price Checker</h1>
      <p className="subtitle">Find the cheapest station factoring in the cost to drive there</p>

      <div className="card">
        <h2>Your Vehicle</h2>
        <div className="tab-row">
          <button className={`tab ${mpgMode === 'car' ? 'active' : ''}`} onClick={() => setMpgMode('car')}>
            Select Car
          </button>
          <button className={`tab ${mpgMode === 'manual' ? 'active' : ''}`} onClick={() => setMpgMode('manual')}>
            Enter MPG
          </button>
        </div>

        {mpgMode === 'car'
          ? <CarSelector onMpg={setMpg} />
          : <ManualMpg onMpg={setMpg} />
        }

        {mpg && (
          <p className="status ok" style={{ marginTop: '0.75rem' }}>
            Using {mpg} MPG (combined)
          </p>
        )}
      </div>

      <div className="card">
        <h2>Search Settings</h2>
        <LocationInput onLocation={setLocation} />

        <div className="form-row" style={{ marginTop: '1rem' }}>
          <div className="field">
            <label>Search radius (miles)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Gallons to fill up</label>
            <input
              type="number"
              min="1"
              max="50"
              value={gallons}
              onChange={e => setGallons(Number(e.target.value))}
            />
          </div>
          <button className="btn" onClick={handleSearch} disabled={!canSearch}>
            {loading ? 'Searching...' : 'Find Best Price'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner" />
          Fetching stations and prices...
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {results && <Results results={results} gallons={gallons} mpg={mpg} />}
    </div>
  )
}
