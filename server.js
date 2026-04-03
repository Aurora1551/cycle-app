require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { db, saveProfile, getProfile, getDayContent, saveDayContent, saveJournal, deleteUser } = require('./db')

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

const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese'
}

function buildUserPrompt({ name, treatment, dayNumber, totalDays, vibe, genres, language }) {
  const lang = LANGUAGE_NAMES[language] || 'English'
  const langInstruction = language && language !== 'en'
    ? `\n\nIMPORTANT: Generate ALL content in ${lang}. The quote, affirmation, journal prompt, gratitude prompt, breathing lines, and song recommendation should all be in ${lang}. For song recommendations, prefer songs in ${lang} or that are popular in ${lang}-speaking countries, but you may also suggest well-known English songs if they fit the vibe.`
    : ''
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

Return ONLY the JSON object, no markdown fences, no other text.${langInstruction}`
}

// --- Fallback content bank (used when Claude API is unavailable) ---

const FALLBACK_CONTENT = [
  {
    quote: "I am my own experiment. I am my own work of art.",
    quoteAuthor: "Madonna",
    songTitle: "Bloom",
    songArtist: "The Paper Kites",
    affirmation: "I am taking the first brave step on a journey that is uniquely mine.",
    journalPrompt: "Today is the beginning. What are you carrying into this cycle — hopes, fears, or both? Write them down without judgement.",
    gratitudePrompt: "What is one small thing your body did for you today?",
    breathingOpening: "NAME, let's begin this journey together with a moment of stillness.",
    breathingClosing: "You've already shown courage today, NAME. Carry that with you.",
  },
  {
    quote: "She was powerful not because she wasn't scared but because she went on so strongly, despite the fear.",
    quoteAuthor: "Atticus",
    songTitle: "Dog Days Are Over",
    songArtist: "Florence + The Machine",
    affirmation: "I am stronger than the uncertainty I feel today.",
    journalPrompt: "What does strength look like for you right now? It doesn't have to be loud — it can be quiet and gentle.",
    gratitudePrompt: "Who showed up for you recently, even in a small way?",
    breathingOpening: "NAME, day two can feel heavy. Let's lighten the load together.",
    breathingClosing: "You're doing this, NAME. One breath at a time.",
  },
  {
    quote: "You are allowed to be both a masterpiece and a work in progress simultaneously.",
    quoteAuthor: "Sophia Bush",
    songTitle: "Unwritten",
    songArtist: "Natasha Bedingfield",
    affirmation: "I am learning to trust the process, even when I can't see what's ahead.",
    journalPrompt: "How are you feeling in your body today? What does it need from you right now?",
    gratitudePrompt: "What is one thing you're looking forward to, no matter how small?",
    breathingOpening: "NAME, you're three days in. Let's take a breath and honour that.",
    breathingClosing: "Well done, NAME. You showed up again today.",
  },
  {
    quote: "The wound is the place where the Light enters you.",
    quoteAuthor: "Rumi",
    songTitle: "A Thousand Years",
    songArtist: "Christina Perri",
    affirmation: "I am worthy of the good things making their way to me.",
    journalPrompt: "What is something you would say to a friend going through this? Now say it to yourself.",
    gratitudePrompt: "What part of your routine brought you comfort today?",
    breathingOpening: "NAME, let's slow down for a moment and just be here.",
    breathingClosing: "You are held, NAME, even when it doesn't feel like it.",
  },
  {
    quote: "I have learned not to allow rejection to move me.",
    quoteAuthor: "Cicely Tyson",
    songTitle: "Rise Up",
    songArtist: "Andra Day",
    affirmation: "I am resilient, and my body is doing incredible things right now.",
    journalPrompt: "What emotions have surprised you this week? Give them space here.",
    gratitudePrompt: "Name one thing about today that made you smile.",
    breathingOpening: "NAME, five days in — you're showing up with such grace.",
    breathingClosing: "Keep going, NAME. You're doing beautifully.",
  },
  {
    quote: "We delight in the beauty of the butterfly, but rarely admit the changes it has gone through to achieve that beauty.",
    quoteAuthor: "Maya Angelou",
    songTitle: "Superpower",
    songArtist: "Beyoncé",
    affirmation: "I am becoming who I need to be, one day at a time.",
    journalPrompt: "What has this process taught you about patience? How has your relationship with waiting changed?",
    gratitudePrompt: "What is one thing your body can do that amazes you?",
    breathingOpening: "NAME, let's pause and appreciate how far you've already come.",
    breathingClosing: "You are transforming, NAME. Trust it.",
  },
  {
    quote: "You don't have to be perfect to be worthy.",
    quoteAuthor: "Brené Brown",
    songTitle: "Golden",
    songArtist: "Jill Scott",
    affirmation: "I am enough exactly as I am in this moment.",
    journalPrompt: "When do you feel most like yourself during this process? What moments bring you back to centre?",
    gratitudePrompt: "Who or what made you feel safe recently?",
    breathingOpening: "NAME, a whole week in. Let's celebrate that with a deep breath.",
    breathingClosing: "One week down, NAME. You are extraordinary.",
  },
  {
    quote: "I am no longer accepting the things I cannot change. I am changing the things I cannot accept.",
    quoteAuthor: "Angela Davis",
    songTitle: "Brave",
    songArtist: "Sara Bareilles",
    affirmation: "I have the courage to keep going even when the path is unclear.",
    journalPrompt: "What would you tell your future self about this moment? Write a note to her.",
    gratitudePrompt: "What sound or smell brought you peace today?",
    breathingOpening: "NAME, you're in the thick of it now. Let's find some calm together.",
    breathingClosing: "You are a force, NAME. Don't forget that.",
  },
  {
    quote: "There is no force more powerful than a woman determined to rise.",
    quoteAuthor: "W.E.B. Du Bois",
    songTitle: "Feeling Good",
    songArtist: "Nina Simone",
    affirmation: "I am choosing hope today, even if it feels fragile.",
    journalPrompt: "What has been the hardest part of this week? What would make it easier?",
    gratitudePrompt: "What act of self-care did you do this week?",
    breathingOpening: "NAME, nine days of showing up. That takes real strength.",
    breathingClosing: "Breathe easy, NAME. You've earned this peace.",
  },
  {
    quote: "My mission in life is not merely to survive, but to thrive.",
    quoteAuthor: "Maya Angelou",
    songTitle: "Firework",
    songArtist: "Katy Perry",
    affirmation: "I am not just surviving this — I am growing through it.",
    journalPrompt: "If this journey had a soundtrack, what would the current song be? Why?",
    gratitudePrompt: "What made you laugh recently?",
    breathingOpening: "NAME, double digits! Let's mark this moment together.",
    breathingClosing: "Ten days strong, NAME. You inspire me.",
  },
  {
    quote: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all.",
    quoteAuthor: "J.K. Rowling",
    songTitle: "Unstoppable",
    songArtist: "Sia",
    affirmation: "I am proud of myself for every single step I've taken so far.",
    journalPrompt: "What would your body say to you if it could speak right now? Listen and write.",
    gratitudePrompt: "What view or place brings you comfort?",
    breathingOpening: "NAME, the journey continues. Let's breathe into this new day.",
    breathingClosing: "You carry so much strength, NAME. Let it hold you.",
  },
  {
    quote: "I've been absolutely terrified every moment of my life — and I've never let it keep me from doing a single thing I wanted to do.",
    quoteAuthor: "Georgia O'Keeffe",
    songTitle: "Fight Song",
    songArtist: "Rachel Platten",
    affirmation: "I am allowed to feel everything and still move forward.",
    journalPrompt: "Twelve days in — how have you changed since day one? What feels different?",
    gratitudePrompt: "What texture or touch felt comforting today?",
    breathingOpening: "NAME, you're well past the halfway mark now. Let's honour this moment.",
    breathingClosing: "Almost there, NAME. You are remarkable.",
  },
  {
    quote: "Talk to yourself like you would to someone you love.",
    quoteAuthor: "Brené Brown",
    songTitle: "The Best",
    songArtist: "Tina Turner",
    affirmation: "I have everything I need within me to face today.",
    journalPrompt: "What kind words have you needed to hear? Write them here and read them aloud.",
    gratitudePrompt: "What food or drink nourished you today?",
    breathingOpening: "NAME, let's take this moment to be gentle with ourselves.",
    breathingClosing: "You deserve kindness, NAME — especially from yourself.",
  },
  {
    quote: "The most common way people give up their power is by thinking they don't have any.",
    quoteAuthor: "Alice Walker",
    songTitle: "Stronger",
    songArtist: "Kelly Clarkson",
    affirmation: "I am powerful beyond measure, and my journey proves it.",
    journalPrompt: "What has been your biggest source of strength during this cycle? How can you lean into it more?",
    gratitudePrompt: "What is one thing you did today just for you?",
    breathingOpening: "NAME, the final stretch. Let's breathe strength into every cell.",
    breathingClosing: "You've almost done it, NAME. What a warrior you are.",
  },
  {
    quote: "What lies behind us and what lies before us are tiny matters compared to what lies within us.",
    quoteAuthor: "Ralph Waldo Emerson",
    songTitle: "Born This Way",
    songArtist: "Lady Gaga",
    affirmation: "I am complete, whole, and ready for whatever comes next.",
    journalPrompt: "As this phase draws to a close, what do you want to carry forward? What do you want to leave behind?",
    gratitudePrompt: "What are you most grateful for in this moment?",
    breathingOpening: "NAME, here we are. Let's breathe into this beautiful moment together.",
    breathingClosing: "NAME, you did it. Every breath, every day, every tear — it all mattered.",
  },
  {
    quote: "In the middle of difficulty lies opportunity.",
    quoteAuthor: "Albert Einstein",
    songTitle: "Here Comes the Sun",
    songArtist: "The Beatles",
    affirmation: "I am open to the possibilities this new day brings.",
    journalPrompt: "What opportunities have you found hidden inside difficult moments this cycle?",
    gratitudePrompt: "What simple pleasure did you enjoy today?",
    breathingOpening: "NAME, let's welcome today with open arms and open lungs.",
    breathingClosing: "A new breath, a new moment, NAME. You're doing wonderfully.",
  },
  {
    quote: "Stars can't shine without darkness.",
    quoteAuthor: "D.H. Sidebottom",
    songTitle: "Titanium",
    songArtist: "David Guetta ft. Sia",
    affirmation: "I am shining my light even through the hard days.",
    journalPrompt: "When have you felt most proud of yourself during this journey?",
    gratitudePrompt: "What colour or image brought you joy today?",
    breathingOpening: "NAME, seventeen days of showing up. That is extraordinary.",
    breathingClosing: "You are luminous, NAME. Never doubt it.",
  },
  {
    quote: "Life shrinks or expands in proportion to one's courage.",
    quoteAuthor: "Anaïs Nin",
    songTitle: "Freedom",
    songArtist: "Beyoncé",
    affirmation: "I have the courage to hold space for hope and uncertainty at the same time.",
    journalPrompt: "How has your definition of courage evolved since starting this cycle?",
    gratitudePrompt: "What moment of unexpected beauty did you notice recently?",
    breathingOpening: "NAME, you continue to expand. Let's breathe into that growth.",
    breathingClosing: "Your courage is boundless, NAME. Remember that always.",
  },
  {
    quote: "One is not born, but rather becomes, a woman.",
    quoteAuthor: "Simone de Beauvoir",
    songTitle: "Woman",
    songArtist: "Doja Cat",
    affirmation: "I am becoming the version of myself I was always meant to be.",
    journalPrompt: "What does womanhood mean to you today, in this moment, on this journey?",
    gratitudePrompt: "What song or piece of music moved you recently?",
    breathingOpening: "NAME, almost three weeks. You are becoming someone remarkable.",
    breathingClosing: "Keep becoming, NAME. The world needs exactly who you are.",
  },
  {
    quote: "The only way to do great work is to love what you do.",
    quoteAuthor: "Steve Jobs",
    songTitle: "Lovely Day",
    songArtist: "Bill Withers",
    affirmation: "I am grateful for this body that works so hard for me every day.",
    journalPrompt: "What do you love about yourself today? Don't think too hard — just write.",
    gratitudePrompt: "What warmth — from a person, a drink, the sun — did you feel today?",
    breathingOpening: "NAME, twenty days in. Let's breathe love into this moment.",
    breathingClosing: "You are loved, NAME. By so many, including yourself.",
  },
  {
    quote: "Nothing is impossible. The word itself says 'I'm possible!'",
    quoteAuthor: "Audrey Hepburn",
    songTitle: "Possibilities",
    songArtist: "Freddie Stroma",
    affirmation: "I am possible. Everything I dream of is possible.",
    journalPrompt: "Three weeks in — what has this journey made possible that you didn't expect?",
    gratitudePrompt: "What conversation lifted your spirits recently?",
    breathingOpening: "NAME, you are proving what's possible. Let's breathe into that.",
    breathingClosing: "Anything is possible, NAME. You're living proof.",
  },
  {
    quote: "She stood in the storm, and when the wind did not blow her way, she adjusted her sails.",
    quoteAuthor: "Elizabeth Edwards",
    songTitle: "Survivor",
    songArtist: "Destiny's Child",
    affirmation: "I am adaptable, strong, and ready for whatever today brings.",
    journalPrompt: "How have you adjusted and adapted during this cycle? What surprised you about your own flexibility?",
    gratitudePrompt: "What creature — a pet, a bird, an animal you saw — brought you joy?",
    breathingOpening: "NAME, the winds may shift but you remain steady. Let's breathe.",
    breathingClosing: "You've weathered so much, NAME. Smooth seas are coming.",
  },
  {
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    quoteAuthor: "Eleanor Roosevelt",
    songTitle: "Dreams",
    songArtist: "Fleetwood Mac",
    affirmation: "I believe in the beauty of what's ahead, even if I can't see it yet.",
    journalPrompt: "What dreams are you holding for yourself? Write them as if they've already happened.",
    gratitudePrompt: "What dream or hope makes your heart beat a little faster?",
    breathingOpening: "NAME, let's breathe life into your dreams today.",
    breathingClosing: "Dream boldly, NAME. You deserve every single one.",
  },
  {
    quote: "You have been assigned this mountain to show others it can be moved.",
    quoteAuthor: "Mel Robbins",
    songTitle: "Roar",
    songArtist: "Katy Perry",
    affirmation: "I am moving mountains, even when it feels like I'm barely moving at all.",
    journalPrompt: "What mountains have you moved this cycle that no one else can see?",
    gratitudePrompt: "What quiet victory are you proud of today?",
    breathingOpening: "NAME, you move mountains. Let's rest on the summit for a moment.",
    breathingClosing: "Mountain mover. That's you, NAME.",
  },
  {
    quote: "Be fearlessly authentic.",
    quoteAuthor: "Unknown",
    songTitle: "This Is Me",
    songArtist: "Keala Settle",
    affirmation: "I am authentically, fearlessly, unapologetically myself.",
    journalPrompt: "When do you feel most authentically you? How can you invite more of those moments in?",
    gratitudePrompt: "What made you feel truly seen today?",
    breathingOpening: "NAME, twenty-five days. Let's breathe in who you truly are.",
    breathingClosing: "Authentic and brave, NAME. That's your superpower.",
  },
  {
    quote: "And one day she discovered that she was fierce, and strong, and full of fire, and that not even she could hold herself back.",
    quoteAuthor: "Mark Anthony",
    songTitle: "Girl on Fire",
    songArtist: "Alicia Keys",
    affirmation: "I am fierce, I am strong, and I am full of fire.",
    journalPrompt: "Where do you feel the fire inside you burning brightest right now?",
    gratitudePrompt: "What fierce woman — real or fictional — inspires you?",
    breathingOpening: "NAME, you are fire. Let's fan those flames with a deep breath.",
    breathingClosing: "Burn bright, NAME. The world needs your light.",
  },
  {
    quote: "You are the one that possesses the keys to your being.",
    quoteAuthor: "Haruki Murakami",
    songTitle: "Shake It Off",
    songArtist: "Taylor Swift",
    affirmation: "I hold the keys to my own story, and I choose hope.",
    journalPrompt: "If this cycle is one chapter of your story, how would you title it?",
    gratitudePrompt: "What unlocked something good in you today?",
    breathingOpening: "NAME, you hold the keys. Let's breathe and unlock this moment.",
    breathingClosing: "The power is yours, NAME. It always has been.",
  },
  {
    quote: "Every great dream begins with a dreamer.",
    quoteAuthor: "Harriet Tubman",
    songTitle: "Happy",
    songArtist: "Pharrell Williams",
    affirmation: "I am the dreamer and the dream. Both are beautiful.",
    journalPrompt: "As this cycle nears its end, what does your heart want to say? Let it speak freely.",
    gratitudePrompt: "What made today feel a little bit magic?",
    breathingOpening: "NAME, the finish line is near. Let's breathe into this moment of arrival.",
    breathingClosing: "Dreamer, doer, warrior — that's you, NAME. Always.",
  },
]

function getFallbackContent(dayNumber, name) {
  const idx = ((dayNumber - 1) % FALLBACK_CONTENT.length)
  const entry = { ...FALLBACK_CONTENT[idx] }
  // Personalize with user's name
  entry.breathingOpening = entry.breathingOpening.replace(/NAME/g, name || 'love')
  entry.breathingClosing = entry.breathingClosing.replace(/NAME/g, name || 'love')
  return entry
}

// --- Content generation endpoint ---

app.post('/api/generate-day', async (req, res) => {
  const { name, treatment, dayNumber, totalDays, vibe, genres, userId, cycleId, language } = req.body
  const uid = userId || name // fallback user identifier
  const cid = cycleId || 'cycle_1'

  // 1. Check SQLite cache first
  const cached = getDayContent(uid, dayNumber, cid)
  if (cached) {
    console.log(`[DB] Serving cached content for ${name}, Day ${dayNumber} (cycle: ${cid})`)
    return res.json(cached)
  }

  // 2. Try Claude API if available
  if (Anthropic && anthropicKey && anthropicKey.startsWith('sk-ant-')) {
    try {
      const anthropic = new Anthropic.default({ apiKey: anthropicKey })
      console.log(`[API] Generating content for ${name}, Day ${dayNumber}/${totalDays}, vibe=${vibe}`)

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildUserPrompt({ name, treatment, dayNumber, totalDays, vibe, genres, language }),
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

      // Save to SQLite
      saveDayContent(uid, dayNumber, cid, content)
      console.log(`[API] Success for ${name} Day ${dayNumber}: quote by ${content.quoteAuthor}, song: ${content.songTitle}`)

      return res.json(content)
    } catch (err) {
      console.error('[ERROR] Claude API call failed:', err.message, '— falling back to built-in content')
    }
  }

  // 3. Fallback: serve from built-in content bank
  const content = getFallbackContent(dayNumber, name)
  saveDayContent(uid, dayNumber, cid, content)
  console.log(`[FALLBACK] Serving built-in content for ${name}, Day ${dayNumber}`)
  res.json(content)
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

// --- Admin page ---

app.get('/admin', (_, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'))
})

app.get('/api/admin/profiles', (_, res) => {
  const rows = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all()
  rows.forEach(r => {
    r.components = JSON.parse(r.components || '[]')
    r.genres = JSON.parse(r.genres || '[]')
  })
  res.json(rows)
})

app.get('/api/admin/content', (_, res) => {
  const rows = db.prepare('SELECT * FROM daily_content ORDER BY user_id, day_number').all()
  res.json(rows)
})

app.get('/api/admin/journals', (_, res) => {
  const rows = db.prepare('SELECT * FROM journal_entries ORDER BY user_id, day_number').all()
  res.json(rows)
})

app.get('/api/admin/stats', (_, res) => {
  const profiles = db.prepare('SELECT COUNT(*) as count FROM profiles').get().count
  const content = db.prepare('SELECT COUNT(*) as count FROM daily_content').get().count
  const journals = db.prepare('SELECT COUNT(*) as count FROM journal_entries').get().count
  res.json({ profiles, content, journals })
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
