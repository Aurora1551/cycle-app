import React, { useState, useEffect } from 'react'
import type { OnboardingData } from '../types'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { TREATMENT_LABELS } from '../lib/constants'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, Card, SectionLabel, PrimaryButton, GhostButton } from '../components/ui'

interface Props {
  data: OnboardingData
  onStartNewCycle: () => void
  onGift: () => void
}

const EndOfCycle: React.FC<Props> = ({ data, onStartNewCycle, onGift }) => {
  const visible = useFadeIn(80)
  const [orb, setOrb] = useState(false)

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)

  useEffect(() => { const t = setTimeout(() => setOrb(true), 400); return () => clearTimeout(t) }, [])

  const treatment = TREATMENT_LABELS[data.treatment] || data.treatment
  const daysCompleted = Array.from({ length: data.cycleDays }, (_, i) => i + 1)
    .filter(d => localStorage.getItem(`cycle_day_${d}_done`) === '1').length

  const shareText = `I just completed my ${treatment} journey with Cycle ${vibe.emoji}\n\n${data.cycleDays} days of showing up for myself.\n\nIf you're going through fertility treatment, this app is for you 💛`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <ScreenShell bg={vibe.bg} visible={visible} transition="opacity 0.6s ease" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes pulse-orb { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes glow-ring { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.25); opacity: 0.6; } }
      `}</style>

      <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
        <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: `${vibe.accent}18`, animation: orb ? 'glow-ring 2.5s ease-in-out infinite' : 'none' }} />
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: `${vibe.accent}28`, animation: orb ? 'glow-ring 2.5s ease-in-out infinite 0.3s' : 'none' }} />
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${vibe.accent}cc, ${vibe.accent}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, animation: orb ? 'pulse-orb 2.5s ease-in-out infinite' : 'none' }}>{vibe.emoji}</div>
        </div>

        <SectionLabel color={vibe.accent}>Cycle complete</SectionLabel>
        <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 36, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.15, textAlign: 'center', margin: 0 }}>
          You did it,<br /><span style={{ color: vibe.accent }}>{data.name}.</span>
        </h1>
        <p style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 16, color: mutedColor, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
          {data.cycleDays} days of showing up for yourself. That takes incredible strength.
        </p>

        <Card cardBg={cardBg} cardBorder={cardBorder} style={{ width: '100%' }}>
          <SectionLabel color={vibe.accent}>Your journey</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[{ val: daysCompleted, label: 'Days done' }, { val: daysCompleted, label: 'Songs played' }, { val: daysCompleted, label: 'Quotes read' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 32, fontWeight: typo.headingWeight, color: vibe.accent, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <PrimaryButton accent={vibe.accent} typo={typo} onClick={onStartNewCycle}>Start a new cycle →</PrimaryButton>
        <GhostButton color={vibe.accent} borderColor={`${vibe.accent}50`} typo={typo} onClick={onGift}>Gift this to a friend 🎁</GhostButton>

        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', background: '#25D366', color: 'white', border: 'none', borderRadius: 14, padding: '15px', fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>Share via WhatsApp 💚</a>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, letterSpacing: '0.08em', textAlign: 'center' }}>Wishing you all the love in the world {vibe.emoji}</div>
      </div>
    </ScreenShell>
  )
}

export default EndOfCycle
