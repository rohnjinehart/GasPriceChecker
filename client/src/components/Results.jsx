export default function Results({ results, gallons, mpg }) {
  const { results: stations, regionalFallback } = results

  if (!stations.length) {
    return (
      <div className="card">
        <p style={{ color: '#64748b' }}>No gas stations with price data found in this area. Try increasing the search radius.</p>
      </div>
    )
  }

  const best = stations[0]

  return (
    <div className="card">
      <div className="results-header">
        <h2>Results</h2>
        <span className="results-count">{stations.length} station{stations.length !== 1 ? 's' : ''} found</span>
      </div>

      {regionalFallback && (
        <div className="fallback-banner">
          Station-level prices unavailable — showing EIA regional average (${regionalFallback.toFixed(3)}/gal). Rankings are by distance only.
        </div>
      )}

      <div className="station-list">
        {stations.map((s, i) => {
          const savings = i > 0 ? s.trueCost - best.trueCost : null
          return (
            <div key={s.id} className={`station-card ${i === 0 ? 'best' : ''}`}>
              <div className="rank">#{i + 1}</div>

              <div className="station-info">
                <div className="station-name">{s.name}</div>
                <div className="station-meta">
                  {s.distanceMiles.toFixed(1)} mi away
                  {s.brand && s.brand !== s.name ? ` · ${s.brand}` : ''}
                </div>
                {i === 0 && <span className="savings-badge">Best deal</span>}
                {savings !== null && savings > 0.01 && (
                  <span className="savings-badge" style={{ background: '#1e1a2a', color: '#a78bfa' }}>
                    +${savings.toFixed(2)} vs best
                  </span>
                )}
              </div>

              <div className="station-prices">
                <div className="price-label">True cost ({gallons} gal)</div>
                <div className="price-main">${s.trueCost.toFixed(2)}</div>
                <div className="price-breakdown">
                  ${s.price.toFixed(3)}/gal · {s.distanceMiles.toFixed(1)} mi
                </div>
                <div className="price-breakdown">
                  Gas ${s.gasCost.toFixed(2)} + Drive ${s.drivingCost.toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '0.75rem', color: '#334155', marginTop: '1rem' }}>
        True cost = gas purchase + round-trip fuel cost at {mpg} MPG. Prices from GasBuddy / EIA. Distances are straight-line.
      </p>
    </div>
  )
}
