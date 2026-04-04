const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, 'cycle.db')
const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT,
    treatment TEXT,
    cycle_days INTEGER,
    components TEXT, -- JSON array stored as text
    vibe TEXT,
    genres TEXT,     -- JSON array stored as text
    current_day INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_content (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    day_number INTEGER,
    cycle_id TEXT DEFAULT 'cycle_1',
    quote TEXT,
    quote_author TEXT,
    song_title TEXT,
    song_artist TEXT,
    song_spotify_search TEXT,
    journal_prompt TEXT,
    affirmation TEXT,
    gratitude_prompt TEXT,
    breathing_opening TEXT,
    breathing_closing TEXT,
    generated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_content_unique
    ON daily_content(user_id, day_number, cycle_id);

  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    day_number INTEGER,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_unique
    ON journal_entries(user_id, day_number);

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    profile_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

console.log('[DB] SQLite database ready at', DB_PATH)

// --- Prepared statements ---

const stmts = {
  upsertProfile: db.prepare(`
    INSERT INTO profiles (id, name, treatment, cycle_days, components, vibe, genres, current_day)
    VALUES (@id, @name, @treatment, @cycleDays, @components, @vibe, @genres, @currentDay)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, treatment=@treatment, cycle_days=@cycleDays,
      components=@components, vibe=@vibe, genres=@genres, current_day=@currentDay
  `),

  getProfile: db.prepare('SELECT * FROM profiles WHERE id = ?'),

  getDayContent: db.prepare(
    'SELECT * FROM daily_content WHERE user_id = ? AND day_number = ? AND cycle_id = ?'
  ),

  upsertDayContent: db.prepare(`
    INSERT INTO daily_content (user_id, day_number, cycle_id, quote, quote_author, song_title, song_artist, song_spotify_search, journal_prompt, affirmation, gratitude_prompt, breathing_opening, breathing_closing)
    VALUES (@userId, @dayNumber, @cycleId, @quote, @quoteAuthor, @songTitle, @songArtist, @songSpotifySearch, @journalPrompt, @affirmation, @gratitudePrompt, @breathingOpening, @breathingClosing)
    ON CONFLICT(user_id, day_number, cycle_id) DO UPDATE SET
      quote=@quote, quote_author=@quoteAuthor, song_title=@songTitle, song_artist=@songArtist,
      song_spotify_search=@songSpotifySearch, journal_prompt=@journalPrompt, affirmation=@affirmation,
      gratitude_prompt=@gratitudePrompt, breathing_opening=@breathingOpening, breathing_closing=@breathingClosing,
      generated_at=datetime('now')
  `),

  upsertJournal: db.prepare(`
    INSERT INTO journal_entries (user_id, day_number, content)
    VALUES (@userId, @dayNumber, @content)
    ON CONFLICT(user_id, day_number) DO UPDATE SET content=@content
  `),

  deleteUserData: db.prepare('DELETE FROM daily_content WHERE user_id = ?'),
  deleteUserJournals: db.prepare('DELETE FROM journal_entries WHERE user_id = ?'),
  deleteUserProfile: db.prepare('DELETE FROM profiles WHERE id = ?'),

  getAccountByEmail: db.prepare('SELECT * FROM accounts WHERE email = ?'),
  createAccount: db.prepare('INSERT INTO accounts (email, password_hash, profile_id) VALUES (@email, @passwordHash, @profileId)'),
  linkProfileToAccount: db.prepare('UPDATE accounts SET profile_id = @profileId WHERE email = @email'),
}

// --- Exported functions ---

function saveProfile(data) {
  stmts.upsertProfile.run({
    id: data.id,
    name: data.name,
    treatment: data.treatment,
    cycleDays: data.cycleDays,
    components: JSON.stringify(data.components),
    vibe: data.vibe,
    genres: JSON.stringify(data.genres),
    currentDay: data.currentDay,
  })
}

function getProfile(userId) {
  const row = stmts.getProfile.get(userId)
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    treatment: row.treatment,
    cycleDays: row.cycle_days,
    components: JSON.parse(row.components || '[]'),
    vibe: row.vibe,
    genres: JSON.parse(row.genres || '[]'),
    currentDay: row.current_day,
  }
}

function getDayContent(userId, dayNumber, cycleId = 'cycle_1') {
  const row = stmts.getDayContent.get(userId, dayNumber, cycleId)
  if (!row) return null
  return {
    quote: row.quote,
    quoteAuthor: row.quote_author,
    songTitle: row.song_title,
    songArtist: row.song_artist,
    songSpotifySearch: row.song_spotify_search,
    journalPrompt: row.journal_prompt,
    affirmation: row.affirmation,
    gratitudePrompt: row.gratitude_prompt,
    breathingOpening: row.breathing_opening,
    breathingClosing: row.breathing_closing,
  }
}

function saveDayContent(userId, dayNumber, cycleId, content) {
  stmts.upsertDayContent.run({
    userId,
    dayNumber,
    cycleId,
    quote: content.quote,
    quoteAuthor: content.quoteAuthor,
    songTitle: content.songTitle,
    songArtist: content.songArtist,
    songSpotifySearch: content.songSpotifySearch || null,
    journalPrompt: content.journalPrompt,
    affirmation: content.affirmation,
    gratitudePrompt: content.gratitudePrompt,
    breathingOpening: content.breathingOpening || null,
    breathingClosing: content.breathingClosing || null,
  })
}

function saveJournal(userId, dayNumber, content) {
  stmts.upsertJournal.run({ userId, dayNumber, content })
}

function getAccountByEmail(email) {
  return stmts.getAccountByEmail.get(email) || null
}

function createAccount(email, passwordHash, profileId) {
  stmts.createAccount.run({ email, passwordHash, profileId })
  return stmts.getAccountByEmail.get(email)
}

function linkProfileToAccount(email, profileId) {
  stmts.linkProfileToAccount.run({ email, profileId })
}

function deleteUser(userId) {
  stmts.deleteUserData.run(userId)
  stmts.deleteUserJournals.run(userId)
  stmts.deleteUserProfile.run(userId)
}

module.exports = {
  db,
  saveProfile,
  getProfile,
  getDayContent,
  saveDayContent,
  saveJournal,
  deleteUser,
  getAccountByEmail,
  createAccount,
  linkProfileToAccount,
}
