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
`)

// Add friend_note column if missing (migration for existing DBs)
try {
  db.exec(`ALTER TABLE daily_content ADD COLUMN friend_note TEXT`)
} catch (e) {
  // Column already exists — ignore
}

// Add plan column to accounts if missing
try {
  db.exec(`ALTER TABLE accounts ADD COLUMN plan TEXT DEFAULT 'free'`)
} catch (e) {
  // Column already exists — ignore
}

db.exec(`

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

  CREATE TABLE IF NOT EXISTS spotify_tokens (
    user_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TEXT NOT NULL,
    spotify_user_id TEXT,
    spotify_display_name TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS moods (
    user_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    mood TEXT NOT NULL,
    logged_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, day_number)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    saved_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, day_number, type)
  );

  CREATE TABLE IF NOT EXISTS day_completions (
    user_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    completed_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, day_number)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event TEXT NOT NULL,
    data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0,
    user_id TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    user_id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    notify_time TEXT DEFAULT '08:00',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    stripe_payment_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'gbp',
    status TEXT NOT NULL DEFAULT 'succeeded',
    purchased_at TEXT DEFAULT (datetime('now'))
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
    INSERT INTO daily_content (user_id, day_number, cycle_id, quote, quote_author, song_title, song_artist, song_spotify_search, journal_prompt, affirmation, gratitude_prompt, breathing_opening, breathing_closing, friend_note)
    VALUES (@userId, @dayNumber, @cycleId, @quote, @quoteAuthor, @songTitle, @songArtist, @songSpotifySearch, @journalPrompt, @affirmation, @gratitudePrompt, @breathingOpening, @breathingClosing, @friendNote)
    ON CONFLICT(user_id, day_number, cycle_id) DO UPDATE SET
      quote=@quote, quote_author=@quoteAuthor, song_title=@songTitle, song_artist=@songArtist,
      song_spotify_search=@songSpotifySearch, journal_prompt=@journalPrompt, affirmation=@affirmation,
      gratitude_prompt=@gratitudePrompt, breathing_opening=@breathingOpening, breathing_closing=@breathingClosing,
      friend_note=@friendNote, generated_at=datetime('now')
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

  upsertSpotifyTokens: db.prepare(`
    INSERT INTO spotify_tokens (user_id, access_token, refresh_token, token_expiry, spotify_user_id, spotify_display_name)
    VALUES (@userId, @accessToken, @refreshToken, @tokenExpiry, @spotifyUserId, @spotifyDisplayName)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token=@accessToken, refresh_token=@refreshToken, token_expiry=@tokenExpiry,
      spotify_user_id=@spotifyUserId, spotify_display_name=@spotifyDisplayName, updated_at=datetime('now')
  `),
  getSpotifyTokens: db.prepare('SELECT * FROM spotify_tokens WHERE user_id = ?'),
  deleteSpotifyTokens: db.prepare('DELETE FROM spotify_tokens WHERE user_id = ?'),

  upsertFavorite: db.prepare(`
    INSERT INTO favorites (user_id, day_number, type, content, author)
    VALUES (@userId, @dayNumber, @type, @content, @author)
    ON CONFLICT(user_id, day_number, type) DO UPDATE SET content=@content, author=@author, saved_at=datetime('now')
  `),
  deleteFavorite: db.prepare('DELETE FROM favorites WHERE user_id = ? AND day_number = ? AND type = ?'),

  upsertDayCompletion: db.prepare(`
    INSERT OR IGNORE INTO day_completions (user_id, day_number) VALUES (@userId, @dayNumber)
  `),
  deleteDayCompletion: db.prepare('DELETE FROM day_completions WHERE user_id = ? AND day_number = ?'),

  insertEvent: db.prepare(`
    INSERT INTO events (user_id, event, data) VALUES (@userId, @event, @data)
  `),

  upsertMood: db.prepare(`
    INSERT INTO moods (user_id, day_number, mood)
    VALUES (@userId, @dayNumber, @mood)
    ON CONFLICT(user_id, day_number) DO UPDATE SET mood=@mood, logged_at=datetime('now')
  `),
  deleteMood: db.prepare('DELETE FROM moods WHERE user_id = ? AND day_number = ?'),

  insertPurchase: db.prepare(`
    INSERT INTO purchases (user_id, plan, stripe_payment_id, amount, currency, status)
    VALUES (@userId, @plan, @stripePaymentId, @amount, @currency, @status)
  `),
  getPurchaseByStripeId: db.prepare('SELECT * FROM purchases WHERE stripe_payment_id = ?'),
  updateAccountPlan: db.prepare('UPDATE accounts SET plan = @plan WHERE email = @email'),
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
    friendNote: row.friend_note || null,
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
    friendNote: content.friendNote || null,
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
  stmts.deleteSpotifyTokens.run(userId)
}

