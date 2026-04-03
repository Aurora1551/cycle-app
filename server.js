require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { saveProfile, getProfile, getDayContent, saveDayContent, saveJournal, deleteUser } = require('./db')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

// --- Validate Anthropic SDK + API key at startup ---
let Anthropic
try {
  Anthropic = require('@anthropic-ai/sdk')
} catch (e) {
  console.error('[FATAL] @anthropic-ai/sdk not installed. Run: npm install @anthropic-ai/sdk')
}

const anthropicKey = process.env.ANTHROPIC_API_KEY
if (!anthropicKey) {
  console.error('[FATAL] ANTHROPIC_API_KEY is not set. Add it to .env or export it.')
  console.error('  Example: echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env')
} else {
  console.log('[OK] ANTHROPIC_API_KEY is set (length: ' + anthropicKey.length + ')')
}

if (Anthropic && anthropicKey) {
  console.log('[OK] Claude API ready')
} else {
  console.error('[WARNING] Claude API NOT available — content generation will fail (no silent fallback)')
}

// --- Prompts ---

const SYSTEM_PROMPT = `You are a warm, empowering companion for women going through fertility treatment. Generate deeply personal, emotionally rich daily content. Never use generic wellness clichés. Write as if you know this woman personally and understand exactly what she is going through today.`

function buildUserPrompt({ name, treatment, dayNumber, totalDays, vibe, genres }) {
  return `Generate today's content for ${name} who is on Day ${dayNumber} of ${totalDays} of their ${treatment} cycle. Their vibe is ${vibe}. Their music preferences are ${genres.join(', ')}.

Generate:
1) A powerful quote relevant to her specific day and treatment — use varied quotes from diverse women including Frida Kahlo, Maya Angelou, Rupi Kaur, Brené Brown, Gloria Anzaldúa, Michelle Obama and others — never the same quote twice across the cycle.
2) A song recommendation matching her music genres and vibe — vary across all ${totalDays} days never repeat the same song.
3) An affirmation in first person starting with "I am" or "I have" that reflects what day she is on — Day 1 feels different to Day 8 so make it specific.
4) A journal prompt specific to what she might be feeling on this exact day of fertility treatment — not generic wellness prompts.
5) A gratitude prompt that is short and gentle.
6) A breathing exercise opening line using her name, warm and specific to her day.
7) A breathing exercise closing line using her name, different from the opening.

Return the response as a JSON object with keys: quote, quote_author, song_title, song_artist, song_spotify_search, affirmation, journal_prompt, gratitude_prompt, breathing_opening, breathing_closing.

Return ONLY the JSON object, no markdown fences, no other text.`
}

// --- Content generation endpoint ---

app.post('/api/generate-day', async (req, res) => {
  const { name, treatment, dayNumber, totalDays, vibe, genres, userId, cycleId } = req.body
  const uid = userId || name // fallback user identifier
  const cid = cycleId || 'cycle_1'

  // 1. Check SQLite cache first
  const cached = getDayContent(uid, dayNumber, cid)
  if (cached) {
    console.log(`[DB] Serving cached content for ${name}, Day ${dayNumber} (cycle: ${cid})`)
    return res.json(cached)
  }

  // 2. No cache — generate via Claude API
  if (!Anthropic || !anthropicKey) {
    console.error('[ERROR] /api/generate-day called but Claude API is not configured')
    return res.status(503).json({
      error: true,
      message: 'Content generation is not available — ANTHROPIC_API_KEY is missing',
    })
  }

  try {
    const anthropic = new Anthropic.default({ apiKey: anthropicKey })
    console.log(`[API] Generating content for ${name}, Day ${dayNumber}/${totalDays}, vibe=${vibe}`)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildUserPrompt({ name, treatment, dayNumber, totalDays, vibe, genres }),
      }],
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in Claude response')

    const raw = JSON.parse(jsonMatch[0])

    // Normalize keys from snake_case to camelCase
    const content = {
      quote: raw.quote,
      quoteAuthor: raw.quote_author || raw.quoteAuthor,
      songTitle: raw.song_title || raw.songTitle,
      songArtist: raw.song_artist || raw.songArtist,
      songSpotifySearch: raw.song_spotify_search || raw.songSpotifySearch,
      journalPrompt: raw.journal_prompt || raw.journalPrompt,
      affirmation: raw.affirmation,
      gratitudePrompt: raw.gratitude_prompt || raw.gratitudePrompt,
      breathingOpening: raw.breathing_opening || raw.breathingOpening,
      breathingClosing: raw.breathing_closing || raw.breathingClosing,
    }

    // 3. Save to SQLite
    saveDayContent(uid, dayNumber, cid, content)
    console.log(`[API] Success for ${name} Day ${dayNumber}: quote by ${content.quoteAuthor}, song: ${content.songTitle}`)

    res.json(content)
  } catch (err) {
    console.error('[ERROR] Claude API call failed:', err.message)
    res.status(500).json({
      error: true,
      message: 'Content generation failed — please try again',
    })
  }
})

// --- Profile endpoints ---

app.post('/api/profile', (req, res) => {
  try {
    saveProfile(req.body)
    res.json({ ok: true })
  } catch (err) {
    console.error('[ERROR] saveProfile:', err.message)
    res.status(500).json({ error: true, message: err.message })
  }
})

app.get('/api/profile/:id', (req, res) => {
  const profile = getProfile(req.params.id)
  if (!profile) return res.status(404).json({ error: true, message: 'Profile not found' })
  res.json(profile)
})

// --- Journal endpoints ---

app.post('/api/journal', (req, res) => {
  const { userId, dayNumber, content } = req.body
  try {
    saveJournal(userId || 'default', dayNumber, content)
    res.json({ ok: true })
  } catch (err) {
    console.error('[ERROR] saveJournal:', err.message)
    res.status(500).json({ error: true, message: err.message })
  }
})

// --- Delete account ---

app.post('/api/delete-account', (req, res) => {
  const { userId } = req.body
  try {
    deleteUser(userId || 'default')
    res.json({ ok: true })
  } catch (err) {
    console.error('[ERROR] deleteUser:', err.message)
    res.status(500).json({ error: true, message: err.message })
  }
})

// --- Health check ---

app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    database: 'sqlite',
    apiConfigured: !!(Anthropic && anthropicKey),
    keyPresent: !!anthropicKey,
    sdkLoaded: !!Anthropic,
  })
})

const PORT = 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`)
})
