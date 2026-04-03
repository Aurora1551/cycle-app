import React from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { ScreenShell, Card, SectionLabel } from '../components/ui'

interface Props {
  data: OnboardingData
  dayNumber: number
  onGoToDay: (day: number) => void
}

const Progress: React.FC<Props> = ({ data, dayNumber, onGoToDay }) => {
  const { t } = useTranslation()
  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)

  const daysCompleted = Array.from({ length: data.cycleDays }, (_, i) => i + 1)
    .filter(d => localStorage.getItem(`cycle_day_${d}_done`) === '1').length

  const rows: number[][] = []
  for (let i = 0; i < data.cycleDays; i += 7) {
    rows.push(Array.from({ length: Math.min(7, data.cycleDays - i) }, (_, j) => i + j + 1))
  }

  return (
    <ScreenShell bg={vibe.bg} visible={true}>
      <div style={{ padding: '20px 22px 10px' }}>
        <div className="mono-hint" style={{ color: mutedColor, marginBottom: 4, letterSpacing: '0.18em' }}>{t('progress.sectionLabel')}</div>
        <h1 className="heading-sm" style={{ fontFamily: typo.headingFont, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: textColor }}>{t('progress.heading')}</h1>
      </div>

      <div className="flex-col gap-20" style={{ padding: '16px 22px 100px' }}>
        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>{t('progress.dayByDay')}</SectionLabel>
          <div className="flex-col gap-14">
            {rows.map((row, wi) => (
              <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: mutedColor, width: 18, flexShrink: 0 }}>{t('progress.week', { n: wi + 1 })}</div>
                {row.map(day => {
                  const isDone = localStorage.getItem(`cycle_day_${day}_done`) === '1'
                  const isCurrent = day === dayNumber
                  return (
                    <button key={day} onClick={() => onGoToDay(day)} title={t('progress.goToDay', { day })} className="flex-center" style={{
                      flex: 1, aspectRatio: '1', maxWidth: 34, borderRadius: '50%', padding: 0, cursor: 'pointer',
                      background: isDone ? vibe.accent : isCurrent ? `${vibe.accent}40` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      border: isCurrent ? `2px solid ${vibe.accent}` : 'none',
                    }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: isDone ? 'white' : isCurrent ? vibe.accent : mutedColor, lineHeight: 1 }}>{day}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mono-xs" style={{ color: mutedColor, marginTop: 10 }}>{t('progress.tapHint')}</div>
        </Card>

        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>{t('progress.stats')}</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[{ val: daysCompleted, label: t('progress.daysDone') }, { val: data.cycleDays, label: t('progress.totalDays') }].map((s, i) => (
              <div key={i} className="stat">
                <div className="stat-value" style={{ fontFamily: typo.headingFont, fontSize: 30, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: vibe.accent }}>{s.val}</div>
                <div className="stat-label" style={{ color: mutedColor }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ScreenShell>
  )
}

export default Progress
