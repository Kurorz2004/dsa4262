-- Supabase schema for MindWell demo
-- Run this in the Supabase SQL Editor

-- Users / patients (profile set once during onboarding)
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  age integer,
  gender text,
  education text,
  years_education real,
  read_ability text,
  write_ability text,
  retired text,
  employed text,
  volunteer text,
  health text,
  learning_disability text,
  living_arrangements text,
  residency text,
  num_friends integer,
  num_household integer,
  language text default 'english'
);

-- Recurring behavioural survey responses
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  from_user_id uuid references patients(id) on delete cascade not null,
  speak_habit real,
  read_print_habit real,
  read_web_habit real,
  broadcast_habit real,
  social_meet_freq text,
  professional_meet_freq text,
  volunteer_meet_freq text,
  talk_social_network text,
  divulge_family text,
  rely_family text,
  divulge_friend text,
  rely_friend text,
  divulge_spouse text,
  rely_spouse text
);

-- Journal / narrative entries
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  from_user_id uuid references patients(id) on delete cascade not null,
  content text not null,
  input_method text default 'text',
  mood text
);

-- Screening results from model inference
create table if not exists screenings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  patient_id uuid references patients(id) on delete cascade not null,
  survey_id uuid references surveys(id),
  journal_id uuid references journal_entries(id),
  predicted_level text not null,       -- 'low', 'moderate', 'high'
  predicted_label integer not null,    -- 1, 2, 3
  confidence real,                     -- prediction probability
  probabilities jsonb                  -- {low: 0.7, moderate: 0.2, high: 0.1}
);

-- Enable RLS but allow all for demo
alter table patients enable row level security;
alter table surveys enable row level security;
alter table journal_entries enable row level security;
alter table screenings enable row level security;

create policy "Allow all on patients" on patients for all using (true) with check (true);
create policy "Allow all on surveys" on surveys for all using (true) with check (true);
create policy "Allow all on journal_entries" on journal_entries for all using (true) with check (true);
create policy "Allow all on screenings" on screenings for all using (true) with check (true);
