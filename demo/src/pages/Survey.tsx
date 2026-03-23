import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { SurveyQuestion } from '../types'
import './Survey.css'

// Questions mapped to COSOWELL behavioural features used by the ML model.
// These are the *recurring* check-in questions (not one-time profile fields).
const QUESTIONS: SurveyQuestion[] = [
  // ---- Daily habits (hours per week) ----
  {
    id: 'speak_habit',
    text: 'How many hours per week do you spend talking with others (in person or by phone)?',
    type: 'number',
    helperText: 'Enter a number (e.g. 5)',
  },
  {
    id: 'read_print_habit',
    text: 'How many hours per week do you spend reading printed materials (books, newspapers)?',
    type: 'number',
    helperText: 'Enter a number (e.g. 3)',
  },
  {
    id: 'read_web_habit',
    text: 'How many hours per week do you spend reading online (news, articles, social media)?',
    type: 'number',
    helperText: 'Enter a number (e.g. 7)',
  },
  {
    id: 'broadcast_habit',
    text: 'How many hours per week do you spend watching TV or listening to the radio?',
    type: 'number',
    helperText: 'Enter a number (e.g. 10)',
  },

  // ---- Social meeting frequency ----
  {
    id: 'social_meet_freq',
    text: 'How often do you meet with friends or neighbours for social activities?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Less than once a year', value: 'less_than_once_a_year' },
      { label: 'Once or twice a year', value: 'about_once_or_twice_a_year' },
      { label: 'Several times a year', value: 'several_times_a_year' },
      { label: 'About once a month', value: 'about_once_a_month' },
      { label: 'Every week', value: 'every_week' },
      { label: 'Several times a week', value: 'several_times_a_week' },
    ],
  },
  {
    id: 'professional_meet_freq',
    text: 'How often do you attend professional or work-related meetings?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Less than once a year', value: 'less_than_once_a_year' },
      { label: 'Once or twice a year', value: 'about_once_or_twice_a_year' },
      { label: 'Several times a year', value: 'several_times_a_year' },
      { label: 'About once a month', value: 'about_once_a_month' },
      { label: 'Every week', value: 'every_week' },
      { label: 'Several times a week', value: 'several_times_a_week' },
    ],
  },
  {
    id: 'volunteer_meet_freq',
    text: 'How often do you participate in volunteer or community activities?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Less than once a year', value: 'less_than_once_a_year' },
      { label: 'Once or twice a year', value: 'about_once_or_twice_a_year' },
      { label: 'Several times a year', value: 'several_times_a_year' },
      { label: 'About once a month', value: 'about_once_a_month' },
      { label: 'Every week', value: 'every_week' },
      { label: 'Several times a week', value: 'several_times_a_week' },
    ],
  },
  {
    id: 'talk_social_network',
    text: 'How often do you communicate with others through social media or messaging apps?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Less than once a year', value: 'less_than_once_a_year' },
      { label: 'Once a year', value: 'once_a_year' },
      { label: 'A couple times a year', value: 'a_couple_times_a_year' },
      { label: 'Once a month', value: 'once_a_month' },
      { label: 'Once every two weeks', value: 'once_every_two_weeks' },
      { label: 'Once a week', value: 'once_a_week' },
      { label: 'Several times a week', value: 'several_times_a_week' },
      { label: 'Every day', value: 'every_day' },
    ],
  },

  // ---- Trust and reliance ----
  {
    id: 'divulge_family',
    text: 'How often do you share personal matters with your family?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Hardly ever', value: 'hardly_ever' },
      { label: 'Some of the time', value: 'some_of_the_time' },
      { label: 'Often', value: 'often' },
    ],
  },
  {
    id: 'rely_family',
    text: 'How often can you rely on your family for help?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Hardly ever', value: 'hardly_ever' },
      { label: 'Some of the time', value: 'some_of_the_time' },
      { label: 'Often', value: 'often' },
    ],
  },
  {
    id: 'divulge_friend',
    text: 'How often do you share personal matters with your friends?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Hardly ever', value: 'hardly_ever' },
      { label: 'Some of the time', value: 'some_of_the_time' },
      { label: 'Often', value: 'often' },
    ],
  },
  {
    id: 'rely_friend',
    text: 'How often can you rely on your friends for help?',
    type: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Hardly ever', value: 'hardly_ever' },
      { label: 'Some of the time', value: 'some_of_the_time' },
      { label: 'Often', value: 'often' },
    ],
  },
  {
    id: 'divulge_spouse',
    text: 'How often do you share personal matters with your spouse or partner?',
    type: 'select',
    helperText: 'Select "Never" if not applicable',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Hardly ever', value: 'hardly_ever' },
      { label: 'Some of the time', value: 'some_of_the_time' },
      { label: 'Often', value: 'often' },
    ],
  },
  {
    id: 'rely_spouse',
    text: 'How often can you rely on your spouse or partner for help?',
    type: 'select',
    helperText: 'Select "Never" if not applicable',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Hardly ever', value: 'hardly_ever' },
      { label: 'Some of the time', value: 'some_of_the_time' },
      { label: 'Often', value: 'often' },
    ],
  },
]

export default function Survey() {
  const navigate = useNavigate()
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const question = QUESTIONS[currentQ]
  const progress = ((currentQ + (answers[question.id] !== undefined ? 1 : 0)) / QUESTIONS.length) * 100
  const isLastQuestion = currentQ === QUESTIONS.length - 1
  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined && answers[q.id] !== '')

  function selectAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }))
  }

  function next() {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((prev) => prev + 1)
    }
  }

  function prev() {
    if (currentQ > 0) {
      setCurrentQ((prev) => prev - 1)
    }
  }

  async function submit() {
    setSaving(true)

    // Build the row matching the surveys table columns
    const row: Record<string, string | number> = {
      from_user_id: localStorage.getItem('userId') || '',
    }
    for (const q of QUESTIONS) {
      row[q.id] = q.type === 'number' ? Number(answers[q.id]) : answers[q.id]
    }

    try {
      await supabase.from('surveys').insert(row)
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to save survey:', err)
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="survey">
        <div className="survey-complete card">
          <div className="complete-icon">&#10003;</div>
          <h1>Thank You!</h1>
          <p>Your wellness check-in has been recorded.</p>
          <p className="complete-subtitle">
            Your responses help us understand your well-being better.
          </p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="survey">
      <div className="survey-header">
        <h1>Wellness Check-in</h1>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-text">
          Question {currentQ + 1} of {QUESTIONS.length}
        </p>
      </div>

      <div className="question-card card">
        <h2 className="question-text">{question.text}</h2>
        {question.helperText && (
          <p className="helper-text">{question.helperText}</p>
        )}

        {question.type === 'number' ? (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="number-input"
            value={answers[question.id] || ''}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '')
              selectAnswer(val)
            }}
            placeholder="Enter a number"
          />
        ) : (
          <div className="options">
            {question.options!.map((opt) => (
              <button
                key={opt.value}
                className={`option-btn ${answers[question.id] === opt.value ? 'selected' : ''}`}
                onClick={() => selectAnswer(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="survey-nav">
        <button className="btn-secondary" onClick={prev} disabled={currentQ === 0}>
          Back
        </button>
        {isLastQuestion ? (
          <button className="btn-primary" onClick={submit} disabled={!allAnswered || saving}>
            {saving ? 'Saving...' : 'Submit'}
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={next}
            disabled={answers[question.id] === undefined || answers[question.id] === ''}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
