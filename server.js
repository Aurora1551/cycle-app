const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

let Anthropic
try {
  Anthropic = require('@anthropic-ai/sdk')
} catch (e) {
  console.warn('Anthropic SDK not found, content generation will use fallback')
}

const FALLBACK = {
  fierce: {
    quote: 'She believed she could, so she did.',
    quoteAuthor: 'R.S. Grey',
    songTitle: 'Bichota',
    songArtist: 'Karol G',
    journalPrompt: 'What does choosing this path say about your strength?',
    affirmation: 'I am doing something extraordinary for my future self.',
    gratitudePrompt: 'Name three things about your body you are grateful for today.',
    breathingOpening: 'Take a moment just for you.',
    breathingClosing: "You've got this, warrior.",
  },
  nurturing: {
    quote: 'Be gentle with yourself — you are a child of the universe.',
    quoteAuthor: 'Max Ehrmann',
    songTitle: 'Golden Hour',
    songArtist: 'JVKE',
    journalPrompt: 'What feels tender today, and how can you hold that gently?',
    affirmation: 'I am held, I am loved, I am exactly where I need to be.',
    gratitudePrompt: 'What small act of kindness has someone shown you recently?',
    breathingOpening: 'Let yourself be held right now.',
    breathingClosing: 'You are so deeply loved.',
  },
  calm: {
    quote: 'You are the sky. Everything else is just the weather.',
    quoteAuthor: 'Pema Chödrön',
    songTitle: 'Weightless',
    songArtist: 'Marconi Union',
    journalPrompt: 'What would it feel like to fully surrender to today?',
    affirmation: 'I breathe in peace and release what I cannot control.',
    gratitudePrompt: 'What moment of stillness have you found today?',
    breathingOpening: 'Be still and breathe deeply.',
    breathingClosing: 'Peace lives inside you always.',
  },
  lighthearted: {
    quote: 'Keep your face always toward the sunshine.',
    quoteAuthor: 'Walt Whitman',
    songTitle: 'Happy',
    songArtist: 'Pharrell Williams',
    journalPrompt: 'What made you smile or laugh recently, and why?',
    affirmation: 'Joy is my birthright and I welcome it in fully.',
    gratitudePrompt: 'What genuinely delighted you today?',
    breathingOpening: 'Smile and breathe with me.',
    breathingClosing: 'Your light is absolutely radiant.',
  },
  spiritual: {
    quote: 'For I know the plans I have for you.',
    quoteAuthor: 'Jeremiah 29:11',
    songTitle: 'Way Maker',
    songArtist: 'Sinach',
    journalPrompt: 'How have you felt held or guided today, even in small ways?',
    affirmation: 'I trust the journey my soul has chosen.',
    gratitudePrompt: 'What grace or blessing have you noticed today?',
    breathingOpening: 'Centre your spirit right here.',
    breathingClosing: 'Your faith carries you forward.',
  },
}

app.post('/api/generate-day', async (req, res) => {
  const { name, treatment, dayNumber, totalDays, vibe, genres } = req.body

  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY
  if (!Anthropic || !anthropicKey) {
    return res.json(FALLBACK[vibe] || FALLBACK.fierce)
  }

  try {
    const anthropic = new Anthropic.default({
      apiKey: anthropicKey,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    })

    const prompt = `You are a compassionate daily companion app for someone going through fertility treatment.

Generate personalized daily content for:
- Name: ${name}
- Treatment: ${treatment}
- Day: ${dayNumber} of ${totalDays}
- Emotional vibe: ${vibe}
- Music taste: ${genres.join(', ')}

Return ONLY a valid JSON object with these exact fields:
{
  "quote": "an inspiring quote relevant to their journey (NOT a Bible verse unless vibe is spiritual)",
  "quoteAuthor": "the author's name",
  "songTitle": "a real song title matching their music taste and vibe",
  "songArtist": "the real artist name",
  "journalPrompt": "a gentle, specific reflective question for day ${dayNumber} (not generic)",
  "affirmation": "a powerful present-tense affirmation for this stage of their treatment",
  "gratitudePrompt": "a specific gratitude prompt related to their body or this process",
  "breathingOpening": "a warm, personal one-sentence opening line for a breathing exercise using their name and/or day number (e.g. '${name}, take a moment just for you.' or 'Day ${dayNumber}, ${name} — breathe before anything else.')",
  "breathingClosing": "a warm, personal one-sentence closing line after the breathing exercise, different from the opening (e.g. 'You've got this, ${name}.' or 'That strength is all yours, ${name}.')"
}

Tailor everything to day ${dayNumber} of ${totalDays} — early days feel hopeful, middle days feel grounding, later days feel triumphant.
For ${vibe} vibe: fierce=bold/powerful, nurturing=warm/gentle, calm=peaceful/still, lighthearted=joyful/playful, spiritual=faith/hope.
The song MUST match their music taste: ${genres.join(', ')}.
Return ONLY the JSON, no other text.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const content = JSON.parse(jsonMatch[0])
    res.json(content)
  } catch (err) {
    console.error('Claude error:', err.message)
    res.json(FALLBACK[vibe] || FALLBACK.fierce)
  }
})

app.get('/api/health', (_, res) => res.json({ ok: true }))

const PORT = 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`)
})
