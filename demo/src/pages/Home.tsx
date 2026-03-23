import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="home">
      <div className="home-header">
        <h1>MindWell</h1>
        <p className="date">{today}</p>
        <p className="greeting">How are you feeling today?</p>
      </div>

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
