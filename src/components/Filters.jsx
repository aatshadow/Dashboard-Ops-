import { useState } from 'react'

const DATE_PRESETS = [
  { label: 'Hoy', key: 'today' },
  { label: 'Ayer', key: 'yesterday' },
  { label: '7 días', key: 'last7' },
  { label: 'Esta semana', key: 'thisWeek' },
  { label: 'Este mes', key: 'thisMonth' },
]

export function getDateRange(preset) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today':
      return { start: today, end: today }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { start: y, end: y }
    }
    case 'last7': {
      const s = new Date(today)
      s.setDate(s.getDate() - 6)
      return { start: s, end: today }
    }
    case 'thisWeek': {
      const day = today.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday start
      const s = new Date(today)
      s.setDate(s.getDate() - diff)
      return { start: s, end: today }
    }
    case 'thisMonth': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: s, end: today }
    }
    default:
      return { start: new Date(2020, 0, 1), end: today }
  }
}

export function getPreviousRange(preset) {
  const { start, end } = getDateRange(preset)
  const duration = end - start
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd - duration)
  return { start: prevStart, end: prevEnd }
}

export function dateInRange(dateStr, range) {
  const d = new Date(dateStr + 'T00:00:00')
  const s = new Date(range.start)
  const e = new Date(range.end)
  s.setHours(0, 0, 0, 0)
  e.setHours(23, 59, 59, 999)
  return d >= s && d <= e
}

export default function Filters({ datePreset, onDatePreset, extras }) {
  return (
    <div className="filters-bar">
      <div className="filters-left">
        <div className="date-presets">
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              className={`filter-chip ${datePreset === p.key ? 'filter-chip--active' : ''}`}
              onClick={() => onDatePreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {extras && <div className="filters-right">{extras}</div>}
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      className="filter-select"
      value={value}
      onChange={e => onChange(e.target.value)}
      title={label}
    >
      <option value="">{label}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}
