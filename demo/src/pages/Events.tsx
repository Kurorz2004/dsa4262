import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import './Events.css'

interface Event {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time: string
  location: string
  description: string
  category: 'social' | 'health' | 'arts' | 'sports' | 'learning'
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  social: { label: 'Social', color: '#7c3aed', bg: '#ede9fe' },
  health: { label: 'Health', color: '#16a34a', bg: '#dcfce7' },
  arts: { label: 'Arts', color: '#db2777', bg: '#fce7f3' },
  sports: { label: 'Sports', color: '#2563eb', bg: '#dbeafe' },
  learning: { label: 'Learning', color: '#d97706', bg: '#fef3c7' },
}

const STREAK_WINDOW_DAYS = 30
const REWARD_THRESHOLD = 0.9

// Sample community events for elderly
const SAMPLE_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Morning Tai Chi at the Park',
    date: '2026-04-02',
    time: '7:00 AM - 8:00 AM',
    location: 'Bishan-Ang Mo Kio Park',
    description: 'Join our friendly group for gentle Tai Chi exercises. All levels welcome. Bring your own mat or use ours.',
    category: 'sports',
  },
  {
    id: '2',
    title: 'Community Singing Session',
    date: '2026-04-03',
    time: '10:00 AM - 11:30 AM',
    location: 'Toa Payoh CC, Room 3',
    description: 'Sing your favourite oldies with fellow music lovers. Songsheets provided. Tea and snacks included.',
    category: 'arts',
  },
  {
    id: '3',
    title: 'Free Health Screening',
    date: '2026-04-04',
    time: '9:00 AM - 12:00 PM',
    location: 'Bedok Polyclinic',
    description: 'Complimentary blood pressure, glucose, and cholesterol checks for seniors 60 and above.',
    category: 'health',
  },
  {
    id: '4',
    title: 'Smartphone Basics Workshop',
    date: '2026-04-05',
    time: '2:00 PM - 4:00 PM',
    location: 'Jurong Regional Library',
    description: 'Learn to use WhatsApp, take photos, and video call your family. Patient instructors and one-on-one help.',
    category: 'learning',
  },
  {
    id: '5',
    title: 'Kopitiam Social Breakfast',
    date: '2026-04-06',
    time: '8:00 AM - 10:00 AM',
    location: 'Tiong Bahru Market',
    description: 'Meet new friends over kopi and kaya toast. A relaxed get-together with no agenda — just good company.',
    category: 'social',
  },
  {
    id: '6',
    title: 'Guided Nature Walk',
    date: '2026-04-08',
    time: '7:30 AM - 9:30 AM',
    location: 'MacRitchie Reservoir',
    description: 'Easy-paced guided walk through the boardwalk trail. Learn about local plants and wildlife. Flat terrain, wheelchair-friendly route available.',
    category: 'sports',
  },
  {
    id: '7',
    title: 'Watercolour Painting Class',
    date: '2026-04-10',
    time: '10:00 AM - 12:00 PM',
    location: 'Tampines CC, Art Room',
    description: 'Express yourself through painting. All materials provided. No experience needed — come and have fun!',
    category: 'arts',
  },
  {
    id: '8',
    title: 'Chair Yoga for Seniors',
    date: '2026-04-11',
    time: '3:00 PM - 4:00 PM',
    location: 'Queenstown CC, Hall B',
    description: 'Gentle stretching and breathing exercises done seated. Great for improving flexibility and relaxation.',
    category: 'health',
  },
  {
    id: '9',
    title: 'Mahjong & Board Games Afternoon',
    date: '2026-04-12',
    time: '1:00 PM - 4:00 PM',
    location: 'Ang Mo Kio CC, Activity Room',
    description: 'Bring your friends or make new ones. Mahjong sets and board games provided. Light refreshments available.',
    category: 'social',
  },
  {
    id: '10',
    title: 'Healthy Cooking Demo',
    date: '2026-04-14',
    time: '10:00 AM - 12:00 PM',
    location: 'Clementi CC, Kitchen',
    description: 'Learn to cook delicious, low-sodium meals. Free recipe booklet and food tasting for all participants.',
    category: 'learning',
  },
  {
    id: '11',
    title: 'Line Dancing for Beginners',
    date: '2026-04-16',
    time: '4:00 PM - 5:30 PM',
    location: 'Hougang CC, Hall A',
    description: 'Fun and easy line dancing routines. Great exercise and wonderful company. Wear comfortable shoes.',
    category: 'sports',
  },
  {
    id: '12',
    title: 'Intergenerational Storytelling',
    date: '2026-04-18',
    time: '10:00 AM - 11:30 AM',
    location: 'Woodlands Regional Library',
    description: 'Share your life stories with young students. A meaningful way to connect across generations.',
    category: 'social',
  },
]

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Events() {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(new Date()))
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const [loadingStreak, setLoadingStreak] = useState(true)

  const userId = localStorage.getItem('userId') || ''

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const userLang = localStorage.getItem('userLanguage') || 'english'
    const langCodes: Record<string, string> = { english: 'en-SG', chinese: 'zh-CN', malay: 'ms-MY', tamil: 'ta-IN' }
    utterance.lang = langCodes[userLang] || 'en-SG'
    window.speechSynthesis.speak(utterance)
  }, [])

  useEffect(() => {
    loadActivity()
  }, [])

  async function loadActivity() {
    setLoadingStreak(true)
    try {
      const [journalRes, surveyRes] = await Promise.all([
        supabase.from('journal_entries').select('created_at').eq('from_user_id', userId),
        supabase.from('surveys').select('created_at').eq('from_user_id', userId),
      ])
      const dates = new Set<string>()
      for (const row of [...(journalRes.data || []), ...(surveyRes.data || [])]) {
        if (row.created_at) dates.add(dateKey(new Date(row.created_at)))
      }
      setActiveDates(dates)
    } catch (err) {
      console.error('Failed to load activity:', err)
    } finally {
      setLoadingStreak(false)
    }
  }

  // Streak stats
  function getStreakStats() {
    const today = new Date()
    let activeDays = 0
    let currentStreak = 0
    let countingStreak = true

    for (let i = 0; i < STREAK_WINDOW_DAYS; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (activeDates.has(dateKey(d))) {
        activeDays++
        if (countingStreak) currentStreak++
      } else {
        if (countingStreak && i > 0) countingStreak = false
      }
    }
    const percentage = activeDays / STREAK_WINDOW_DAYS
    return { activeDays, currentStreak, percentage, rewardEarned: percentage >= REWARD_THRESHOLD }
  }

  // Group events by date
  const eventsByDate: Record<string, Event[]> = {}
  for (const ev of SAMPLE_EVENTS) {
    eventsByDate[ev.date] = eventsByDate[ev.date] || []
    eventsByDate[ev.date].push(ev)
  }

  // Calendar
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d)

  function dayKeyForMonth(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isToday(day: number) {
    const now = new Date()
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
  }

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedEvents = eventsByDate[selectedDate] || []
  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const selectedLabel = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const todayStr = dateKey(new Date())
  const upcomingEvents = SAMPLE_EVENTS.filter((ev) => ev.date >= todayStr).slice(0, 5)

  const stats = getStreakStats()

  return (
    <div className="events">
      <h1>Events & Activity</h1>

      {/* Streak summary */}
      {!loadingStreak && (
        <div className="streak-bar card">
          <div className="streak-bar-left">
            <span className="streak-bar-number">{stats.currentStreak}</span>
            <span className="streak-bar-label">day streak</span>
          </div>
          <div className="streak-bar-right">
            <div className="streak-bar-progress">
              <div className="streak-bar-track">
                <div
                  className={`streak-bar-fill ${stats.rewardEarned ? 'earned' : ''}`}
                  style={{ width: `${Math.min(stats.percentage * 100, 100)}%` }}
                />
              </div>
              <span className="streak-bar-fraction">{stats.activeDays}/{STREAK_WINDOW_DAYS} days</span>
            </div>
            {stats.rewardEarned ? (
              <span className="streak-bar-reward earned">Reward earned!</span>
            ) : (
              <span className="streak-bar-reward">
                {Math.ceil(REWARD_THRESHOLD * STREAK_WINDOW_DAYS) - stats.activeDays} more for 90% goal
              </span>
            )}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="calendar card">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={() => setViewMonth(new Date(year, month - 1, 1))}>&lt;</button>
          <span className="cal-month">{monthLabel}</span>
          <button className="cal-nav-btn" onClick={() => setViewMonth(new Date(year, month + 1, 1))}>&gt;</button>
        </div>
        <div className="calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="cal-day-label">{d}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {calDays.map((day, i) => {
            if (day === null) return <div key={i} className="cal-day empty" />
            const dk = dayKeyForMonth(day)
            const hasEvents = !!eventsByDate[dk]
            const hasActivity = activeDates.has(dk)
            const isSelected = dk === selectedDate
            return (
              <button
                key={i}
                className={`cal-day ${hasActivity ? 'active' : ''} ${hasEvents ? 'has-event' : ''} ${isSelected ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                onClick={() => setSelectedDate(dk)}
              >
                {day}
                {hasEvents && <span className="event-dot" />}
              </button>
            )
          })}
        </div>
        <div className="calendar-legend">
          <span className="legend-item"><span className="legend-swatch active" /> Your activity</span>
          <span className="legend-item"><span className="legend-dot" /> Community event</span>
        </div>
      </div>

      {/* Selected date events */}
      <div className="events-section">
        <h2>{selectedLabel}</h2>
        {selectedEvents.length === 0 ? (
          <p className="empty-text">No events on this day.</p>
        ) : (
          <div className="event-list">
            {selectedEvents.map((ev) => {
              const cat = CATEGORY_CONFIG[ev.category]
              return (
                <div key={ev.id} className="event-card card">
                  <div className="event-card-header">
                    <span className="event-category" style={{ color: cat.color, background: cat.bg }}>
                      {cat.label}
                    </span>
                    <button
                      className="listen-btn"
                      onClick={() => speak(`${ev.title}. ${ev.time} at ${ev.location}. ${ev.description}`)}
                      type="button"
                      aria-label="Listen to event details"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </button>
                  </div>
                  <h3>{ev.title}</h3>
                  <div className="event-meta">
                    <span className="event-time">{ev.time}</span>
                    <span className="event-location">{ev.location}</span>
                  </div>
                  <p className="event-desc">{ev.description}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcomingEvents.length > 0 && (
        <div className="events-section">
          <h2>Upcoming Events</h2>
          <div className="event-list">
            {upcomingEvents.map((ev) => {
              const cat = CATEGORY_CONFIG[ev.category]
              const evDate = new Date(ev.date + 'T00:00:00')
              return (
                <button
                  key={ev.id}
                  className="upcoming-card card"
                  onClick={() => {
                    setSelectedDate(ev.date)
                    setViewMonth(new Date(evDate.getFullYear(), evDate.getMonth(), 1))
                  }}
                >
                  <div className="upcoming-date">
                    <span className="upcoming-day">{evDate.getDate()}</span>
                    <span className="upcoming-month">{evDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                  </div>
                  <div className="upcoming-info">
                    <h3>{ev.title}</h3>
                    <span className="event-time">{ev.time}</span>
                    <span className="event-location">{ev.location}</span>
                  </div>
                  <span className="event-category-dot" style={{ background: cat.color }} title={cat.label} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
