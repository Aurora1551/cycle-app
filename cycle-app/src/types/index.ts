export type VibeKey = 'fierce' | 'nurturing' | 'calm' | 'lighthearted' | 'spiritual'

export interface VibeTheme {
  key: VibeKey
  label: string
  emoji: string
  tagline: string
  bg: string
  accent: string
  text: string
  muted: string
  border: string
  cardBg: string
  genres: string[]
}

export const VIBES: VibeTheme[] = [
  {
    key: 'fierce',
    label: 'Fierce',
    emoji: '🔥',
    tagline: 'Bold & unstoppable',
    bg: '#1C0F0C',
    accent: '#C4614A',
    text: '#FDF6F0',
    muted: 'rgba(253,246,240,0.45)',
    border: 'rgba(196,97,74,0.25)',
    cardBg: 'rgba(196,97,74,0.08)',
    genres: ['Latin pop', 'Hip-hop', 'R&B'],
  },
  {
    key: 'nurturing',
    label: 'Nurturing',
    emoji: '🌸',
    tagline: 'Warm & held',
    bg: '#FDF0EC',
    accent: '#E8907A',
    text: '#2A1410',
    muted: '#9B7B74',
    border: 'rgba(232,144,122,0.25)',
    cardBg: 'rgba(232,144,122,0.08)',
    genres: ['Latin ballads', 'Soul', 'Acoustic'],
  },
  {
    key: 'calm',
    label: 'Calm',
    emoji: '🌊',
    tagline: 'Grounded & still',
    bg: '#0D1F2D',
    accent: '#7FB5A0',
    text: '#EDF4F2',
    muted: 'rgba(237,244,242,0.45)',
    border: 'rgba(127,181,160,0.25)',
    cardBg: 'rgba(127,181,160,0.08)',
    genres: ['Ambient', 'Lo-fi', 'Classical'],
  },
  {
    key: 'lighthearted',
    label: 'Lighthearted',
    emoji: '😂',
    tagline: 'Funny & joyful',
    bg: '#FFFBF0',
    accent: '#F5A623',
    text: '#2A1F00',
    muted: '#9B8B5A',
    border: 'rgba(245,166,35,0.25)',
    cardBg: 'rgba(245,166,35,0.08)',
    genres: ['Salsa', 'Pop', 'Dancehall'],
  },
  {
    key: 'spiritual',
    label: 'Spiritual',
    emoji: '🙏',
    tagline: 'Faith & hope',
    bg: '#120A2A',
    accent: '#C4A8E8',
    text: '#F0EAFA',
    muted: 'rgba(240,234,250,0.45)',
    border: 'rgba(196,168,232,0.25)',
    cardBg: 'rgba(196,168,232,0.08)',
    genres: ['Gospel', 'Latin folk', 'Soul'],
  },
]

export const ALL_EXTRA_GENRES = [
  'Rock', 'Afrobeats', 'Pop', 'Reggaeton', 'Jazz',
  'Acoustic', 'Classical', 'K-pop', 'Electronic',
  'Indie', 'Country', 'Blues', 'Latin pop', 'Hip-hop',
  'R&B', 'Soul', 'Lo-fi', 'Ambient', 'Salsa', 'Dancehall',
  'Gospel', 'Latin folk', 'Latin ballads',
]

export interface OnboardingData {
  name: string
  treatment: string
  cycleDays: number
  components: string[]
  vibe: VibeKey | null
  genres: string[]
}
