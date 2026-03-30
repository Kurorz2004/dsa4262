import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { JournalEntry, SurveyResponse } from '../types'
import './History.css'

const LANG_CODES: Record<string, string> = {
  english: 'en-SG',
  chinese: 'zh-CN',
  malay: 'ms-MY',
  tamil: 'ta-IN',
}

type Tab = 'journal' | 'survey'

// Labels for the survey fields to display in history
const SURVEY_LABELS: Record<string, string> = {
  speak_habit: 'Speaking (hrs/wk)',
  read_print_habit: 'Reading print (hrs/wk)',
  read_web_habit: 'Reading online (hrs/wk)',
  broadcast_habit: 'TV/Radio (hrs/wk)',
  social_meet_freq: 'Social meetups',
  professional_meet_freq: 'Professional meetups',
  volunteer_meet_freq: 'Volunteer activities',
  talk_social_network: 'Social media use',
  divulge_family: 'Share with family',
  rely_family: 'Rely on family',
  divulge_friend: 'Share with friends',
  rely_friend: 'Rely on friends',
  divulge_spouse: 'Share with spouse',
  rely_spouse: 'Rely on spouse',
}

export default function History() {
  const [tab, setTab] = useState<Tab>('journal')
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [surveys, setSurveys] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)

  const userId = localStorage.getItem('userId') || ''

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const userLang = localStorage.getItem('userLanguage') || 'english'
    utterance.lang = LANG_CODES[userLang] || 'en-SG'
    window.speechSynthesis.speak(utterance)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [journalRes, surveyRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('*')
          .eq('from_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('surveys')
          .select('*')
          .eq('from_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (journalRes.data) setJournals(journalRes.data)
      if (surveyRes.data) setSurveys(surveyRes.data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function formatValue(value: string) {
    if (!value) return '-'
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="history">
      <h1>History</h1>

      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'journal' ? 'active' : ''}`}
          onClick={() => setTab('journal')}
        >
          Journal Entries
        </button>
        <button
          className={`tab-btn ${tab === 'survey' ? 'active' : ''}`}
          onClick={() => setTab('survey')}
        >
          Survey Results
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : tab === 'journal' ? (
        <div className="entries-list">
          {journals.length === 0 ? (
            <div className="empty-state card">
              <p>No journal entries yet.</p>
              <p className="empty-hint">Start writing to see your entries here.</p>
            </div>
          ) : (
            journals.map((entry) => (
              <div key={entry.id} className="entry-card card">
                <div className="entry-header">
                  <span className="entry-date">{formatDate(entry.created_at)}</span>
                  <div className="entry-tags">
                    {entry.mood && <span className="tag mood-tag">{entry.mood}</span>}
                    <span className="tag method-tag">
                      {entry.input_method === 'voice' ? 'Voice' : 'Text'}
                    </span>
                  </div>
                </div>
                <p className="entry-content">{entry.content}</p>
                <button
                  className="listen-btn-small"
                  onClick={() => speak(entry.content)}
                  type="button"
                  aria-label="Listen to entry"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  Listen
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="entries-list">
          {surveys.length === 0 ? (
            <div className="empty-state card">
              <p>No survey responses yet.</p>
              <p className="empty-hint">Take a wellness check-in to see results here.</p>
            </div>
          ) : (
            surveys.map((survey) => (
              <div key={survey.id} className="entry-card card">
                <div className="entry-header">
                  <span className="entry-date">{formatDate(survey.created_at)}</span>
                </div>
                <div className="survey-details">
                  {Object.entries(SURVEY_LABELS).map(([key, label]) => (
                    <div key={key} className="survey-row">
                      <span className="survey-label">{label}</span>
                      <span className="survey-value">
                        {typeof survey[key] === 'number'
                          ? survey[key]
                          : formatValue(String(survey[key] ?? '-'))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
