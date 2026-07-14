import db from './pool';

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    number INTEGER,
    position TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER NOT NULL REFERENCES teams(id),
    away_team_id INTEGER NOT NULL REFERENCES teams(id),
    status TEXT DEFAULT 'pending',
    start_time TEXT,
    end_time TEXT,
    venue TEXT,
    live_stream_url TEXT,
    push_stream_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_starting INTEGER DEFAULT 0,
    side TEXT DEFAULT 'home',
    UNIQUE(match_id, player_id)
);

CREATE TABLE IF NOT EXISTS play_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id),
    event_type TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    assist_by INTEGER REFERENCES players(id),
    rebound_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    is_cancelled INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_play_events_match_id ON play_events(match_id);
CREATE INDEX IF NOT EXISTS idx_play_events_player_id ON play_events(player_id);
CREATE INDEX IF NOT EXISTS idx_play_events_created_at ON play_events(created_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
`;

export function migrate() {
  console.log('Running database migrations...');
  try {
    db.exec(CREATE_TABLES_SQL);
    console.log('✅ Database tables created successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}