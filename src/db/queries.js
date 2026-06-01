const db = require('./index');

// ── Config ──────────────────────────────────────────────────────────────────

function getConfig(guildId) {
  const row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!row) return null;
  return { ...row, active_days: JSON.parse(row.active_days) };
}

function setConfig(guildId, fields) {
  const existing = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!existing) {
    db.prepare(`
      INSERT INTO guild_config (guild_id, role_id, channel_id, active_days, deadline_hours, cron_day)
      VALUES (@guild_id, @role_id, @channel_id, @active_days, @deadline_hours, @cron_day)
    `).run({
      guild_id: guildId,
      role_id: null,
      channel_id: null,
      active_days: '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
      deadline_hours: 48,
      cron_day: 'saturday',
      ...fields,
    });
  } else {
    const updates = Object.keys(fields).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE guild_config SET ${updates} WHERE guild_id = @guild_id`)
      .run({ guild_id: guildId, ...fields });
  }
}

// ── Weeks ────────────────────────────────────────────────────────────────────

function createWeek(guildId, weekStart, deadlineAt) {
  return db.prepare(`
    INSERT OR IGNORE INTO weeks (guild_id, week_start, deadline_at)
    VALUES (?, ?, ?)
  `).run(guildId, weekStart, deadlineAt);
}

function getWeek(guildId, weekStart) {
  return db.prepare('SELECT * FROM weeks WHERE guild_id = ? AND week_start = ?').get(guildId, weekStart);
}

function getOpenWeek(guildId) {
  return db.prepare('SELECT * FROM weeks WHERE guild_id = ? AND closed_at IS NULL ORDER BY id DESC LIMIT 1').get(guildId);
}

function getLastWeek(guildId) {
  return db.prepare('SELECT * FROM weeks WHERE guild_id = ? ORDER BY id DESC LIMIT 1').get(guildId);
}

function setWeekMessageId(weekId, messageId) {
  db.prepare('UPDATE weeks SET message_id = ? WHERE id = ?').run(messageId, weekId);
}

function closeWeek(weekId) {
  db.prepare("UPDATE weeks SET closed_at = datetime('now') WHERE id = ?").run(weekId);
}

// ── Availability ─────────────────────────────────────────────────────────────

function toggleAvailability(weekId, userId, day) {
  const existing = db.prepare(
    'SELECT available FROM availability WHERE week_id = ? AND user_id = ? AND day = ?'
  ).get(weekId, userId, day);

  if (!existing) {
    db.prepare('INSERT INTO availability (week_id, user_id, day, available) VALUES (?, ?, ?, 1)')
      .run(weekId, userId, day);
    return 1;
  }
  const newVal = existing.available === 1 ? 0 : 1;
  db.prepare('UPDATE availability SET available = ? WHERE week_id = ? AND user_id = ? AND day = ?')
    .run(newVal, weekId, userId, day);
  return newVal;
}

function getDayCounts(weekId) {
  return db.prepare(`
    SELECT a.day, COUNT(a.user_id) as count
    FROM availability a
    JOIN confirmations c ON c.week_id = a.week_id AND c.user_id = a.user_id
    WHERE a.week_id = ? AND a.available = 1
    GROUP BY a.day
  `).all(weekId);
}

// ── Confirmations ────────────────────────────────────────────────────────────

function confirmUser(weekId, userId) {
  db.prepare(`
    INSERT OR REPLACE INTO confirmations (week_id, user_id, confirmed_at)
    VALUES (?, ?, datetime('now'))
  `).run(weekId, userId);
}

function getConfirmedUserIds(weekId) {
  return db.prepare('SELECT user_id FROM confirmations WHERE week_id = ?').all(weekId).map(r => r.user_id);
}

function getConfirmationCount(weekId) {
  return db.prepare('SELECT COUNT(*) as n FROM confirmations WHERE week_id = ?').get(weekId).n;
}

function getUserDays(weekId, userId) {
  return db.prepare(
    'SELECT day FROM availability WHERE week_id = ? AND user_id = ? AND available = 1'
  ).all(weekId, userId).map(r => r.day);
}

// ── Results ──────────────────────────────────────────────────────────────────

function getResults(weekId) {
  return db.prepare(`
    SELECT a.day, COUNT(a.user_id) as count
    FROM availability a
    JOIN confirmations c ON c.week_id = a.week_id AND c.user_id = a.user_id
    WHERE a.week_id = ? AND a.available = 1
    GROUP BY a.day
    ORDER BY count DESC
  `).all(weekId);
}

function getVotesByDay(weekId) {
  return db.prepare(`
    SELECT day, user_id FROM availability
    WHERE week_id = ? AND available = 1
    ORDER BY day
  `).all(weekId);
}

function getExpiredWeeks() {
  return db.prepare(`
    SELECT * FROM weeks
    WHERE closed_at IS NULL
      AND deadline_at <= datetime('now')
  `).all();
}

function getPartialResults(weekId) {
  return db.prepare(`
    SELECT day, COUNT(user_id) as count
    FROM availability
    WHERE week_id = ? AND available = 1
    GROUP BY day
    ORDER BY count DESC
  `).all(weekId);
}

module.exports = {
  getConfig, setConfig,
  createWeek, getWeek, getOpenWeek, getLastWeek, setWeekMessageId, closeWeek,
  toggleAvailability, getDayCounts,
  confirmUser, getConfirmedUserIds, getConfirmationCount, getUserDays,
  getResults, getPartialResults, getExpiredWeeks, getVotesByDay,
};
