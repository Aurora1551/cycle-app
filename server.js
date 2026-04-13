require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const bcrypt = require('bcryptjs')
const { db, saveProfile, getProfile, getDayContent, saveDayContent, saveJournal, deleteUser, getAccountByEmail, createAccount, linkProfileToAccount, saveSpotifyTokens, getSpotifyTokens, deleteSpotifyTokens, savePurchase, getPurchaseByStripeId, updateAccountPlan, saveMood, saveFavorite, saveDayCompletion, logEvent } = require('./db')

const app = express()
app.use(cors({ origin: '*' }))

// --- Stripe setup ---
const Stripe = require('stripe')
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

if (!STRIPE_SECRET_KEY) console.error('[WARNING] STRIPE_SECRET_KEY is not set. Stripe payments will not work.')
else console.log('[OK] STRIPE_SECRET_KEY is set')
if (!STRIPE_PUBLISHABLE_KEY) console.error('[WARNING] STRIPE_PUBLISHABLE_KEY is not set. Frontend payments will not work.')
else console.log('[OK] STRIPE_PUBLISHABLE_KEY is set')
if (!STRIPE_WEBHOOK_SECRET) console.error('[WARNING] STRIPE_WEBHOOK_SECRET is not set. Stripe webhooks will not be verified.')
else console.log('[OK] STRIPE_WEBHOOK_SECRET is set')

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null

// Stripe webhook must use raw body — mount BEFORE express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe] Webhook received but Stripe is not configured')
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const userId = pi.metadata?.user_id
    const plan = pi.metadata?.plan
    const email = pi.metadata?.email

    console.log(`[Stripe] payment_intent.succeeded: ${pi.id}, user=${userId}, plan=${plan}`)

    // Save purchase as backup
    const existing = getPurchaseByStripeId(pi.id)
    if (!existing) {
      savePurchase({
        userId: userId || 'unknown',
        plan: plan || 'one_cycle',
        stripePaymentId: pi.id,
        amount: pi.amount,
        currency: pi.currency,
      })
    }

    // Update account plan
    if (email) {
      updateAccountPlan(email, plan || 'one_cycle')
      console.log(`[Stripe] Updated plan for ${email} to ${plan}`)
    }
  }

  res.json({ received: true })
})

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

const BASE_SYSTEM_PROMPT = `You are a warm, empowering companion for women going through fertility treatment. Generate deeply personal, emotionally rich daily content. Never use generic wellness clichés. Write as if you know this woman personally and understand exactly what she is going through today.`

