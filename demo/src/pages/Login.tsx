import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/patients/lookup?name=${encodeURIComponent(name.trim())}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('No account found with that name.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        return
      }
      const patient = await res.json()

      localStorage.setItem('userId', patient.id)
      localStorage.setItem('userName', patient.name)
      localStorage.setItem('userLanguage', patient.language || 'english')
      navigate('/')
    } catch (err: any) {
      setError('Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <img src="/mascot.svg" alt="GoldHaven mascot" width="100" height="100" />
      <h1>GoldHaven</h1>
      <p className="login-subtitle">Sign in with your name</p>

      <div className="login-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>

      <p className="login-register">
        New user? <Link to="/onboarding">Create an account</Link>
      </p>
    </div>
  )
}
