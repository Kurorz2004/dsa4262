import { useCallback } from 'react'
import './Resources.css'

interface Helpline {
  name: string
  number: string
  hours: string
  description: string
  languages: string[]
}

interface Resource {
  name: string
  description: string
  url: string
}

const HELPLINES: Helpline[] = [
  {
    name: 'Institute of Mental Health (IMH)',
    number: '6389 2222',
    hours: '24 hours',
    description: 'Mental health crisis helpline. Immediate support for anyone in emotional distress.',
    languages: ['English', 'Mandarin', 'Malay', 'Tamil'],
  },
  {
    name: 'Samaritans of Singapore (SOS)',
    number: '1-767',
    hours: '24 hours',
    description: 'Confidential emotional support for anyone in crisis, thinking about suicide, or affected by suicide.',
    languages: ['English', 'Mandarin', 'Malay', 'Tamil'],
  },
  {
    name: 'Singapore Association for Mental Health (SAMH)',
    number: '1800 283 7019',
    hours: 'Mon-Fri 9am-6pm',
    description: 'Mental health support, counselling referrals, and information on mental health conditions.',
    languages: ['English', 'Mandarin'],
  },
  {
    name: 'Silver Ribbon (Singapore)',
    number: '6386 1928',
    hours: 'Mon-Fri 9am-6pm',
    description: 'Anti-stigma organisation offering mental health support and resources for seniors.',
    languages: ['English', 'Mandarin'],
  },
  {
    name: 'SAGE Counselling Centre',
    number: '1800 555 5555',
    hours: 'Mon-Fri 9am-6pm',
    description: 'Free counselling service for seniors aged 50 and above. Emotional and psychological support.',
    languages: ['English', 'Mandarin', 'Malay', 'Tamil', 'Dialect'],
  },
  {
    name: 'Agency for Integrated Care (AIC)',
    number: '1800 650 6060',
    hours: 'Mon-Fri 8:30am-8:30pm, Sat 8:30am-4pm',
    description: 'Assistance with eldercare services, caregiver support, and community resources.',
    languages: ['English', 'Mandarin', 'Malay', 'Tamil'],
  },
  {
    name: 'TOUCHline (Caregivers Support)',
    number: '1800 377 2252',
    hours: 'Mon-Fri 9am-6pm',
    description: 'Emotional support and practical advice for caregivers of elderly family members.',
    languages: ['English', 'Mandarin'],
  },
]

const RESOURCES: Resource[] = [
  {
    name: 'MindLine.sg',
    description: 'Online chat support for mental health. No appointment needed.',
    url: 'https://www.mindline.sg',
  },
  {
    name: 'HealthHub - Mental Wellness',
    description: 'Articles and tips for maintaining good mental health from the Ministry of Health.',
    url: 'https://www.healthhub.sg/programmes/186/MindSG',
  },
  {
    name: 'Community Health Assessment Team (CHAT)',
    description: 'Free mental health assessment for anyone aged 16-30 and their families.',
    url: 'https://www.imh.com.sg/CHAT',
  },
]

export default function Resources() {
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const userLang = localStorage.getItem('userLanguage') || 'english'
    const langCodes: Record<string, string> = { english: 'en-SG', chinese: 'zh-CN', malay: 'ms-MY', tamil: 'ta-IN' }
    utterance.lang = langCodes[userLang] || 'en-SG'
    window.speechSynthesis.speak(utterance)
  }, [])

  return (
    <div className="resources">
      <h1>Mental Health Resources</h1>
      <p className="resources-intro">
        If you or someone you know needs support, these services are here to help. All calls are confidential.
      </p>

      {/* Emergency banner */}
      <div className="emergency-banner card">
        <div className="emergency-icon">!</div>
        <div className="emergency-text">
          <strong>In an emergency, call 995 (ambulance) or 999 (police)</strong>
          <span>If you or someone is in immediate danger</span>
        </div>
      </div>

      {/* Helplines */}
      <section className="helplines-section">
        <h2>Helplines</h2>
        <div className="helpline-list">
          {HELPLINES.map((h) => (
            <div key={h.name} className="helpline-card card">
              <div className="helpline-header">
                <h3>{h.name}</h3>
                <button
                  className="listen-btn"
                  onClick={() => speak(`${h.name}. Call ${h.number}. Available ${h.hours}. ${h.description}`)}
                  type="button"
                  aria-label={`Listen to ${h.name} details`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                </button>
              </div>
              <a href={`tel:${h.number.replace(/\s/g, '')}`} className="helpline-number">
                {h.number}
              </a>
              <div className="helpline-hours">{h.hours}</div>
              <p className="helpline-desc">{h.description}</p>
              <div className="helpline-langs">
                {h.languages.map((l) => (
                  <span key={l} className="lang-tag">{l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Online resources */}
      <section className="resources-section">
        <h2>Online Resources</h2>
        <div className="resource-list">
          {RESOURCES.map((r) => (
            <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-card card">
              <h3>{r.name}</h3>
              <p>{r.description}</p>
              <span className="resource-link">Visit website &rarr;</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