// Vibe-specific tone descriptions for Claude API content generation
const VIBE_TONES = {
  fierce: {
    overall: 'bold, fierce, warrior energy — make her feel unstoppable',
    quote: "TODAY'S FIRE — bold, fierce, warrior energy, make her feel unstoppable",
    anthem: "TODAY'S ANTHEM — powerful, pump-up energy",
    affirmation: 'YOUR POWER — fierce first-person declaration of strength',
    journal: 'YOUR FIRE — bold reflective prompt about courage and strength',
    gratitude: "TODAY'S GRATITUDE — strong and proud not soft",
    breathing: 'BREATHE — energising breath',
    friendNote: 'Write as a fierce, proud best friend. Example tone: "I am so proud of you. Every single injection. Every early morning. You are doing something extraordinary." Make it bold, warm, and warrior-like.',
  },
  nurturing: {
    overall: 'warm, gentle, held, comforting — make her feel loved and safe',
    quote: "TODAY'S LIGHT — warm, gentle, held, comforting",
    anthem: "TODAY'S MELODY — soft, warm, soothing",
    affirmation: 'YOU ARE HELD — gentle reassurance, soft first person',
    journal: 'YOUR HEART — gentle reflective prompt about feelings and self compassion',
    gratitude: "TODAY'S GRATITUDE — soft and tender",
    breathing: 'BREATHE GENTLY — slow, soft, calming',
    friendNote: 'Write as a warm, loving best friend. Example tone: "You are so loved. Every step of this journey, every hard moment. I am holding your hand." Make it gentle, tender, and full of love.',
  },
  calm: {
    overall: 'grounded, peaceful, present — make her feel centred and still',
    quote: "TODAY'S STILLNESS — grounded, peaceful, present",
    anthem: "TODAY'S SOUNDTRACK — ambient, meditative",
    affirmation: 'YOUR GROUND — centred, rooted, peaceful first person',
    journal: 'YOUR STILLNESS — quiet reflective prompt about presence and acceptance',
    gratitude: "TODAY'S GRATITUDE — simple and grounded",
    breathing: 'FIND YOUR BREATH — slow, meditative',
    friendNote: 'Write as a calm, reassuring best friend. Example tone: "You are exactly where you need to be. Breathe. I am with you." Make it grounded, still, and peaceful.',
  },
  lighthearted: {
    overall: 'joyful, fun, uplifting — make her smile or laugh',
    quote: "TODAY'S SUNSHINE — joyful, fun, uplifting, makes her smile",
    anthem: "TODAY'S BANGER — fun, danceable, energy",
    affirmation: 'YOUR JOY — playful, fun, light first person declaration',
    journal: 'YOUR SMILE — light fun reflective prompt that makes her laugh or smile',
    gratitude: "TODAY'S GRATITUDE — joyful and fun",
    breathing: 'SUNSHINE BREATH — light and energising',
    friendNote: 'Write as a funny, hyped-up best friend. Example tone: "Day 5, you are absolutely killing it. Honestly. Someone get this woman a trophy." Make it funny, warm, and celebratory — reference the specific day number.',
  },
  spiritual: {
    overall: 'faith-led, hopeful, sacred — make her feel guided and blessed',
    quote: "TODAY'S BLESSING — faith-led, hopeful, sacred",
    anthem: "TODAY'S HYMN — soulful, devotional, uplifting",
    affirmation: 'YOUR GRACE — faithful, hopeful, sacred first person',
    journal: 'YOUR SOUL — spiritual reflective prompt about faith and trust',
    gratitude: "TODAY'S GRATITUDE — reverent and hopeful",
    breathing: 'SACRED BREATH — gentle, prayerful',
    friendNote: 'Write as a faith-filled, spiritual best friend. Example tone: "You are being guided, [name]. Every step of this path has purpose. I believe in you completely." Make it sacred, hopeful, and full of faith — use her name.',
  },
}

function getSystemPrompt(vibe) {
  const tone = VIBE_TONES[vibe]
  if (!tone) return BASE_SYSTEM_PROMPT
  return `${BASE_SYSTEM_PROMPT}

The user's vibe is "${vibe}". Generate ALL content in the following tone: ${tone.overall}.

Content labels and their tone:
- Quote: ${tone.quote}
- Song: ${tone.anthem}
- Affirmation: ${tone.affirmation}
- Journal prompt: ${tone.journal}
- Gratitude prompt: ${tone.gratitude}
- Breathing exercise: ${tone.breathing}

Friend note from her person: ${tone.friendNote}

Every single piece of content must feel cohesive and emotionally consistent with the ${vibe} tone. A Fierce user should feel like a warrior reading her content. A Nurturing user should feel held and loved. A Calm user should feel grounded and peaceful. A Lighthearted user should smile or laugh. A Spiritual user should feel guided and blessed.`
}

const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese'
}

