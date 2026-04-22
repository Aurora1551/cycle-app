export const TREATMENT_LABELS: Record<string, string> = {
  ivf: 'IVF',
  icsi: 'ICSI',
  iui: 'IUI',
  pgt: 'PGT (genetic testing)',
  'embryo-transfer': 'Embryo Transfer',
  fet: 'Frozen Embryo Transfer',
  'egg-freezing': 'Egg Freezing',
  'egg-donation': 'Egg Donation',
  'medicated-cycle': 'Medication cycle',
  surrogacy: 'Surrogacy',
  preparing: 'Preparing',
  other: 'Other',
}

export const TREATMENT_EMOJIS: Record<string, string> = {
  ivf: '💫',
  icsi: '🔬',
  iui: '🌱',
  pgt: '🧬',
  'embryo-transfer': '🌟',
  fet: '❄️',
  'egg-freezing': '🥚',
  'egg-donation': '🤝',
  'medicated-cycle': '💊',
  surrogacy: '💞',
  preparing: '🌿',
  other: '✨',
}

export const ALL_COMPONENTS = [
  { id: 'quote', emoji: '💬', label: 'Quote' },
  { id: 'anthem', emoji: '🎵', label: 'Anthem' },
  { id: 'affirmation', emoji: '🌟', label: 'Affirmation' },
  { id: 'journal', emoji: '✍️', label: 'Journal' },
  { id: 'gratitude', emoji: '🙏', label: 'Gratitude' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation' },
  { id: 'breathing', emoji: '🌬️', label: 'Breathing' },
  { id: 'fuel', emoji: '🍳', label: 'Your Fuel' },
]

export const COMPONENT_ORDER = ['quote', 'anthem', 'affirmation', 'journal', 'gratitude', 'meditation', 'breathing', 'fuel']

// Default cycle length per treatment type (days). User can override in onboarding or Settings.
export const TREATMENT_DEFAULTS: Record<string, number> = {
  ivf: 18, icsi: 18, iui: 28, pgt: 18, 'embryo-transfer': 18, fet: 18,
  'egg-freezing': 14, 'egg-donation': 14, 'medicated-cycle': 21, surrogacy: 28, preparing: 14,
}

export const NOTIFICATION_TIMES = [
  '06:00', '07:00', '07:30', '08:00', '08:30',
  '09:00', '10:00', '12:00', '19:00', '20:00', '21:00',
]

// Vibe-specific content: labels, tones, splash copy, friend notes, day headers
// Labels include emoji prefix — the glowing accent dot (✦) is rendered by the UI component
export const VIBE_CONTENT: Record<string, {
  splash: { tagline: string; subtitle: string }
  dayHeader: { tagline: string; title: string; subtitle: string }
  labels: { quote: { emoji: string; text: string }; anthem: { emoji: string; text: string }; affirmation: { emoji: string; text: string }; journal: { emoji: string; text: string }; gratitude: { emoji: string; text: string }; breathing: { emoji: string; text: string }; fuel: { emoji: string; text: string } }
  tones: { quote: string; anthem: string; affirmation: string; journal: string; gratitude: string; breathing: string; fuel: string }
  friendNote: { emoji: string; heading: string; text: string }
}> = {
  fierce: {
    splash: { tagline: 'DAY BY DAY, FIRE BY FIRE', subtitle: 'Your daily strength companion' },
    dayHeader: { tagline: 'DAY BY DAY, FIRE BY FIRE', title: "I've Got This", subtitle: 'Your daily strength companion' },
    labels: {
      quote: { emoji: '🔥', text: "TODAY'S FIRE" },
      anthem: { emoji: '🎵', text: "TODAY'S ANTHEM" },
      affirmation: { emoji: '⚡', text: 'YOUR POWER' },
      journal: { emoji: '✍️', text: 'YOUR TRUTH' },
      gratitude: { emoji: '💛', text: "TODAY'S GRATITUDE" },
      breathing: { emoji: '✨', text: 'YOUR MOMENT' },
      fuel: { emoji: '🍳', text: 'YOUR FUEL' },
    },
    tones: { quote: 'bold, fierce, warrior energy, make her feel unstoppable', anthem: 'powerful, pump-up energy', affirmation: 'fierce first-person declaration of strength', journal: 'bold reflective prompt about courage and strength', gratitude: 'strong and proud not soft', breathing: 'energising breath', fuel: 'powerful, energising protein-rich foods to fuel her warrior body' },
    friendNote: { emoji: '💛', heading: 'A NOTE FOR YOU', text: 'I am so proud of you. Every single injection. Every early morning. You are doing something extraordinary.' },
  },
  nurturing: {
    splash: { tagline: 'DAY BY DAY, HELD BY LOVE', subtitle: 'Your daily warmth companion · here for every step' },
    dayHeader: { tagline: 'DAY BY DAY, HELD BY LOVE', title: "I Am Loved", subtitle: 'Your daily warmth companion' },
    labels: {
      quote: { emoji: '🌸', text: "TODAY'S LIGHT" },
      anthem: { emoji: '🎵', text: "TODAY'S MELODY" },
      affirmation: { emoji: '🤍', text: 'YOU ARE HELD' },
      journal: { emoji: '✍️', text: 'YOUR HEART' },
      gratitude: { emoji: '💛', text: "TODAY'S GRATITUDE" },
      breathing: { emoji: '✨', text: 'YOUR MOMENT' },
      fuel: { emoji: '🍳', text: 'YOUR NOURISHMENT' },
    },
    tones: { quote: 'warm, gentle, held, comforting', anthem: 'soft, warm, soothing', affirmation: 'gentle reassurance, soft first person', journal: 'gentle reflective prompt about feelings and self compassion', gratitude: 'soft and tender', breathing: 'slow, soft, calming', fuel: 'warm, nourishing comfort foods with plenty of protein to support her body' },
    friendNote: { emoji: '🌸', heading: 'A NOTE FOR YOU', text: 'You are so loved. Every step of this journey, every hard moment. I am holding your hand.' },
  },
  calm: {
    splash: { tagline: 'DAY BY DAY, BREATH BY BREATH', subtitle: 'Your daily stillness companion · grounded and present' },
    dayHeader: { tagline: 'DAY BY DAY, BREATH BY BREATH', title: "I Am At Peace", subtitle: 'Your daily stillness companion' },
    labels: {
      quote: { emoji: '🌊', text: "TODAY'S STILLNESS" },
      anthem: { emoji: '🎵', text: "TODAY'S SOUNDTRACK" },
      affirmation: { emoji: '🍃', text: 'YOUR GROUND' },
      journal: { emoji: '✍️', text: 'YOUR PRESENCE' },
      gratitude: { emoji: '💛', text: "TODAY'S GRATITUDE" },
      breathing: { emoji: '✨', text: 'YOUR MOMENT' },
      fuel: { emoji: '🍳', text: 'YOUR FUEL' },
    },
    tones: { quote: 'grounded, peaceful, present', anthem: 'ambient, meditative', affirmation: 'centred, rooted, peaceful first person', journal: 'quiet reflective prompt about presence and acceptance', gratitude: 'simple and grounded', breathing: 'slow, meditative', fuel: 'simple, grounding whole foods with clean protein to keep her centred' },
    friendNote: { emoji: '🌊', heading: 'A NOTE FOR YOU', text: 'You are exactly where you need to be. Breathe. I am with you.' },
  },
  lighthearted: {
    splash: { tagline: 'DAY BY DAY, JOY BY JOY', subtitle: 'Your daily sunshine companion · you\'ve got this' },
    dayHeader: { tagline: 'DAY BY DAY, JOY BY JOY', title: "I'm Shining ☀️", subtitle: 'Your daily sunshine companion' },
    labels: {
      quote: { emoji: '☀️', text: "TODAY'S SUNSHINE" },
      anthem: { emoji: '🎵', text: "TODAY'S BANGER" },
      affirmation: { emoji: '✨', text: 'YOUR JOY' },
      journal: { emoji: '✍️', text: 'YOUR SMILE' },
      gratitude: { emoji: '💛', text: "TODAY'S GRATITUDE" },
      breathing: { emoji: '✨', text: 'YOUR MOMENT' },
      fuel: { emoji: '🍳', text: 'YOUR FUEL' },
    },
    tones: { quote: 'joyful, fun, uplifting, makes her smile', anthem: 'fun, danceable, energy', affirmation: 'playful, fun, light first person declaration', journal: 'light fun reflective prompt that makes her laugh or smile', gratitude: 'joyful and fun', breathing: 'light and energising', fuel: 'fun, colourful, easy-to-make high-protein meals and snacks she will actually enjoy' },
    friendNote: { emoji: '☀️', heading: 'A NOTE FOR YOU', text: 'Day [X], you are absolutely killing it. Honestly. Someone get this woman a trophy.' },
  },
  spiritual: {
    splash: { tagline: 'DAY BY DAY, GUIDED BY FAITH', subtitle: 'Your daily soul companion · trust the journey' },
    dayHeader: { tagline: 'DAY BY DAY, GUIDED BY FAITH', title: 'I Am Blessed', subtitle: 'Your daily soul companion' },
    labels: {
      quote: { emoji: '🙏', text: "TODAY'S BLESSING" },
      anthem: { emoji: '🎵', text: "TODAY'S HYMN" },
      affirmation: { emoji: '🌟', text: 'YOUR GRACE' },
      journal: { emoji: '✍️', text: 'YOUR SOUL' },
      gratitude: { emoji: '💛', text: "TODAY'S GRATITUDE" },
      breathing: { emoji: '✨', text: 'YOUR MOMENT' },
      fuel: { emoji: '🍳', text: 'YOUR NOURISHMENT' },
    },
    tones: { quote: 'faith-led, hopeful, sacred', anthem: 'soulful, devotional, uplifting', affirmation: 'faithful, hopeful, sacred first person', journal: 'spiritual reflective prompt about faith and trust', gratitude: 'reverent and hopeful', breathing: 'gentle, prayerful', fuel: 'wholesome, blessed foods to nourish and sustain her body and spirit through treatment' },
    friendNote: { emoji: '🙏', heading: 'A NOTE FOR YOU', text: 'You are being guided, [name]. Every step of this path has purpose. I believe in you completely.' },
  },
}

export const NOTIFICATION_CONTENT = [
  { id: 'quote', label: "Today's quote" },
  { id: 'affirmation', label: "Today's affirmation" },
  { id: 'song', label: "Today's song" },
  { id: 'surprise', label: 'Surprise me daily' },
]
