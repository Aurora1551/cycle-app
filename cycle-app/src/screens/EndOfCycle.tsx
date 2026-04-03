import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      <div className="flex-col w-full" style={{ padding: '40px 28px', alignItems: 'center', gap: 20 }}>
        <div className="flex-center" style={{ position: 'relative', width: 100, height: 100 }}>
          <div className="breath-ring" style={{ inset: -20, background: `${vibe.accent}18`, animation: orb ? 'glow-ring 2.5s ease-in-out infinite' : 'none' }} />
          <div className="breath-ring" style={{ inset: -8, background: `${vibe.accent}28`, animation: orb ? 'glow-ring 2.5s ease-in-out infinite 0.3s' : 'none' }} />
          <div className="flex-center" style={{ width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${vibe.accent}cc, ${vibe.accent}55)`, fontSize: 36, animation: orb ? 'pulse-orb 2.5s ease-in-out infinite' : 'none' }}>{vibe.emoji}</div>
        </div>

        <SectionLabel color={vibe.accent}>{t('endOfCycle.sectionLabel')}</SectionLabel>
        <h1 className="heading-xl" style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, color: textColor }}>
          {(() => { const full = t('endOfCycle.heading', { name: data.name }); const idx = full.indexOf(data.name); if (idx === -1) return full; return <>{full.slice(0, idx)}<br /><span style={{ color: vibe.accent }}>{full.slice(idx)}</span></> })()}
        </h1>
        <p style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 16, color: mutedColor, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
          {t('endOfCycle.message', { days: data.cycleDays })}
        </p>

        <Card cardBg={cardBg} cardBorder={cardBorder} style={{ width: '100%' }}>
          <SectionLabel color={vibe.accent}>{t('endOfCycle.yourJourney')}</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[{ val: daysCompleted, label: t('endOfCycle.daysDone') }, { val: daysCompleted, label: t('endOfCycle.songsPlayed') }, { val: daysCompleted, label: t('endOfCycle.quotesRead') }].map((s, i) => (
              <div key={i} className="stat">
                <div className="stat-value" style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 32, fontWeight: typo.headingWeight, color: vibe.accent }}>{s.val}</div>
                <div className="stat-label" style={{ color: mutedColor }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <PrimaryButton accent={vibe.accent} typo={typo} onClick={onStartNewCycle}>{t('endOfCycle.newCycle')}</PrimaryButton>
        <GhostButton color={vibe.accent} borderColor={`${vibe.accent}50`} typo={typo} onClick={onGift}>{t('endOfCycle.giftFriend')}</GhostButton>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', background: '#25D366', color: 'white', border: 'none', borderRadius: 14, padding: '15px', fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>{t('endOfCycle.shareWhatsApp')}</a>
        <div className="mono-xs text-center" style={{ color: mutedColor }}>{t('endOfCycle.closingMessage', { emoji: vibe.emoji })}</div>
      </div>
    </ScreenShell>
  )
}

export default EndOfCycle
