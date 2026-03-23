// ---- User profile (one-time setup) ----

export interface UserProfile {
  id?: string
  created_at?: string
  name?: string
  age?: number
  gender?: string
  education?: string
  years_education?: number
  read_ability?: string
  write_ability?: string
  retired?: string
  employed?: string
  volunteer?: string
  health?: string
  learning_disability?: string
  living_arrangements?: string
  residency?: string
  num_friends?: number
  num_household?: number
}

// ---- Survey (recurring behavioural check-in) ----

export interface SurveyQuestion {
  id: string
  text: string
  type: 'select' | 'number'
  options?: SurveyOption[]
  helperText?: string
}

export interface SurveyOption {
  label: string
  value: string
}

export interface SurveyResponse {
  id?: string
  created_at?: string
  from_user_id: string
  [key: string]: string | number | undefined // dynamic survey fields
}

// ---- Journal ----

export interface JournalEntry {
  id?: string
  created_at?: string
  from_user_id: string
  content: string
  input_method: 'text' | 'voice'
  mood?: string
}
