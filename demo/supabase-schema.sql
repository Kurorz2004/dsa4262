-- Run this in your Supabase SQL editor to set up the database

-- ============================================================
-- Users table (profile / demographic data — collected once)
-- ============================================================
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Demographics
  name TEXT,
  age INTEGER,
  gender TEXT,                    -- male, female, other, prefer_not_to_say
  country TEXT,                   -- usa, canada, etc.
  state_province TEXT,

  -- Education
  education TEXT,                 -- high school graduate, some college, associate's, bachelor's, master's, doctorate
  years_education INTEGER,        -- total years of education

  -- Literacy self-assessment
  read_ability TEXT,              -- poor, fair, good, very_good, excellent
  write_ability TEXT,             -- poor, fair, good, very_good, excellent

  -- Life situation
  retired BOOLEAN DEFAULT false,
  employed TEXT DEFAULT 'no',     -- no, part, full
  volunteer TEXT DEFAULT 'no',    -- no, part, full
  health TEXT,                    -- poor, fair, good, excellent
  learning_disability BOOLEAN DEFAULT false,
  living_arrangements TEXT,       -- alone, spouse_partner, else
  residency TEXT,                 -- private_apartment_or_home, residential_care_or_home, nursing_home

  -- Social circle (relatively stable)
  num_friends INTEGER DEFAULT 0,
  num_household INTEGER DEFAULT 0,
  confide_spouse BOOLEAN DEFAULT false,
  confide_family INTEGER DEFAULT 0,
  confide_friend INTEGER DEFAULT 0,
  confide_colleague INTEGER DEFAULT 0
);

-- ============================================================
-- Survey responses (recurring behavioural check-in)
-- ============================================================
CREATE TABLE surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Daily habits (hours per week)
  speak_habit INTEGER,            -- hours/week speaking with others
  read_print_habit INTEGER,       -- hours/week reading print
  read_web_habit INTEGER,         -- hours/week reading online
  broadcast_habit INTEGER,        -- hours/week watching TV/radio

  -- Social meeting frequency
  social_meet_freq TEXT,          -- never, less_than_once_a_year, about_once_or_twice_a_year, several_times_a_year, about_once_a_month, every_week, several_times_a_week
  professional_meet_freq TEXT,
  volunteer_meet_freq TEXT,
  talk_social_network TEXT,       -- never, less_than_once_a_year, once_a_year, a_couple_times_a_year, once_a_month, once_every_two_weeks, once_a_week, several_times_a_week, every_day

  -- Trust and reliance
  divulge_family TEXT,            -- never, hardly_ever, some_of_the_time, often
  rely_family TEXT,
  divulge_friend TEXT,
  rely_friend TEXT,
  divulge_spouse TEXT,
  rely_spouse TEXT
);

-- ============================================================
-- Journal entries (free text / voice — used for NLP embeddings)
-- ============================================================
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  input_method TEXT NOT NULL DEFAULT 'text',  -- 'text' or 'voice'
  mood TEXT                                    -- optional mood tag
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Demo: allow all (replace with auth-scoped policies later)
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON journal_entries FOR ALL USING (true) WITH CHECK (true);
