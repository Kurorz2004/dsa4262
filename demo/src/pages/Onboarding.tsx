import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Onboarding.css'

const GENDER_OPTIONS = ['male', 'female', 'other']
const EDUCATION_OPTIONS = [
  'less than high school',
  'high school diploma',
  'some college, no degree',
  "associate's degree",
  "bachelor's degree",
  "master's degree",
  'doctoral degree',
]
const ABILITY_OPTIONS = ['poor', 'fair', 'good', 'very_good', 'excellent']
const YES_NO = ['yes', 'no']
const HEALTH_OPTIONS = ['poor', 'fair', 'good', 'very_good', 'excellent']
const LIVING_OPTIONS = ['alone', 'with_spouse', 'with_family', 'with_others', 'care_facility']
const RESIDENCY_OPTIONS = ['urban', 'suburban', 'rural']

interface Field {
  id: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
  required?: boolean
}

const FIELDS: Field[] = [
  { id: 'name', label: 'Full Name', type: 'text', required: true },
  { id: 'age', label: 'Age', type: 'number', required: true },
  { id: 'gender', label: 'Gender', type: 'select', options: GENDER_OPTIONS },
  { id: 'education', label: 'Education Level', type: 'select', options: EDUCATION_OPTIONS },
  { id: 'years_education', label: 'Years of Education', type: 'number' },
  { id: 'read_ability', label: 'Reading Ability', type: 'select', options: ABILITY_OPTIONS },
  { id: 'write_ability', label: 'Writing Ability', type: 'select', options: ABILITY_OPTIONS },
  { id: 'retired', label: 'Are you retired?', type: 'select', options: YES_NO },
  { id: 'employed', label: 'Are you employed?', type: 'select', options: YES_NO },
  { id: 'volunteer', label: 'Do you volunteer?', type: 'select', options: YES_NO },
  { id: 'health', label: 'Overall Health', type: 'select', options: HEALTH_OPTIONS },
  { id: 'learning_disability', label: 'Learning Disability?', type: 'select', options: YES_NO },
  { id: 'living_arrangements', label: 'Living Arrangements', type: 'select', options: LIVING_OPTIONS },
  { id: 'residency', label: 'Area Type', type: 'select', options: RESIDENCY_OPTIONS },
  { id: 'num_friends', label: 'Number of Close Friends', type: 'number' },
  { id: 'num_household', label: 'Number of People in Household', type: 'number' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(id: string, val: string) {
    setValues((prev) => ({ ...prev, [id]: val }))
  }

  async function submit() {
    if (!values.name?.trim() || !values.age) {
      setError('Name and Age are required.')
      return
    }

    setSaving(true)
    setError('')

    const row: Record<string, string | number | null> = {}
    for (const f of FIELDS) {
      if (f.type === 'number' && values[f.id]) {
        row[f.id] = Number(values[f.id])
      } else {
        row[f.id] = values[f.id] || null
      }
    }

    try {
      const { data, error: dbError } = await supabase
        .from('patients')
        .insert(row)
        .select('id')
        .single()

      if (dbError) throw dbError

      localStorage.setItem('userId', data.id)
      localStorage.setItem('userName', values.name.trim())
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="onboarding">
      <h1>Welcome to MindWell</h1>
      <p className="onboarding-subtitle">Let's set up your profile</p>

      <div className="onboarding-form">
        {FIELDS.map((f) => (
          <div key={f.id} className="form-field">
            <label htmlFor={f.id}>{f.label}{f.required && ' *'}</label>
            {f.type === 'select' ? (
              <select
                id={f.id}
                value={values[f.id] || ''}
                onChange={(e) => update(f.id, e.target.value)}
              >
                <option value="">Select...</option>
                {f.options!.map((o) => (
                  <option key={o} value={o}>
                    {o.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={f.id}
                type={f.type === 'number' ? 'text' : 'text'}
                inputMode={f.type === 'number' ? 'numeric' : 'text'}
                pattern={f.type === 'number' ? '[0-9]*' : undefined}
                value={values[f.id] || ''}
                onChange={(e) => {
                  const val = f.type === 'number'
                    ? e.target.value.replace(/[^0-9]/g, '')
                    : e.target.value
                  update(f.id, val)
                }}
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn-primary" onClick={submit} disabled={saving}>
        {saving ? 'Saving...' : 'Get Started'}
      </button>
    </div>
  )
}
