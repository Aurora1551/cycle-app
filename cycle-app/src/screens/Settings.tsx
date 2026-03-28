import React, { useState, useEffect } from 'react'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'

interface Props {
  data: OnboardingData
  dayNumber: number
  onBack: () => void
  onNotifications: () => void
  onRestartOnboarding: () => void
}

const TREATMENT_LABELS: Record<string, string> = {
  'egg-freezing': 'Egg Freezing', ivf: 'IVF', iui: 'IUI',
  'egg-donation': 'Egg Donation', other: 'Other',
}

const Settings: React.FC<Props> = ({ data, dayNumber, onBack, onNotifications, onRestartOnboarding }) => {
  const [visible, setVisible] = useState(false)
  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg)
  const textColor = isDark ? '#FDF6F0' : vibe.text
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : vibe.muted
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const row = (icon: string, label: string, value: string, onClick?: () => void) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', borderBottom: `1px solid ${cardBorder}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${vibe.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: mutedColor, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: textColor, fontFamily: "'Karla', sans-serif" }}>{value}</div>
      </div>
      {onClick && <div style={{ color: mutedColor, fontSize: 12 }}>›</div>}
    </button>
  )

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibe.bg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: mutedColor, padding: '20px 24px 0', textAlign: 'left' }}>
        ← back
      </button>

      <div style={{ padding: '20px 24px 32px', flex: 1 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 6 }}>
          Settings
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, lineHeight: 1.1, marginBottom: 20 }}>
          Your journey
        </h1>

        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
          {row('👤', 'Name', data.name)}
          {row('💊', 'Treatment', TREATMENT_LABELS[data.treatment] || data.treatment)}
          {row('📅', 'Cycle Length', `${data.cycleDays} days`)}
          {row('📍', 'Current Day', `Day ${dayNumber} of ${data.cycleDays}`)}
        </div>

        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
          {row(vibe.emoji, 'Vibe', vibe.label)}
          {row('🎵', 'Music', data.genres.slice(0, 3).join(', '))}
          {row('✨', 'Components', `${data.components.length} active`)}
        </div>

        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
          {row('🔔', 'Notifications', 'Daily reminders', onNotifications)}
          {row('🔄', 'Restart journey', 'Start a new cycle', onRestartOnboarding)}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.08em' }}>
            CYCLE · v1.0 · made with ♡
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
