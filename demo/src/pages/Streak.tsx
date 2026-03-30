import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Streak.css'

const REWARD_THRESHOLD = 0.9 // 90% streak for rewards
const STREAK_WINDOW_DAYS = 30 // rolling 30-day window

export default function Streak() {
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const userId = localStorage.getItem('userId') || ''

  useEffect(() => {
    loadActivity()
  }, [])

  async function loadActivity() {
    setLoading(true)
    try {
      const [journalRes, surveyRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('created_at')
          .eq('from_user_id', userId),
        supabase
          .from('surveys')
          .select('created_at')
          .eq('from_user_id', userId),
      ])

      const dates = new Set<string>()
      const all = [...(journalRes.data || []), ...(surveyRes.data || [])]
      for (const row of all) {
        if (row.created_at) {
          const d = new Date(row.created_at)
          dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
        }
      }
      setActiveDates(dates)
    } catch (err) {
      console.error('Failed to load activity:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate streak stats for the rolling window
  function getStreakStats() {
    const today = new Date()
    let activeDays = 0
    let currentStreak = 0
    let countingStreak = true

    for (let i = 0; i < STREAK_WINDOW_DAYS; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      if (activeDates.has(key)) {
        activeDays++
        if (countingStreak) currentStreak++
      } else {
        if (countingStreak && i > 0) countingStreak = false
      }
    }

    const percentage = activeDays / STREAK_WINDOW_DAYS
    const rewardEarned = percentage >= REWARD_THRESHOLD

    return { activeDays, currentStreak, percentage, rewardEarned }
  }

  // Calendar rendering
  function getCalendarDays() {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }

  function isActive(day: number) {
    const key = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return activeDates.has(key)
  }

  function isToday(day: number) {
    const now = new Date()
    return day === now.getDate() && viewMonth.getMonth() === now.getMonth() && viewMonth.getFullYear() === now.getFullYear()
  }

  function prevMonth() {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }

  function nextMonth() {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const calDays = getCalendarDays()
  const stats = getStreakStats()

  if (loading) {
    return <div className="streak"><div className="loading">Loading...</div></div>
  }

  return (
    <div className="streak">
      <h1>Your Streak</h1>

      {/* Current streak summary */}
      <div className="streak-summary card">
        <div className="streak-number">{stats.currentStreak}</div>
        <div className="streak-label">day streak</div>
      </div>

      {/* Progress toward reward */}
      <div className="reward-section card">
        <div className="reward-header">
          <h3>30-Day Progress</h3>
          <span className="reward-fraction">{stats.activeDays}/{STREAK_WINDOW_DAYS} days</span>
        </div>
        <div className="reward-bar">
          <div
            className={`reward-fill ${stats.rewardEarned ? 'earned' : ''}`}
            style={{ width: `${Math.min(stats.percentage * 100, 100)}%` }}
          />
          <div className="reward-threshold" style={{ left: `${REWARD_THRESHOLD * 100}%` }} />
        </div>
        <div className="reward-info">
          {stats.rewardEarned ? (
            <span className="reward-earned">You earned your reward! Keep it up!</span>
          ) : (
            <span className="reward-pending">
              {Math.ceil(REWARD_THRESHOLD * STREAK_WINDOW_DAYS) - stats.activeDays} more days needed for reward (90% goal)
            </span>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar card">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>&lt;</button>
          <span className="cal-month">{monthLabel}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>&gt;</button>
        </div>
        <div className="calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="cal-day-label">{d}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {calDays.map((day, i) => (
            <div
              key={i}
              className={`cal-day ${day === null ? 'empty' : ''} ${day && isActive(day) ? 'active' : ''} ${day && isToday(day) ? 'today' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
