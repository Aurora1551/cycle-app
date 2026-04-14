import React from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { ScreenShell, Card, SectionLabel } from '../components/ui'

interface Props {
  data: OnboardingData
  dayNumber: number
  onGoToDay: (day: number) => void
  onSettings?: () => void
}

const Progress: React.FC<Props> = ({ data, dayNumber, onGoToDay, onSettings }) => {
  const { t } = useTranslation()
  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)

  const daysCompleted = Array.from({ length: data.cycleDays }, (_, i) => i + 1)
    .filter(d => localStorage.getItem(`cycle_day_${d}_done`) === '1').length

  // Streak: count consecutive completed days ending at current position
  const streak = React.useMemo(() => {
    let count = 0
    for (let d = dayNumber; d >= 1; d--) {
      if (localStorage.getItem(`cycle_day_${d}_done`) === '1') count++
      else break
    }
    return count
  }, [dayNumber])

  // Count saved favorites
  const savedCount = React.useMemo(() => {
    try { return (JSON.parse(localStorage.getItem('cycle_favorites') || '[]') as unknown[]).length } catch { return 0 }
  }, [])

  // Count journal entries
  const journalCount = React.useMemo(() => {
    let count = 0
    for (let d = 1; d <= data.cycleDays; d++) {
      const text = localStorage.getItem(`cycle_content_${data.name}_${data.vibe}_day${d}_journal`) || localStorage.getItem(`cycle_day_${d}_journal`)
      if (text && text.trim()) count++
    }
    return count
  }, [data.cycleDays, data.name, data.vibe])

  // Check if today's journal exists
  const hasTodayJournal = React.useMemo(() => {
    const a = localStorage.getItem(`cycle_content_${data.name}_${data.vibe}_day${dayNumber}_journal`)
    const b = localStorage.getItem(`cycle_day_${dayNumber}_journal`)
    return !!(a && a.trim()) || !!(b && b.trim())
  }, [data.name, data.vibe, dayNumber])

  const rows: number[][] = []
  for (let i = 0; i < data.cycleDays; i += 7) {
    rows.push(Array.from({ length: Math.min(7, data.cycleDays - i) }, (_, j) => i + j + 1))
  }

  return (
    <ScreenShell bg={vibe.bg} visible={true}>
      <div style={{ padding: '20px 22px 10px', position: 'relative' }}>
        {onSettings && <button onClick={onSettings} className="flex-center" style={{ position: 'absolute', top: 20, right: 22, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 14, zIndex: 1 }}>⚙️</button>}
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
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: mutedColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>&#127793; Current streak</div>
            <div style={{ fontFamily: typo.headingFont, fontSize: 32, fontWeight: typo.headingWeight, fontStyle: 'italic', color: vibe.accent, lineHeight: 1.2 }}>{streak}</div>
            <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: mutedColor, marginTop: 2 }}>days of showing up</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, borderTop: `1px solid ${cardBorder}`, paddingTop: 14 }}>
            {[
              { val: dayNumber, label: 'DAY' },
              { val: data.cycleDays, label: 'TOTAL' },
              { val: savedCount, label: 'SAVED' },
              { val: journalCount, label: 'JOURNAL' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: typo.headingFont, fontSize: 20, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: vibe.accent, lineHeight: 1.2 }}>{s.val}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.12em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
        {/* Saved favorites */}
        {(() => {
          let favs: Array<{ type: string; text: string; author?: string; day: number }> = []
          try { favs = JSON.parse(localStorage.getItem('cycle_favorites') || '[]') } catch {}
          if (favs.length === 0) return (
            <Card cardBg={cardBg} cardBorder={cardBorder}>
              <SectionLabel color={vibe.accent}>&#9829; {t('progress.saved', 'Saved')}</SectionLabel>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>&#9825;</div>
                <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: mutedColor, lineHeight: 1.5 }}>Tap the heart on any quote that moves you</div>
              </div>
            </Card>
          )
          return (
            <Card cardBg={cardBg} cardBorder={cardBorder}>
              <SectionLabel color={vibe.accent}>&#9829; {t('progress.saved', 'Saved')}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {favs.map((f, i) => (
                  <div key={i} style={{ borderBottom: i < favs.length - 1 ? `1px solid ${cardBorder}` : 'none', paddingBottom: i < favs.length - 1 ? 14 : 0 }}>
                    {f.type === 'quote' ? (
                      <>
                        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 18, color: textColor, lineHeight: 1.35 }}>"{f.text}"</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: vibe.accent, marginTop: 6, letterSpacing: '0.1em' }}>— {f.author} · DAY {f.day}</div>
                      </>
                    ) : f.type === 'affirmation' ? (
                      <>
                        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: vibe.accent, lineHeight: 1.4, textAlign: 'center', padding: '4px 0' }}>{f.text}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, marginTop: 6, letterSpacing: '0.1em', textAlign: 'center' }}>AFFIRMATION · DAY {f.day}</div>
                      </>
                    ) : f.type === 'friendNote' ? (
                      <>
                        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: textColor, lineHeight: 1.5, textAlign: 'center', padding: '4px 0' }}>{f.text}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, marginTop: 6, letterSpacing: '0.1em', textAlign: 'center' }}>FROM YOUR PERSON · DAY {f.day}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: textColor, lineHeight: 1.4 }}>{f.text}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, marginTop: 6, letterSpacing: '0.1em' }}>
                          {f.author ? `— ${f.author} · ` : ''}{f.type.toUpperCase()} · DAY {f.day}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )
        })()}
        {/* Journal entries */}
        {(() => {
          const journals: Array<{ day: number; text: string }> = []
          for (let d = 1; d <= data.cycleDays; d++) {
            const text = localStorage.getItem(`cycle_content_${data.name}_${data.vibe}_day${d}_journal`) || localStorage.getItem(`cycle_day_${d}_journal`)
            if (text && text.trim()) journals.push({ day: d, text })
          }
          if (journals.length === 0) return (
            <Card cardBg={cardBg} cardBorder={cardBorder}>
              <SectionLabel color={vibe.accent}>&#9998; Journal</SectionLabel>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>&#9997;</div>
                <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: mutedColor, lineHeight: 1.5 }}>Today's journal prompt is waiting on the Today tab</div>
              </div>
            </Card>
          )
          return (
            <Card cardBg={cardBg} cardBorder={cardBorder}>
              <SectionLabel color={vibe.accent}>&#9998; Journal</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {journals.map((j, i) => (
                  <div key={i} style={{ borderBottom: i < journals.length - 1 ? `1px solid ${cardBorder}` : 'none', paddingBottom: i < journals.length - 1 ? 12 : 0 }}>
                    <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: textColor, lineHeight: 1.5 }}>{j.text}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, marginTop: 4, letterSpacing: '0.1em' }}>DAY {j.day}</div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })()}

        {/* Journal CTA if today not yet journaled */}
        {!hasTodayJournal && (
          <Card cardBg={cardBg} cardBorder={cardBorder}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>&#9997;</span>
                <span style={{ fontFamily: typo.bodyFont, fontSize: 14, color: textColor }}>Today's journal is waiting</span>
              </div>
              <button onClick={() => onGoToDay(dayNumber)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: vibe.accent, background: 'none', border: `1px solid ${vibe.accent}40`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.05em' }}>Go &#8594;</button>
            </div>
          </Card>
        )}

        {/* TODO: Cycle Story — end-of-cycle narrative summary (future feature) */}
      </div>
    </ScreenShell>
  )
}

export default Progress
