import { useState, useEffect } from 'react'

export default function CarSelector({ onMpg }) {
  const [years, setYears] = useState([])
  const [makes, setMakes] = useState([])
  const [models, setModels] = useState([])
  const [options, setOptions] = useState([])

  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [optionId, setOptionId] = useState('')
  const [loadingField, setLoadingField] = useState(null)

  useEffect(() => {
    fetch('/api/vehicles/years')
      .then(r => r.json())
      .then(setYears)
      .catch(() => {})
  }, [])

  async function onYearChange(y) {
    setYear(y); setMake(''); setModel(''); setOptionId('')
    setMakes([]); setModels([]); setOptions([])
    onMpg(null)
    if (!y) return
    setLoadingField('make')
    const data = await fetch(`/api/vehicles/makes?year=${y}`).then(r => r.json())
    setMakes(data)
    setLoadingField(null)
  }

  async function onMakeChange(m) {
    setMake(m); setModel(''); setOptionId('')
    setModels([]); setOptions([])
    onMpg(null)
    if (!m) return
    setLoadingField('model')
    const data = await fetch(`/api/vehicles/models?year=${year}&make=${encodeURIComponent(m)}`).then(r => r.json())
    setModels(data)
    setLoadingField(null)
  }

  async function onModelChange(m) {
    setModel(m); setOptionId('')
    setOptions([])
    onMpg(null)
    if (!m) return
    setLoadingField('option')
    const data = await fetch(`/api/vehicles/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(m)}`).then(r => r.json())
    setOptions(data)
    setLoadingField(null)
    // If only one option, auto-select it
    if (data.length === 1) onOptionChange(data[0].value)
  }

  async function onOptionChange(id) {
    setOptionId(id)
    onMpg(null)
    if (!id) return
    const data = await fetch(`/api/vehicles/mpg/${id}`).then(r => r.json())
    onMpg(data.combined)
  }

  return (
    <div className="form-row">
      <div className="field">
        <label>Year</label>
        <select value={year} onChange={e => onYearChange(e.target.value)}>
          <option value="">Select year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Make {loadingField === 'make' && '(loading...)'}</label>
        <select value={make} onChange={e => onMakeChange(e.target.value)} disabled={!makes.length}>
          <option value="">Select make</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Model {loadingField === 'model' && '(loading...)'}</label>
        <select value={model} onChange={e => onModelChange(e.target.value)} disabled={!models.length}>
          <option value="">Select model</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {options.length > 1 && (
        <div className="field">
          <label>Trim {loadingField === 'option' && '(loading...)'}</label>
          <select value={optionId} onChange={e => onOptionChange(e.target.value)} disabled={!options.length}>
            <option value="">Select trim</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.text}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}
