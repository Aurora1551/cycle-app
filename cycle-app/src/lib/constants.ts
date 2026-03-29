export const TREATMENT_LABELS: Record<string, string> = {
  'egg-freezing': 'Egg Freezing',
  ivf: 'IVF',
  iui: 'IUI',
  'egg-donation': 'Egg Donation',
  other: 'Other',
}

export const ALL_COMPONENTS = [
  { id: 'quote', emoji: '💬', label: 'Quote' },
  { id: 'anthem', emoji: '🎵', label: 'Anthem' },
  { id: 'affirmation', emoji: '🌟', label: 'Affirmation' },
  { id: 'journal', emoji: '✍️', label: 'Journal' },
  { id: 'gratitude', emoji: '🙏', label: 'Gratitude' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation' },
  { id: 'breathing', emoji: '🌬️', label: 'Breathing' },
]

export const COMPONENT_ORDER = ['quote', 'anthem', 'affirmation', 'journal', 'gratitude', 'meditation', 'breathing']

export const NOTIFICATION_TIMES = [
  '06:00', '07:00', '07:30', '08:00', '08:30',
  '09:00', '10:00', '12:00', '19:00', '20:00', '21:00',
]

export const NOTIFICATION_CONTENT = [
  { id: 'quote', label: "Today's quote" },
  { id: 'affirmation', label: "Today's affirmation" },
  { id: 'song', label: "Today's song" },
  { id: 'surprise', label: 'Surprise me daily' },
]