function saveSpotifyTokens(userId, data) {
  stmts.upsertSpotifyTokens.run({
    userId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenExpiry: data.tokenExpiry,
    spotifyUserId: data.spotifyUserId || null,
    spotifyDisplayName: data.spotifyDisplayName || null,
  })
}

function getSpotifyTokens(userId) {
  const row = stmts.getSpotifyTokens.get(userId)
  if (!row) return null
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiry: row.token_expiry,
    spotifyUserId: row.spotify_user_id,
    spotifyDisplayName: row.spotify_display_name,
  }
}

function deleteSpotifyTokens(userId) {
  stmts.deleteSpotifyTokens.run(userId)
}

function savePurchase(data) {
  stmts.insertPurchase.run({
    userId: data.userId,
    plan: data.plan,
    stripePaymentId: data.stripePaymentId,
    amount: data.amount,
    currency: data.currency || 'gbp',
    status: data.status || 'succeeded',
  })
}

function getPurchaseByStripeId(stripePaymentId) {
  return stmts.getPurchaseByStripeId.get(stripePaymentId) || null
}

function updateAccountPlan(email, plan) {
  stmts.updateAccountPlan.run({ email, plan })
}

function saveFavorite(userId, dayNumber, type, content, author) {
  if (content) {
    stmts.upsertFavorite.run({ userId, dayNumber, type, content, author: author || null })
  } else {
    stmts.deleteFavorite.run(userId, dayNumber, type)
  }
}

function saveDayCompletion(userId, dayNumber, completed) {
  if (completed) {
    stmts.upsertDayCompletion.run({ userId, dayNumber })
  } else {
    stmts.deleteDayCompletion.run(userId, dayNumber)
  }
}

function logEvent(userId, event, data) {
  stmts.insertEvent.run({ userId, event, data: data ? JSON.stringify(data) : null })
}

function saveMood(userId, dayNumber, mood) {
  if (mood) {
    stmts.upsertMood.run({ userId, dayNumber, mood })
  } else {
    stmts.deleteMood.run(userId, dayNumber)
  }
}

function savePushSubscription(userId, endpoint, keysP256dh, keysAuth, notifyTime) {
  db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth, notify_time)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET endpoint=?, keys_p256dh=?, keys_auth=?, notify_time=?`
  ).run(userId, endpoint, keysP256dh, keysAuth, notifyTime || '08:00', endpoint, keysP256dh, keysAuth, notifyTime || '08:00')
}

function deletePushSubscription(userId) {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId)
}

function getPushSubscriptionsDueAt(time) {
  return db.prepare('SELECT * FROM push_subscriptions WHERE notify_time = ?').all(time)
}

function logApiCost(service, model, inputTokens, outputTokens, estimatedCostUsd, userId, metadata) {
  db.prepare(`INSERT INTO api_costs (service, model, input_tokens, output_tokens, estimated_cost_usd, user_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    service, model, inputTokens || 0, outputTokens || 0, estimatedCostUsd || 0, userId || null, metadata ? JSON.stringify(metadata) : null
  )
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
  saveSpotifyTokens,
  getSpotifyTokens,
  deleteSpotifyTokens,
  savePurchase,
  getPurchaseByStripeId,
  updateAccountPlan,
  saveMood,
  saveFavorite,
  saveDayCompletion,
  logEvent,
  logApiCost,
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionsDueAt,
}
