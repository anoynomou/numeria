import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.NUMERIA_DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'numeria.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'student',
  display_name    TEXT NOT NULL DEFAULT '',
  current_grade   TEXT NOT NULL DEFAULT 'K',
  avatar_json     TEXT NOT NULL DEFAULT '{}',
  settings_json   TEXT NOT NULL DEFAULT '{}',
  coins           INTEGER NOT NULL DEFAULT 0,
  lifetime_coins  INTEGER NOT NULL DEFAULT 0,
  onboarded       INTEGER NOT NULL DEFAULT 0,
  streak_days     INTEGER NOT NULL DEFAULT 0,
  best_streak     INTEGER NOT NULL DEFAULT 0,
  last_play_date  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at   TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per (student, grade). Switching grade never destroys another grade's work.
CREATE TABLE IF NOT EXISTS grade_progress (
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade             TEXT NOT NULL,
  current_level     INTEGER NOT NULL DEFAULT 1,
  current_challenge INTEGER NOT NULL DEFAULT 1,
  xp                INTEGER NOT NULL DEFAULT 0,
  difficulty        REAL NOT NULL DEFAULT 0,   -- adaptive offset, -1.5 .. +1.5
  recent_json       TEXT NOT NULL DEFAULT '[]',
  stars_json        TEXT NOT NULL DEFAULT '{}',
  completed_json    TEXT NOT NULL DEFAULT '[]',
  level_correct     INTEGER NOT NULL DEFAULT 0,
  level_answered    INTEGER NOT NULL DEFAULT 0,
  level_started_at  TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, grade)
);

-- The challenge a student is currently working through. The correct answer
-- lives here, server side, and is never sent to the browser until grading.
CREATE TABLE IF NOT EXISTS active_challenges (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade           TEXT NOT NULL,
  level           INTEGER NOT NULL,
  challenge_index INTEGER NOT NULL,
  station_id      TEXT,
  puzzle_json     TEXT,
  puzzle_done     INTEGER NOT NULL DEFAULT 0,
  puzzle_pieces   INTEGER NOT NULL DEFAULT 0,
  question_json   TEXT NOT NULL,
  hints_used      INTEGER NOT NULL DEFAULT 0,
  attempts        INTEGER NOT NULL DEFAULT 0,
  resolved        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_active_user ON active_challenges(user_id, resolved);

CREATE TABLE IF NOT EXISTS answers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade           TEXT NOT NULL,
  level           INTEGER NOT NULL,
  challenge_index INTEGER NOT NULL,
  generator_id    TEXT NOT NULL,
  topic           TEXT NOT NULL,
  skill           TEXT NOT NULL,
  difficulty      REAL NOT NULL,
  correct         INTEGER NOT NULL,
  hints_used      INTEGER NOT NULL DEFAULT 0,
  attempts        INTEGER NOT NULL DEFAULT 1,
  seconds         INTEGER NOT NULL DEFAULT 0,
  answered_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id, answered_at);
CREATE INDEX IF NOT EXISTS idx_answers_topic ON answers(user_id, topic);

CREATE TABLE IF NOT EXISTS puzzle_results (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade           TEXT NOT NULL,
  level           INTEGER NOT NULL,
  challenge_index INTEGER NOT NULL,
  puzzle_id       TEXT NOT NULL,
  difficulty      INTEGER NOT NULL,
  pieces_used     INTEGER NOT NULL DEFAULT 0,
  seconds         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_puzzles_user ON puzzle_results(user_id);

CREATE TABLE IF NOT EXISTS level_results (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade        TEXT NOT NULL,
  level        INTEGER NOT NULL,
  correct      INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  xp           INTEGER NOT NULL,
  coins        INTEGER NOT NULL,
  stars        INTEGER NOT NULL,
  seconds      INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_levelresults_user ON level_results(user_id);

CREATE TABLE IF NOT EXISTS owned_items (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_key    TEXT NOT NULL,
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_key)
);

CREATE TABLE IF NOT EXISTS earned_achievements (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS daily_activity (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day       TEXT NOT NULL,
  seconds   INTEGER NOT NULL DEFAULT 0,
  questions INTEGER NOT NULL DEFAULT 0,
  correct   INTEGER NOT NULL DEFAULT 0,
  puzzles   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Links a teacher or parent to a student they may view.
CREATE TABLE IF NOT EXISTS guardian_links (
  guardian_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (guardian_id, student_id)
);

-- Short codes a student enters to connect to a teacher or parent.
CREATE TABLE IF NOT EXISTS link_codes (
  code        TEXT PRIMARY KEY,
  guardian_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT '',
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Admin-authored questions, mixed into the generated bank.
CREATE TABLE IF NOT EXISTS custom_questions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  grade        TEXT NOT NULL,
  topic        TEXT NOT NULL,
  skill        TEXT NOT NULL DEFAULT '',
  difficulty   INTEGER NOT NULL DEFAULT 2,
  type         TEXT NOT NULL DEFAULT 'numeric',
  prompt       TEXT NOT NULL,
  choices_json TEXT NOT NULL DEFAULT '[]',
  answer       TEXT NOT NULL,
  accept_json  TEXT NOT NULL DEFAULT '[]',
  hints_json   TEXT NOT NULL DEFAULT '[]',
  explanation  TEXT NOT NULL DEFAULT '',
  active       INTEGER NOT NULL DEFAULT 1,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_custom_grade ON custom_questions(grade, active);

-- Gems a student has found while exploring. The primary key stops the same
-- gem being claimed twice.
CREATE TABLE IF NOT EXISTS collectibles (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade      TEXT NOT NULL,
  level      INTEGER NOT NULL,
  idx        INTEGER NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, grade, level, idx)
);

CREATE TABLE IF NOT EXISTS bug_reports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message      TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export const q = {
  get(sql, ...params) {
    return db.prepare(sql).get(...params) || null;
  },
  all(sql, ...params) {
    return db.prepare(sql).all(...params);
  },
  run(sql, ...params) {
    return db.prepare(sql).run(...params);
  },
};

export function parseJson(value, fallback) {
  try {
    const v = JSON.parse(value);
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

/** YYYY-MM-DD in the server's local time. */
export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

export { DATA_DIR, DB_PATH };
