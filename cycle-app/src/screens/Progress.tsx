import React, { useState } from 'react'
import type { OnboardingData } from '../types'
import type { DayContent } from '../lib/db'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { ScreenShell, Card, SectionLabel } from '../components/ui'

interface Props {
  data: OnboardingData
  dayNumber: number
}

const Progress: React.FC<Props> = ({ data, dayNumber }) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [dayContent, setDayContent] = useState<DayContent | null>(null)

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)

  const handleDotClick = (day: number) => {
    if (localStorage.getItem(`cycle_day_${day}_done`) === '1' || day < dayNumber) {
      const stored = localStorage.getItem(`cycle_day_${day}`)
      if (stored) { try { setDayContent(JSON.parse(stored)); setSelectedDay(day) } catch {} }
    }
  }

  const daysCompleted = Array.from({ length: data.cycleDays }, (_, i) => i + 1)
    .filter(d => localStorage.getItem(`cycle_day_${d}_done`) === '1').length

  const rows: number[][] = []
  for (let i = 0; i < data.cycleDays; i += 7) {
    rows.push(Array.from({ length: Math.min(7, data.cycleDays - i) }, (_, j) => i + j + 1))
  }

  const spotifyUrl = dayContent ? `https://open.spotify.com/search/${encodeURIComponent(`${dayContent.songTitle} ${dayContent.songArtist}`)}` : ''

  return (
    <ScreenShell bg={vibe.bg} visible={true}>
      <div style={{ padding: '20px 22px 10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor, marginBottom: 4 }}>Progress</div>
        <h1 style={{ fontFamily: typo.headingFont, fontSize: 28, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: textColor, margin: 0, lineHeight: 1 }}>Your journey</h1>
      </div>

      <div style={{ padding: '16px 22px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>Day by day</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rows.map((row, wi) => (
              <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: mutedColor, width: 18, flexShrink: 0 }}>W{wi + 1}</div>
                {row.map(day => {
                  const isDone = localStorage.getItem(`cycle_day_${day}_done`) === '1'
                  const isCurrent = day === dayNumber
                  return (
                    <button key={day} onClick={() => handleDotClick(day)} title={isDone ? `Day ${day} — tap to view` : `Day ${day}`} style={{ flex: 1, aspectRatio: '1', maxWidth: 34, borderRadius: '50%', background: isDone ? vibe.accent : isCurrent ? `${vibe.accent}40` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: isCurrent ? `2px solid ${vibe.accent}` : 'none', cursor: isDone || day < dayNumber ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: isDone ? 'white' : isCurrent ? vibe.accent : mutedColor, lineHeight: 1 }}>{day}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.08em', marginTop: 10 }}>Tap a completed day to revisit it</div>
        </Card>

        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>Stats</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[{ val: daysCompleted, label: 'Days done' }, { val: data.cycleDays, label: 'Total days' }, { val: data.components.length, label: 'Components' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: typo.headingFont, fontSize: 30, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: vibe.accent, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {selectedDay !== null && dayContent && (
        <div onClick={() => { setSelectedDay(null); setDayContent(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 390, background: vibe.bg, borderRadius: '20px 20px 0 0', padding: '24px 24px 40px', maxHeight: '75vh', overflowY: 'auto' }}>
            <SectionLabel color={vibe.accent}>Day {selectedDay}</SectionLabel>
            <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: typo.headingWeight, fontSize: 18, color: textColor, lineHeight: 1.5, marginBottom: 6 }}>"{dayContent.quote}"</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, marginBottom: 16 }}>— {dayContent.quoteAuthor}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '12px', marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${vibe.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🎵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: textColor, fontFamily: typo.bodyFont }}>{dayContent.songTitle}</div>
                <div style={{ fontSize: 11, color: mutedColor }}>{dayContent.songArtist}</div>
              </div>
              <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#1DB954', color: 'white', borderRadius: 16, padding: '5px 11px', fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>▶</a>
            </div>
            {dayContent.affirmation && <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 16, fontWeight: typo.headingWeight, color: vibe.accent, textAlign: 'center', padding: '8px 0 16px' }}>{dayContent.affirmation}</div>}
            <button onClick={() => { setSelectedDay(null); setDayContent(null) }} style={{ width: '100%', background: vibe.accent, color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </ScreenShell>
  )
}

export default Progress
