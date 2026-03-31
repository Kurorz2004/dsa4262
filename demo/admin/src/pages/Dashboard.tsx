import { useState, useEffect } from 'react'
import './Dashboard.css'

const API = '/api'

interface PatientData {
  patient: {
    id: string
    name: string
    age: number | null
    gender: string | null
    education: string | null
    years_education: number | null
    read_ability: string | null
    write_ability: string | null
    retired: string | null
    employed: string | null
    volunteer: string | null
    health: string | null
    learning_disability: string | null
    living_arrangements: string | null
    residency: string | null
    num_friends: number | null
    num_household: number | null
    language: string | null
    created_at: string
  }
  surveys: Record<string, string | number | undefined>[]
  journals: {
    id: string
    created_at: string
    content: string
    input_method: string
    mood: string | null
  }[]
  screening: {
    predicted_level: string
    predicted_label: number
    confidence: number
    probabilities: { low: number; moderate: number; high: number }
    top_factors: {
      feature: string
      label: string
      shap_value: number
      direction: string
    }[]
  } | null
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; label: string; order: number }> = {
  high: { color: '#dc2626', bg: '#fee2e2', label: 'High Risk', order: 0 },
  moderate: { color: '#f59e0b', bg: '#fef3c7', label: 'Moderate Risk', order: 1 },
  low: { color: '#16a34a', bg: '#dcfce7', label: 'Low Risk', order: 2 },
}

const PROFILE_FIELDS: [string, string][] = [
  ['age', 'Age'],
  ['gender', 'Gender'],
  ['education', 'Education'],
  ['years_education', 'Years of Education'],
  ['read_ability', 'Reading Ability'],
  ['write_ability', 'Writing Ability'],
  ['retired', 'Retired'],
  ['employed', 'Employed'],
  ['volunteer', 'Volunteers'],
  ['health', 'Health'],
  ['learning_disability', 'Learning Disability'],
  ['living_arrangements', 'Living Arrangements'],
  ['residency', 'Region'],
  ['num_friends', 'Close Friends'],
  ['num_household', 'Household Size'],
  ['language', 'Language'],
]

const SURVEY_FIELDS: [string, string][] = [
  ['speak_habit', 'Speaking (hrs/wk)'],
  ['read_print_habit', 'Reading print (hrs/wk)'],
  ['read_web_habit', 'Reading online (hrs/wk)'],
  ['broadcast_habit', 'TV/Radio (hrs/wk)'],
  ['social_meet_freq', 'Social meetups'],
  ['professional_meet_freq', 'Professional meetups'],
  ['volunteer_meet_freq', 'Volunteer activities'],
  ['talk_social_network', 'Social media use'],
  ['divulge_family', 'Share with family'],
  ['rely_family', 'Rely on family'],
  ['divulge_friend', 'Share with friends'],
  ['rely_friend', 'Rely on friends'],
  ['divulge_spouse', 'Share with spouse'],
  ['rely_spouse', 'Rely on spouse'],
]

