import type { VibeKey, VibeTheme, VibeTypo } from '../types'
import { VIBES, VIBE_TYPO } from '../types'

const DARK_BGS = ['#1C0F0C', '#0D1F2D', '#120A2A']

export function resolveVibe(vibeKey: VibeKey | string | null): VibeTheme {
  return VIBES.find(v => v.key === vibeKey) || VIBES[0]
}

export function resolveTypo(vibeKey: VibeKey | string | null): VibeTypo {
  return VIBE_TYPO[(vibeKey as VibeKey)] || VIBE_TYPO.fierce
}

export interface ThemeColors {
  isDark: boolean
  textColor: string
  mutedColor: string
  cardBg: string
  cardBorder: string
}

export function deriveTheme(vibe: VibeTheme): ThemeColors {
  const isDark = DARK_BGS.includes(vibe.bg)
  return {
    isDark,
    textColor: isDark ? '#FDF6F0' : vibe.text,
    mutedColor: isDark ? 'rgba(253,246,240,0.6)' : vibe.muted,
    cardBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : `${vibe.accent}20`,
  }
}

export function isDarkBg(bg: string): boolean {
  return DARK_BGS.includes(bg)
}
