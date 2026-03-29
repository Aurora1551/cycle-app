import React, { useState, useEffect } from 'react'
import type { OnboardingData } from '../types'
import { VIBES, VIBE_TYPO } from '../types'

interface Props {
  data: OnboardingData
  onStartNewCycle: () => void
  onGift: () => void
}

const TREATMENT_LABELS: Record<string, string> = {
  'egg-freezing': 'Egg Freezing', ivf: 'IVF', iui: 'IUI',
  'egg-donation': 'Egg Donation', other: 'Other',
}

const EndOfCycle: React.FC<Props> = ({ data, onStartNewCycle, onGift }) => {
  const [visible, setVisible] = useState(false)
  const [orb, setOrb] = useState(false)

  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg)
  const textColor = isDark ? '#FDF6F0' : vibe.text
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : vibe.muted
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : `${vibe.accent}20`
  const typo = data.vibe ? VIBE_TYPO[data.vibe] : VIBE_TYPO.fierce

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80)
    const t2 = setTimeout(() => setOrb(true), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const treatment = TREATMENT_LABELS[data.treatment] || data.treatment
  const daysCompleted = Array.from({ length: data.cycleDays }, (_, i) => i + 1)
    .filter(d => localStorage.getItem(`cycle_day_${d}_done`) === '1').length
  const songsCount = daysCompleted
  const quotesCount = daysCompleted

  const shareText = `I just completed my ${treatment} journey with Cycle ${vibe.emoji}\n\n${data.cycleDays} days of showing up for myself. That takes incredible strength.\n\nIf you're going through fertility treatment, this app is for you 💛`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <div
      style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibe.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease' }}
    >
      <style>{`
        @keyframes pulse-orb {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes glow-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.25); opacity: 0.6; }
        }
      `}</style>

      <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
        {/* Glowing orb */}
        <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: `${vibe.accent}18`, animation: orb ? 'glow-ring 2.5s ease-in-out infinite' : 'none' }} />
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: `${vibe.accent}28`, animation: orb ? 'glow-ring 2.5s ease-in-out infinite 0.3s' : 'none' }} />
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${vibe.accent}cc, ${vibe.accent}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, animation: orb ? 'pulse-orb 2.5s ease-in-out infinite' : 'none' }}>
            {vibe.emoji}
          </div>
        </div>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibe.accent }}>
          Cycle complete
        </div>

        <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 36, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.15, textAlign: 'center', margin: 0 }}>
          You did it,<br />
          <span style={{ color: vibe.accent }}>{data.name}.</span>
        </h1>

        <p style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 16, color: mutedColor, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
          {data.cycleDays} days of showing up for yourself. That takes incredible strength.
        </p>

        {/* Stats */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '18px', width: '100%' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 14 }}>
            Your journey
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[
              { val: daysCompleted, label: 'Days done' },
              { val: songsCount, label: 'Songs played' },
              { val: quotesCount, label: 'Quotes read' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 32, fontWeight: typo.headingWeight, color: vibe.accent, lineHeight: 1 }}>{stat.val}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onStartNewCycle}
          style={{ width: '100%', background: vibe.accent, color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          Start a new cycle →
        </button>

        <button
          onClick={onGift}
          style={{ width: '100%', background: 'transparent', color: vibe.accent, border: `1.5px solid ${vibe.accent}50`, borderRadius: 14, padding: '15px', fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 400, cursor: 'pointer' }}
        >
          Gift this to a friend 🎁
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', width: '100%', background: '#25D366', color: 'white', border: 'none', borderRadius: 14, padding: '15px', fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none', letterSpacing: '0.02em' }}
        >
          Share via WhatsApp 💚
        </a>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, letterSpacing: '0.08em', textAlign: 'center' }}>
          Wishing you all the love in the world {vibe.emoji}
        </div>
      </div>
    </div>
  )
}

export default EndOfCycle
