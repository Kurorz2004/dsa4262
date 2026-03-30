import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const [currentStreak, setCurrentStreak] = useState(0)
  const userName = localStorage.getItem('userName') || ''
  const userId = localStorage.getItem('userId') || ''

  function logout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userLanguage')
    navigate('/login')
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    loadStreak()
  }, [])

  async function loadStreak() {
    try {
      const [journalRes, surveyRes] = await Promise.all([
        supabase.from('journal_entries').select('created_at').eq('from_user_id', userId),
        supabase.from('surveys').select('created_at').eq('from_user_id', userId),
      ])
      const dates = new Set<string>()
      for (const row of [...(journalRes.data || []), ...(surveyRes.data || [])]) {
        if (row.created_at) {
          const d = new Date(row.created_at)
          dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
        }
      }
      // Count consecutive days ending today/yesterday
      let streak = 0
      const now = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (dates.has(key)) {
          streak++
        } else {
          if (i === 0) continue // today hasn't been completed yet, check from yesterday
          break
        }
      }
      setCurrentStreak(streak)
    } catch (err) {
      // silent
    }
  }

  return (
    <div className="home">
      <div className="home-header">
        <button className="logout-btn" onClick={logout} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
        <img src="/mascot.svg" alt="GoldHaven mascot" width="80" height="80" className="home-mascot" />
        <h1>GoldHaven</h1>
        <p className="date">{today}</p>
        <p className="greeting">
          {userName ? `Hi ${userName}, how are you feeling today?` : 'How are you feeling today?'}
        </p>
      </div>

      {/* Streak mini-card */}
      <button className="streak-mini action-card" onClick={() => navigate('/streak')}>
        <div className="action-icon streak-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div className="action-text">
          <h2>{currentStreak}-day streak</h2>
          <p>Tap to view your calendar and progress</p>
        </div>
      </button>

      <div className="home-actions">
        <button className="action-card" onClick={() => navigate('/survey')}>
          <div className="action-icon survey-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div className="action-text">
            <h2>Wellness Check-in</h2>
            <p>Take a quick mental health survey</p>
          </div>
        </button>

        <button className="action-card" onClick={() => navigate('/journal')}>
          <div className="action-icon journal-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div className="action-text">
            <h2>Daily Journal</h2>
            <p>Write or speak your thoughts</p>
          </div>
        </button>

        <button className="action-card" onClick={() => navigate('/history')}>
          <div className="action-icon history-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="action-text">
            <h2>View History</h2>
            <p>Review your past entries</p>
          </div>
        </button>
      </div>
    </div>
  )
}