// Emotion-based sub-phases — NEVER reference medical milestones (retrieval, transfer, etc.)
// because cycles can be extended or shortened. Describe how she might FEEL, not where she is medically.
const TREATMENT_PHASES = {
  // IVF / ICSI: body is working hard, injections, physical discomfort, then waiting
  ivf: [
    { until: 0.15, phase: 'beginning', tone: 'brave and new. She\'s just starting something that takes real courage. Her body is adjusting to a lot. Content should honour that first step and validate any nerves or discomfort. "Your body is learning something new."' },
    { until: 0.40, phase: 'enduring', tone: 'steady and physical. Her body is doing hard work day after day. She may feel bloated, tired, emotional. Content should acknowledge the physical reality without dwelling on it. "You are showing up even when it\'s uncomfortable." Focus on small daily strength, not the finish line.' },
    { until: 0.60, phase: 'deepening', tone: 'reflective and patient. She\'s been at this for a while. The routine may feel heavy. Content should help her stay present — today is enough. Deeper journal prompts. "You don\'t need to know what comes next. Just be here."' },
    { until: 0.80, phase: 'waiting', tone: 'gentle and validating. She may be anxious, reading into every feeling. Content should soothe without false promises. "Whatever you\'re feeling right now is valid." Avoid toxic positivity. Acknowledge that uncertainty is the hardest part.' },
    { until: 1.0, phase: 'closing', tone: 'tender and proud. The end of this chapter is near. Content should honour everything she\'s been through — every injection, every early morning, every hard day. "Whatever happens next, you did something extraordinary." Open-ended, not outcome-focused.' },
  ],
  icsi: null, // same as IVF
  // IUI: gentler process, shorter, but still emotionally charged
  iui: [
    { until: 0.20, phase: 'beginning', tone: 'hopeful and gentle. A new cycle is beginning. Content should feel like a fresh page. "You chose to try again, and that takes strength."' },
    { until: 0.50, phase: 'building', tone: 'patient and steady. Monitoring, adjusting, waiting for the right moment. Content should keep her grounded in the present. "Trust the process, even when it feels slow."' },
    { until: 0.75, phase: 'waiting', tone: 'tender and honest. The wait after the procedure is emotionally heavy. Every sensation feels meaningful. "You don\'t have to be positive every second. Just be gentle with yourself."' },
    { until: 1.0, phase: 'closing', tone: 'reflective and compassionate. Whatever the outcome, she showed up. "You gave this everything. That is never wasted."' },
  ],
  // Egg freezing: empowering choice, physical intensity, then relief
  'egg-freezing': [
    { until: 0.15, phase: 'beginning', tone: 'empowered and purposeful. She made a proactive choice about her future. Content should reinforce that agency. "This is you taking care of future you."' },
    { until: 0.55, phase: 'enduring', tone: 'physically demanding but purposeful. Daily injections, monitoring, bloating. Content should acknowledge the discomfort while connecting it back to why she\'s doing this. "Your body is working hard. Honour it."' },
    { until: 0.85, phase: 'almost-there', tone: 'anticipatory and encouraging. The end is approaching. She may feel anxious or excited. "You\'re almost through this. Breathe."' },
    { until: 1.0, phase: 'closing', tone: 'proud and relieved. It\'s done or nearly done. Content should celebrate her strength and the gift she gave her future self. "You did something brave. Rest now."' },
  ],
  // Egg donation: similar to egg freezing but for someone else
  'egg-donation': null, // same as egg-freezing
  // FET: less physically intense, but emotionally charged with hope
  fet: [
    { until: 0.30, phase: 'preparing', tone: 'quiet and hopeful. Her body is being gently prepared. Content should feel calm and anticipatory. "Your body knows what to do. Trust it."' },
    { until: 0.55, phase: 'building', tone: 'steady and present. She\'s in the middle of preparation. Content should help her stay grounded rather than jumping ahead. "Today is enough."' },
    { until: 0.75, phase: 'waiting', tone: 'the hardest emotional stretch. Uncertainty is at its peak. Content should validate without promising. "Whatever you\'re feeling right now — it\'s okay. All of it."' },
    { until: 1.0, phase: 'closing', tone: 'tender and open. The cycle is ending. Content should honour the courage of hope. "You trusted the process. That takes extraordinary strength."' },
  ],
  // Embryo transfer: short, focused, high emotional stakes
  'embryo-transfer': null, // same as FET
  // Medicated cycle: variable, generally moderate intensity
  'medicated-cycle': [
    { until: 0.25, phase: 'beginning', tone: 'settling in. New medications, new routine. "Your body is adjusting. Give it grace."' },
    { until: 0.55, phase: 'steady', tone: 'routine building. Content should acknowledge the daily discipline. "Showing up every day is its own kind of strength."' },
    { until: 0.80, phase: 'waiting', tone: 'patient and gentle. "The hardest part is the not knowing. You don\'t have to be okay with it — just breathe through it."' },
    { until: 1.0, phase: 'closing', tone: 'reflective. "However this chapter ends, you showed up for every page."' },
  ],
  // Surrogacy: intended parent\'s emotional journey — hope, trust, loss of control
  surrogacy: [
    { until: 0.20, phase: 'beginning', tone: 'hopeful and trusting. She\'s entrusting her dream to someone else. Content should validate the mix of hope and vulnerability. "Letting go of control is its own kind of courage."' },
    { until: 0.50, phase: 'middle', tone: 'patient and connected. The journey is happening but she\'s not in the driver\'s seat. Content should help her feel connected to the process. "You are part of this, even from a distance."' },
    { until: 0.80, phase: 'waiting', tone: 'tender and hopeful. "Trust is not passive. It takes enormous strength to believe when you can\'t see."' },
    { until: 1.0, phase: 'closing', tone: 'grateful and proud. "This journey asked you to trust in ways most people never have to. You did."' },
  ],
  // Preparing: pre-cycle, getting ready mentally and physically
  preparing: [
    { until: 0.30, phase: 'beginning', tone: 'anticipatory and grounding. She\'s getting ready for something big. "This quiet time matters. You are building your foundation."' },
    { until: 0.65, phase: 'building', tone: 'steady and purposeful. "Every small step now is setting you up. You\'re already on your way."' },
    { until: 1.0, phase: 'ready', tone: 'confident and calm. "You\'ve done the preparation. You are as ready as you need to be."' },
  ],
}

