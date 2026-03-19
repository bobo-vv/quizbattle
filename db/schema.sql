CREATE TABLE IF NOT EXISTS hosts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  host_id INTEGER REFERENCES hosts(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice',
  question_text TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  time_limit INTEGER DEFAULT 20,
  points INTEGER DEFAULT 1000,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  option_text VARCHAR(500) NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- User management columns (added for role system + admin approval)
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member';
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;

-- Game history tables
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  host_id INTEGER REFERENCES hosts(id) ON DELETE SET NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  quiz_title VARCHAR(200) NOT NULL,
  pin VARCHAR(10) NOT NULL,
  team_mode BOOLEAN DEFAULT FALSE,
  team_count INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP DEFAULT NOW(),
  player_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_players (
  id SERIAL PRIMARY KEY,
  game_session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  avatar VARCHAR(50) DEFAULT '',
  team_name VARCHAR(20) DEFAULT NULL,
  final_rank INTEGER DEFAULT 0,
  final_score INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_answers (
  id SERIAL PRIMARY KEY,
  game_session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  question_id INTEGER,
  question_text TEXT NOT NULL,
  option_id INTEGER,
  is_correct BOOLEAN DEFAULT FALSE,
  score_gained INTEGER DEFAULT 0
);

-- Set existing "Admin" account to admin role + approved
UPDATE hosts SET role = 'admin', status = 'approved'
  WHERE username = 'Admin' AND (role IS NULL OR role != 'admin');
-- Backward compat: existing accounts without status get approved
UPDATE hosts SET status = 'approved' WHERE status IS NULL;
