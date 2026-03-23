import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Journal.css'

const MOODS = [
  { emoji: '\u{1F60A}', label: 'Happy' },
  { emoji: '\u{1F610}', label: 'Neutral' },
  { emoji: '\u{1F614}', label: 'Sad' },
  { emoji: '\u{1F620}', label: 'Angry' },
  { emoji: '\u{1F630}', label: 'Anxious' },
]

export default function Journal() {
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text')
  const [isRecording, setIsRecording] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef<any>(null)

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function startRecording() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setContent(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    setInputMethod('voice')
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  async function saveEntry() {
    if (!content.trim()) return

    setSaving(true)
    try {
      await supabase.from('journal_entries').insert({
        from_user_id: localStorage.getItem('userId') || '',
        content: content.trim(),
        input_method: inputMethod,
        mood: mood || null,
      })
      setSaved(true)
    } catch (err) {
      console.error('Failed to save journal:', err)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="journal">
        <div className="journal-saved card">
          <div className="saved-icon">&#10003;</div>
          <h1>Entry Saved!</h1>
          <p>Your journal entry has been recorded.</p>
          <div className="saved-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              Back to Home
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setContent('')
                setMood('')
                setInputMethod('text')
                setSaved(false)
              }}
            >
              Write Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="journal">
      <h1>Daily Journal</h1>
      <p className="journal-subtitle">Share what's on your mind today</p>

      <div className="mood-section">
        <h3>How are you feeling?</h3>
        <div className="mood-options">
          {MOODS.map((m) => (
            <button
              key={m.label}
              className={`mood-btn ${mood === m.label ? 'selected' : ''}`}
              onClick={() => setMood(mood === m.label ? '' : m.label)}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="input-section">
        <div className="input-toggle">
          <button
            className={`toggle-btn ${inputMethod === 'text' ? 'active' : ''}`}
            onClick={() => setInputMethod('text')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Type
          </button>
          <button
            className={`toggle-btn ${inputMethod === 'voice' ? 'active' : ''}`}
            onClick={() => setInputMethod('voice')}
            disabled={!speechSupported}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            Speak
          </button>
        </div>

        {inputMethod === 'text' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write about your day, your feelings, or anything on your mind..."
            rows={8}
          />
        ) : (
          <div className="voice-section">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Your speech will appear here. You can also edit it afterwards..."
              rows={6}
            />
            <button
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {!speechSupported && (
              <p className="voice-warning">
                Speech recognition is not supported in your browser. Please use Chrome or Edge.
              </p>
            )}
          </div>
        )}
      </div>

      <button className="btn-primary" onClick={saveEntry} disabled={!content.trim() || saving}>
        {saving ? 'Saving...' : 'Save Entry'}
      </button>
    </div>
  )
}