function fmt(val: unknown): string {
  if (val == null) return '-'
  return String(val).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function sortByRisk(patients: PatientData[]): PatientData[] {
  return [...patients].sort((a, b) => {
    const aOrder = a.screening ? (LEVEL_CONFIG[a.screening.predicted_level]?.order ?? 3) : 4
    const bOrder = b.screening ? (LEVEL_CONFIG[b.screening.predicted_level]?.order ?? 3) : 4
    if (aOrder !== bOrder) return aOrder - bOrder
    // Within same risk level, sort by confidence descending
    const aConf = a.screening?.confidence ?? 0
    const bConf = b.screening?.confidence ?? 0
    return bConf - aConf
  })
}

export default function Dashboard() {
  const [data, setData] = useState<PatientData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<Record<string, 'profile' | 'surveys' | 'journals'>>({})

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/dashboard`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json = await res.json()
      setData(sortByRisk(json.patients))
    } catch (err: any) {
      setError(err.message || 'Failed to load. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id)
    if (!tab[id]) setTab((prev) => ({ ...prev, [id]: 'profile' }))
  }

  function setPatientTab(id: string, t: 'profile' | 'surveys' | 'journals') {
    setTab((prev) => ({ ...prev, [id]: t }))
  }

  if (loading) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>GoldHaven Admin</h1>
        </header>
        <p className="loading-text">Loading and screening patients...</p>
      </div>
    )
  }

  const screened = data.filter((d) => d.screening)
  const highCount = screened.filter((d) => d.screening?.predicted_level === 'high').length
  const modCount = screened.filter((d) => d.screening?.predicted_level === 'moderate').length
  const lowCount = screened.filter((d) => d.screening?.predicted_level === 'low').length

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>GoldHaven Admin</h1>
          <p className="subtitle">
            {data.length} patient{data.length !== 1 ? 's' : ''} registered
            {' \u00B7 '}
            {screened.length} screened
          </p>
        </div>
        <button className="btn-secondary refresh-btn" onClick={loadDashboard}>
          Refresh
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* Risk summary counts */}
      {screened.length > 0 && (
        <div className="risk-counts">
          <div className="risk-count high">
            <span className="risk-count-num">{highCount}</span>
            <span className="risk-count-label">High Risk</span>
          </div>
          <div className="risk-count moderate">
            <span className="risk-count-num">{modCount}</span>
            <span className="risk-count-label">Moderate</span>
          </div>
          <div className="risk-count low">
            <span className="risk-count-num">{lowCount}</span>
            <span className="risk-count-label">Low Risk</span>
          </div>
        </div>
      )}

      <div className="patient-list">
        {data.map((d) => {
          const p = d.patient
          const s = d.screening
          const cfg = s ? LEVEL_CONFIG[s.predicted_level] || LEVEL_CONFIG.low : null
          const isOpen = expanded === p.id
          const activeTab = tab[p.id] || 'profile'

          return (
            <div key={p.id} className={`patient-card card ${isOpen ? 'open' : ''}`}>
              {/* Header — always visible */}
              <button className="patient-header" onClick={() => toggle(p.id)}>
                <div className="patient-info">
                  <h3>{p.name}</h3>
                  <span className="patient-meta">
                    {p.age ?? '?'} yrs, {fmt(p.gender)} &middot; Registered {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="patient-header-right">
                  {cfg ? (
                    <span className="risk-badge" style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                  ) : (
                    <span className="risk-badge no-data">No Data</span>
                  )}
                  <span className="chevron">{isOpen ? '\u25B2' : '\u25BC'}</span>
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="patient-body">
                  {/* Risk bar (if screened) */}
                  {s && (
                    <div className="risk-summary">
                      <ProbBar label="Low" value={s.probabilities.low} color="#16a34a" />
                      <ProbBar label="Moderate" value={s.probabilities.moderate} color="#f59e0b" />
                      <ProbBar label="High" value={s.probabilities.high} color="#dc2626" />
                      <div className="confidence">Confidence: {(s.confidence * 100).toFixed(1)}%</div>

                      {s.top_factors && s.top_factors.length > 0 && (
                        <div className="patient-factors">
                          <h4>Key Factors for This Patient</h4>
                          <div className="factors-list">
                            {s.top_factors.map((f) => (
                              <div key={f.feature} className="factor-row">
                                <span className="factor-label">{f.label}</span>
                                <span className={`factor-direction ${f.shap_value > 0 ? 'risk-up' : 'risk-down'}`}>
                                  {f.shap_value > 0 ? '\u2191' : '\u2193'} {f.direction}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="detail-tabs">
                    <button
                      className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                      onClick={() => setPatientTab(p.id, 'profile')}
                    >
                      Profile
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'surveys' ? 'active' : ''}`}
                      onClick={() => setPatientTab(p.id, 'surveys')}
                    >
                      Surveys ({d.surveys.length})
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'journals' ? 'active' : ''}`}
                      onClick={() => setPatientTab(p.id, 'journals')}
                    >
                      Journals ({d.journals.length})
                    </button>
                  </div>

                  {/* Tab content */}
                  <div className="tab-content">
                    {activeTab === 'profile' && (
                      <div className="profile-grid">
                        {PROFILE_FIELDS.map(([key, label]) => (
                          <div key={key} className="profile-field">
                            <span className="field-label">{label}</span>
                            <span className="field-value">{fmt((p as any)[key])}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'surveys' && (
                      d.surveys.length === 0 ? (
                        <p className="empty-text">No surveys submitted yet.</p>
                      ) : (
                        <div className="items-list">
                          {d.surveys.map((sv, idx) => (
                            <div key={sv.id as string} className="item-card">
                              <div className="item-header">
                                <strong>Survey {d.surveys.length - idx}</strong>
                                <span className="item-date">
                                  {new Date(sv.created_at as string).toLocaleString()}
                                </span>
                              </div>
                              <div className="survey-grid">
                                {SURVEY_FIELDS.map(([key, label]) => (
                                  <div key={key} className="survey-field">
                                    <span className="field-label">{label}</span>
                                    <span className="field-value">
                                      {typeof sv[key] === 'number' ? sv[key] : fmt(sv[key])}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {activeTab === 'journals' && (
                      d.journals.length === 0 ? (
                        <p className="empty-text">No journal entries yet.</p>
                      ) : (
                        <div className="items-list">
                          {d.journals.map((j) => (
                            <div key={j.id} className="item-card journal-item">
                              <div className="item-header">
                                <span className="item-date">
                                  {new Date(j.created_at).toLocaleString()}
                                </span>
                                <div className="journal-tags">
                                  {j.mood && <span className="journal-tag mood">{j.mood}</span>}
                                  <span className="journal-tag method">
                                    {j.input_method === 'voice' ? 'Voice' : 'Text'}
                                  </span>
                                </div>
                              </div>
                              <p className="journal-content">{j.content}</p>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
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
