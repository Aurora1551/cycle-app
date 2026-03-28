import React, { useState, useEffect } from 'react'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'

interface Props {
  data: OnboardingData
  onShareWhatsApp: () => void
  onStartNewCycle: () => void
}

const TREATMENT_LABELS: Record<string, string> = {
  'egg-freezing': 'Egg Freezing', ivf: 'IVF', iui: 'IUI',
  'egg-donation': 'Egg Donation', other: 'Other',
}

const EndOfCycle: React.FC<Props> = ({ data, onShareWhatsApp, onStartNewCycle }) => {
  const [visible, setVisible] = useState(false)
  const [sparkle, setSparkle] = useState(false)
  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg)
  const textColor = isDark ? '#FDF6F0' : vibe.text
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : vibe.muted

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80)
    const t2 = setTimeout(() => setSparkle(true), 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const treatment = TREATMENT_LABELS[data.treatment] || data.treatment
  const shareText = `I just completed my ${treatment} journey with Cycle 🌸 ${data.cycleDays} days of showing up for myself. If you're going through fertility treatment, this app is for you 💛`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibe.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease' }}>
      <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
        <div style={{ fontSize: 56, transform: sparkle ? 'scale(1.1)' : 'scale(0.9)', transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {vibe.emoji}
        </div>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibe.accent }}>
          Cycle complete
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 700, color: textColor, lineHeight: 1.15, textAlign: 'center' }}>
          You did it,<br />
          <span style={{ color: vibe.accent }}>{data.name}.</span>
        </h1>

        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 16, color: mutedColor, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
          {data.cycleDays} days of showing up for yourself. That takes incredible strength.
        </p>

        <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(196,97,74,0.15)'}`, borderRadius: 16, padding: '18px', width: '100%' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor, marginBottom: 12 }}>
            Your journey
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[
              { val: data.cycleDays, label: 'Days' },
              { val: data.components.length, label: 'Components' },
              { val: data.genres.length, label: 'Genres' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: vibe.accent, lineHeight: 1 }}>{stat.val}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, color: mutedColor, textAlign: 'center', lineHeight: 1.5 }}>
          Know someone going through treatment? Share Cycle with them.
        </p>

        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={onShareWhatsApp} style={{ display: 'block', width: '100%', background: '#25D366', color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontFamily: "'Karla', sans-serif", fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', letterSpacing: '0.02em' }}>
          Share via WhatsApp 💚
        </a>

        <button onClick={onStartNewCycle} style={{ width: '100%', background: 'transparent', color: vibe.accent, border: `1.5px solid ${vibe.accent}50`, borderRadius: 14, padding: '15px', fontFamily: "'Karla', sans-serif", fontSize: 14, fontWeight: 400, cursor: 'pointer' }}>
          Start a new cycle →
        </button>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, letterSpacing: '0.08em', textAlign: 'center' }}>
          Wishing you all the love in the world 🌸
        </div>
      </div>
    </div>
  )
}

export default EndOfCycle
