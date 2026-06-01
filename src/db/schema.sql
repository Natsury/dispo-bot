CREATE TABLE IF NOT EXISTS guild_config (
  guild_id       TEXT PRIMARY KEY,
  role_id        TEXT,
  channel_id     TEXT,
  active_days    TEXT NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
  deadline_hours INTEGER NOT NULL DEFAULT 48,
  cron_day       TEXT NOT NULL DEFAULT 'saturday'
);

CREATE TABLE IF NOT EXISTS weeks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id     TEXT NOT NULL,
  week_start   TEXT NOT NULL,
  deadline_at  TEXT NOT NULL,
  closed_at    TEXT,
  message_id   TEXT,
  UNIQUE(guild_id, week_start)
);

CREATE TABLE IF NOT EXISTS availability (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id   INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL,
  day       TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1,
  UNIQUE(week_id, user_id, day)
);

CREATE TABLE IF NOT EXISTS confirmations (
  week_id      INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  PRIMARY KEY(week_id, user_id)
);