function getCyclePhase(dayNumber, totalDays, treatment) {
  const progress = dayNumber / totalDays
  // Look up treatment-specific phases
  let phases = TREATMENT_PHASES[treatment]
  // Some treatments share phases with others
  if (phases === null) {
    if (treatment === 'icsi') phases = TREATMENT_PHASES.ivf
    else if (treatment === 'egg-donation') phases = TREATMENT_PHASES['egg-freezing']
    else if (treatment === 'embryo-transfer') phases = TREATMENT_PHASES.fet
  }
  // If we have treatment-specific phases, use them
  if (phases) {
    for (const p of phases) {
      if (progress <= p.until) return { phase: p.phase, tone: p.tone }
    }
    return { phase: phases[phases.length - 1].phase, tone: phases[phases.length - 1].tone }
  }
  // Generic fallback for unknown treatments
  if (progress <= 0.15) return { phase: 'beginning', tone: 'hopeful, energetic, fresh start energy. She\'s just starting — content should feel like opening a new chapter. Be encouraging without being naive about the difficulty.' }
  if (progress <= 0.35) return { phase: 'early', tone: 'building momentum, settling in. Showing up repeatedly takes real effort. Be warm but honest.' }
  if (progress <= 0.55) return { phase: 'middle', tone: 'grounding, patient, steady. Help the user stay present rather than looking ahead. Focus on today, not the outcome.' }
  if (progress <= 0.75) return { phase: 'late', tone: 'calming, reassuring, gentle. She may be anxious about what comes next. Soothe and validate without toxic positivity.' }
  return { phase: 'final', tone: 'celebratory but tender. Honour everything she\'s been through. Reflective, meaningful, open to whatever comes next.' }
}

