import { useState, useEffect } from 'react'
import './Dashboard.css'

const API = '/api'

interface Patient {
  id: string
  name: string
  age: number | null
  gender: string | null
  created_at: string
}

interface ScreenResult {
  patient_id: string
  patient_name: string
  predicted_level: string
  predicted_label: number
  confidence: number
  probabilities: { low: number; moderate: number; high: number }
}

interface ScreenResponse {
  results: ScreenResult[]
  screened: number
  skipped: number
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: '#dc2626', bg: '#fee2e2', label: 'High Risk' },
  moderate: { color: '#f59e0b', bg: '#fef3c7', label: 'Moderate Risk' },
  low: { color: '#16a34a', bg: '#dcfce7', label: 'Low Risk' },
}

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [results, setResults] = useState<ScreenResult[] | null>(null)
  const [screening, setScreening] = useState(false)
  const [loading, setLoading] = useState(true)
  const [screenInfo, setScreenInfo] = useState<{ screened: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPatients()
  }, [])

  async function loadPatients() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/patients`)
      const data = await res.json()
      setPatients(data)
    } catch (err) {
      setError('Failed to load patients. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  async function runScreening() {
    setScreening(true)
    setError('')
    setResults(null)
    try {
      const res = await fetch(`${API}/screen`, { method: 'POST' })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: ScreenResponse = await res.json()
      setResults(data.results)
      setScreenInfo({ screened: data.screened, skipped: data.skipped })
    } catch (err: any) {
      setError(err.message || 'Screening failed.')
    } finally {
      setScreening(false)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>MindWell Admin</h1>
          <p className="subtitle">Caregiver Dashboard</p>
        </div>
        <button className="btn-primary" onClick={runScreening} disabled={screening}>
          {screening ? 'Screening...' : 'Run Screening'}
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* Screening Results */}
      {results && (
        <section className="results-section">
          <div className="results-header">
            <h2>Screening Results</h2>
            <span className="results-meta">
              {screenInfo?.screened} screened, {screenInfo?.skipped} skipped (missing data)
            </span>
          </div>

          {results.length === 0 ? (
            <div className="card empty">
              No patients with both survey and journal data to screen.
            </div>
          ) : (
            <div className="results-grid">
              {results.map((r) => {
                const cfg = LEVEL_CONFIG[r.predicted_level] || LEVEL_CONFIG.low
                return (
                  <div key={r.patient_id} className="result-card card">
                    <div className="result-top">
                      <div>
                        <h3>{r.patient_name}</h3>
                        <span className="patient-id">{r.patient_id.slice(0, 8)}...</span>
                      </div>
                      <span
                        className="risk-badge"
                        style={{ color: cfg.color, background: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="probabilities">
                      <ProbBar label="Low" value={r.probabilities.low} color="#16a34a" />
                      <ProbBar label="Moderate" value={r.probabilities.moderate} color="#f59e0b" />
                      <ProbBar label="High" value={r.probabilities.high} color="#dc2626" />
                    </div>
                    <div className="confidence">
                      Confidence: {(r.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Patient List */}
      <section className="patients-section">
        <h2>Registered Patients ({patients.length})</h2>
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : patients.length === 0 ? (
          <div className="card empty">No patients registered yet.</div>
        ) : (
          <table className="patients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.age ?? '-'}</td>
                  <td>{p.gender ?? '-'}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="prob-row">
      <span className="prob-label">{label}</span>
      <div className="prob-track">
        <div className="prob-fill" style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span className="prob-value">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}
