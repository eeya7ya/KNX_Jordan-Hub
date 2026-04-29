-- KNX Jordan Club — Neon Postgres schema
-- Run once against your Neon database:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS applications (
  id          BIGSERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  location    TEXT,
  tier        TEXT,
  experience  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applications_email_idx   ON applications (email);
CREATE INDEX IF NOT EXISTS applications_created_idx ON applications (created_at DESC);

CREATE TABLE IF NOT EXISTS members (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  name_ar      TEXT,
  tier         TEXT NOT NULL,
  firm         TEXT,
  city         TEXT,
  city_ar      TEXT,
  specialty    TEXT,
  specialty_ar TEXT,
  since        INT,
  color        TEXT DEFAULT '#0060A8',
  published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS members_published_idx ON members (published);

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  full_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- Seed the directory so /api/members has data on first deploy.
INSERT INTO members (name, name_ar, tier, firm, city, city_ar, specialty, specialty_ar, since, color) VALUES
  ('Marwa Al-Habashneh', 'مروة الحباشنة', 'Tutor',        'Royal Smart Homes',          'Amman',  'عمّان',   'HVAC · Multi-zone',         'تكييف · مناطق متعدّدة', 2019, '#0060A8'),
  ('Khalid Al-Tarawneh', 'خالد الطراونة', 'Professional', 'Helios Integrations · Amman','Amman',  'عمّان',   'IP-secure commissioning',   'تسليم IP الآمن',         2017, '#329C32'),
  ('Lina Khoury',        'لينا خوري',     'Professional', 'Aqaba Smart Buildings',      'Aqaba',  'العقبة',  'Hospitality · Lighting',    'الفنادق · الإضاءة',       2020, '#329C32'),
  ('Hisham Bani-Hani',   'هشام بني هاني', 'Fellow',       'Independent · Board chair',  'Irbid',  'إربد',    'Bylaws · Examination',      'النظام · الامتحانات',     2014, '#0060A8'),
  ('Dana Saraireh',      'دانا الصرايرة', 'Practitioner', 'Cobalt Labs MENA',           'Amman',  'عمّان',   'Residential retrofit',      'ترميم سكني',              2023, '#329C32'),
  ('Omar Al-Masri',      'عمر المصري',    'Professional', 'Petra Engineering',          'Madaba', 'مأدبا',   'Façade integration',        'دمج الواجهات',            2018, '#0060A8')
ON CONFLICT DO NOTHING;