function buildUserPrompt({ name, treatment, dayNumber, totalDays, vibe, genres, language, dietaryPrefs }) {
  const lang = LANGUAGE_NAMES[language] || 'English'
  const langInstruction = language && language !== 'en'
    ? `\n\nIMPORTANT: Generate ALL content in ${lang}. The quote, affirmation, journal prompt, gratitude prompt, breathing lines, and song recommendation should all be in ${lang}. For song recommendations, prefer songs in ${lang} or that are popular in ${lang}-speaking countries, but you may also suggest well-known English songs if they fit the vibe.`
    : ''
  const dietaryNote = dietaryPrefs && dietaryPrefs.length > 0 && !dietaryPrefs.includes('none')
    ? `IMPORTANT dietary restrictions: ${dietaryPrefs.join(', ')}. NEVER suggest foods that conflict with these. `
    : ''
  const { phase, tone: phaseTone } = getCyclePhase(dayNumber, totalDays, treatment)
  return `Generate today's content for ${name} who is on Day ${dayNumber} of ${totalDays} of their ${treatment} cycle. Their vibe is ${vibe}. Their music preferences are ${genres.join(', ')}.

CYCLE PHASE: ${phase} (day ${dayNumber}/${totalDays}). Emotional tone for this phase: ${phaseTone}

Generate:
1) A powerful quote relevant to her specific day and treatment — use varied quotes from diverse women including Frida Kahlo, Maya Angelou, Rupi Kaur, Brené Brown, Gloria Anzaldúa, Michelle Obama and others — never the same quote twice across the cycle.
2) A song recommendation matching her music genres and vibe — vary across all ${totalDays} days never repeat the same song.
3) An affirmation in first person starting with "I am" or "I have" that reflects what day she is on — Day 1 feels different to Day 8 so make it specific.
4) A journal prompt specific to what she might be feeling on this exact day of fertility treatment — not generic wellness prompts.
5) A gratitude prompt that is short and gentle.
6) A breathing exercise opening line using her name, warm and specific to her day.
7) A breathing exercise closing line using her name, different from the opening.
8) A friend note — a short warm personal message (2-3 sentences) written as if from her closest person, using her name and referencing Day ${dayNumber}. Match the vibe tone exactly.
9) 2-3 high-protein food suggestions — easy, inspiring meals or snacks. For each item provide: name, a single food emoji, and approximate protein per serving (e.g. "~20g"). ${dietaryNote}Vary across the cycle. Frame as inspiration, not medical advice.

Return the response as a JSON object with keys: quote, quote_author, song_title, song_artist, song_spotify_search, affirmation, journal_prompt, gratitude_prompt, breathing_opening, breathing_closing, friend_note, fuel_items (array of objects with name, emoji, protein).

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

// --- Auth endpoints ---

app.post('/api/register', async (req, res) => {
  const { email, password, profileId } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const existing = getAccountByEmail(email)
  if (existing) return res.status(409).json({ error: 'Account already exists' })

  const passwordHash = await bcrypt.hash(password, 10)
  const account = createAccount(email, passwordHash, profileId || null)
  res.json({ success: true, accountId: account.id, email })
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const account = getAccountByEmail(email)
  if (!account) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, account.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  // Load profile if linked
  let profile = null
  if (account.profile_id) {
    profile = getProfile(account.profile_id)
  }

  res.json({ success: true, accountId: account.id, email: account.email, profile })
})

app.post('/api/link-profile', (req, res) => {
  const { email, profileId } = req.body
  if (!email || !profileId) return res.status(400).json({ error: 'Email and profileId required' })
  linkProfileToAccount(email, profileId)
  res.json({ success: true })
})

// --- Stripe payment endpoints ---

const PLAN_AMOUNTS = { one_cycle: 999, gift: 999 }

app.post('/api/create-payment-intent', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' })

  const { plan, userId, email } = req.body
  const amount = PLAN_AMOUNTS[plan]
  if (!amount) return res.status(400).json({ error: 'Invalid plan. Must be one_cycle or gift.' })

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      metadata: { user_id: userId || 'unknown', plan, email: email || '' },
    })
    console.log(`[Stripe] Created PaymentIntent ${paymentIntent.id} for plan=${plan}, amount=${amount}`)
    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[Stripe] PaymentIntent creation failed:', err.message)
    res.status(500).json({ error: 'Payment setup failed. Please try again.' })
  }
})

app.get('/api/stripe/config', (_, res) => {
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY || '' })
})

app.post('/api/purchase/confirm', (req, res) => {
  const { stripePaymentId, plan, userId, email } = req.body
  if (!stripePaymentId || !plan || !email) return res.status(400).json({ error: 'Missing required fields' })

  const existing = getPurchaseByStripeId(stripePaymentId)
  if (!existing) {
    savePurchase({
      userId: userId || 'unknown',
      plan,
      stripePaymentId,
      amount: PLAN_AMOUNTS[plan] || 0,
      currency: 'gbp',
    })
  }
  updateAccountPlan(email, plan)
  console.log(`[Purchase] Confirmed plan=${plan} for ${email}, stripe_id=${stripePaymentId}`)
  res.json({ success: true })
})

// --- Content generation endpoint ---

app.post('/api/generate-day', async (req, res) => {
  const { name, treatment, dayNumber, totalDays, vibe, genres, userId, cycleId, language, dietaryPrefs } = req.body
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
        system: getSystemPrompt(vibe),
        messages: [{
          role: 'user',
          content: buildUserPrompt({ name, treatment, dayNumber, totalDays, vibe, genres, language, dietaryPrefs }),
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
        friendNote: raw.friend_note || raw.friendNote || null,
        fuelItems: raw.fuel_items || raw.fuelItems || null,
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

app.post('/api/mood', (req, res) => {
  const { userId, dayNumber, mood } = req.body
  if (!userId || !dayNumber) return res.status(400).json({ error: 'Missing userId or dayNumber' })
  try {
    saveMood(userId, dayNumber, mood || null)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/favorite', (req, res) => {
  const { userId, dayNumber, type, content, author } = req.body
  if (!userId || !dayNumber || !type) return res.status(400).json({ error: 'Missing fields' })
  try {
    saveFavorite(userId, dayNumber, type, content || null, author)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/day-complete', (req, res) => {
  const { userId, dayNumber, completed } = req.body
  if (!userId || !dayNumber) return res.status(400).json({ error: 'Missing fields' })
  try {
    saveDayCompletion(userId, dayNumber, completed !== false)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/event', (req, res) => {
  const { userId, event, data } = req.body
  if (!userId || !event) return res.status(400).json({ error: 'Missing fields' })
  try {
    logEvent(userId, event, data)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/admin/favorites', (_, res) => {
  const rows = db.prepare('SELECT * FROM favorites ORDER BY saved_at DESC').all()
  res.json(rows)
})

app.get('/api/admin/completions', (_, res) => {
  const rows = db.prepare('SELECT * FROM day_completions ORDER BY user_id, day_number').all()
  res.json(rows)
})

app.get('/api/admin/events', (_, res) => {
  const rows = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 200').all()
  res.json(rows)
})

app.get('/api/admin/accounts', (_, res) => {
  const rows = db.prepare('SELECT id, email, profile_id, plan, created_at FROM accounts ORDER BY created_at DESC').all()
  res.json(rows)
})

app.get('/api/admin/moods', (_, res) => {
  const rows = db.prepare('SELECT * FROM moods ORDER BY user_id, day_number').all()
  res.json(rows)
})

app.get('/api/admin/stats', (_, res) => {
  const profiles = db.prepare('SELECT COUNT(*) as count FROM profiles').get().count
  const accounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count
  const content = db.prepare('SELECT COUNT(*) as count FROM daily_content').get().count
  const journals = db.prepare('SELECT COUNT(*) as count FROM journal_entries').get().count
  const moods = db.prepare('SELECT COUNT(*) as count FROM moods').get().count
  const favorites = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count
  const completions = db.prepare('SELECT COUNT(*) as count FROM day_completions').get().count
  const events = db.prepare('SELECT COUNT(*) as count FROM events').get().count
  const spotifyTaps = db.prepare("SELECT COUNT(*) as count FROM events WHERE event = 'spotify_tap'").get().count
  res.json({ profiles, accounts, content, journals, moods, favorites, completions, events, spotifyTaps })
})

// --- Spotify integration ---

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || ''

if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_ID !== 'your-spotify-client-id') {
  console.log('[OK] SPOTIFY_CLIENT_ID is set')
} else {
  console.warn('[WARNING] SPOTIFY_CLIENT_ID is not set or is still the placeholder. Spotify OAuth will not work. Go to developer.spotify.com, create an app called "Cycle", and set the Client ID in your .env file.')
}
if (!SPOTIFY_REDIRECT_URI) {
  console.warn('[WARNING] SPOTIFY_REDIRECT_URI is not set. Spotify OAuth callbacks will fail.')
}

// Exchange authorization code for tokens (PKCE flow — no client secret needed)
app.post('/api/spotify/exchange', async (req, res) => {
  const { code, codeVerifier, redirectUri, userId } = req.body
  if (!code || !codeVerifier || !userId) {
    return res.status(400).json({ error: 'Missing code, codeVerifier, or userId' })
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri || SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: codeVerifier,
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) {
      console.error('[Spotify] Token exchange error:', tokenData)
      return res.status(400).json({ error: tokenData.error_description || tokenData.error })
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Fetch Spotify user profile
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    saveSpotifyTokens(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiry: expiresAt,
      spotifyUserId: profile.id || null,
      spotifyDisplayName: profile.display_name || profile.id || null,
    })

    console.log(`[Spotify] Connected for user ${userId} (${profile.display_name})`)
    res.json({
      success: true,
      spotifyUserId: profile.id,
      spotifyDisplayName: profile.display_name || profile.id,
    })
  } catch (err) {
    console.error('[Spotify] Exchange error:', err.message)
    res.status(500).json({ error: 'Token exchange failed' })
  }
})

// Refresh expired access token
app.post('/api/spotify/refresh', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  const tokens = getSpotifyTokens(userId)
  if (!tokens) return res.status(404).json({ error: 'No Spotify connection found' })

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) {
      console.error('[Spotify] Refresh error:', tokenData)
      return res.status(400).json({ error: tokenData.error_description || tokenData.error })
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    saveSpotifyTokens(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || tokens.refreshToken,
      tokenExpiry: expiresAt,
      spotifyUserId: tokens.spotifyUserId,
      spotifyDisplayName: tokens.spotifyDisplayName,
    })

    res.json({ success: true, accessToken: tokenData.access_token, tokenExpiry: expiresAt })
  } catch (err) {
    console.error('[Spotify] Refresh error:', err.message)
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

// Search for a track on Spotify
app.post('/api/spotify/search', async (req, res) => {
  const { userId, query } = req.body
  if (!userId || !query) return res.status(400).json({ error: 'Missing userId or query' })

  let tokens = getSpotifyTokens(userId)
  if (!tokens) return res.status(404).json({ error: 'No Spotify connection' })

  // Auto-refresh if expired
  if (new Date(tokens.tokenExpiry) <= new Date()) {
    try {
      const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: SPOTIFY_CLIENT_ID,
        }),
      })
      const refreshData = await refreshRes.json()
      if (refreshData.access_token) {
        const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        saveSpotifyTokens(userId, {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token || tokens.refreshToken,
          tokenExpiry: expiresAt,
          spotifyUserId: tokens.spotifyUserId,
          spotifyDisplayName: tokens.spotifyDisplayName,
        })
        tokens = { ...tokens, accessToken: refreshData.access_token }
      }
    } catch (err) {
      console.error('[Spotify] Auto-refresh failed:', err.message)
    }
  }

  try {
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    )
    const searchData = await searchRes.json()
    const track = searchData.tracks?.items?.[0]

    if (track) {
      res.json({
        found: true,
        trackId: track.id,
        trackUri: track.uri,
        trackUrl: track.external_urls?.spotify,
        trackName: track.name,
        trackArtist: track.artists?.map(a => a.name).join(', '),
      })
    } else {
      res.json({ found: false })
    }
  } catch (err) {
    console.error('[Spotify] Search error:', err.message)
    res.status(500).json({ error: 'Search failed' })
  }
})

// Get Spotify connection status
app.get('/api/spotify/status/:userId', (req, res) => {
  const tokens = getSpotifyTokens(req.params.userId)
  if (!tokens) return res.json({ connected: false })
  res.json({
    connected: true,
    spotifyUserId: tokens.spotifyUserId,
    spotifyDisplayName: tokens.spotifyDisplayName,
  })
})

// Disconnect Spotify
app.post('/api/spotify/disconnect', (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })
  deleteSpotifyTokens(userId)
  console.log(`[Spotify] Disconnected for user ${userId}`)
  res.json({ success: true })
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
