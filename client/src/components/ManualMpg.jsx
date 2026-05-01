import { useState } from 'react'

export default function ManualMpg({ onMpg }) {
  const [value, setValue] = useState('')

  function handleChange(e) {
    const v = e.target.value
    setValue(v)
    const n = parseFloat(v)
    onMpg(n > 0 ? n : null)
  }

  return (
    <div className="form-row">
      <div className="field" style={{ maxWidth: 200 }}>
        <label>Miles per gallon (MPG)</label>
        <input
          type="number"
          min="1"
          max="200"
          step="0.1"
          placeholder="e.g. 32"
          value={value}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
