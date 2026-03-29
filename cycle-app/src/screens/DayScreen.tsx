import React, { useState, useEffect } from 'react'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'
import type { DayContent } from '../lib/db'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { TREATMENT_LABELS, COMPONENT_ORDER } from '../lib/constants'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, Card, SectionLabel } from '../components/ui'
import { track } from '../lib/posthog'

interface Props {
  data: OnboardingData
  dayNumber: number
  isPremium: boolean
  onDayComplete: () => void
  onSettings: () => void
}

function BreathingCircle({ vibe, typo }: { vibe: typeof VIBES[0]; typo: ReturnType<typeof resolveTypo> }) {
  const [phase, setPhase] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(4)
  const phases = [
    { label: 'Breathe in...', duration: 4, scale: 1.4 },
    { label: 'Hold...', duration: 4, scale: 1.4 },
    { label: 'Breathe out...', duration: 6, scale: 1.0 },
    { label: 'Hold...', duration: 4, scale: 1.0 },
  ]
  const current = phases[phase]

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setPhase(p => (p + 1) % phases.length)
          return phases[(phase + 1) % phases.length].duration
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '16px 0' }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${vibe.accent}18`, transition: 'transform 1s ease-in-out', transform: `scale(${current.scale})` }} />
        <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', background: `${vibe.accent}28`, transition: 'transform 1s ease-in-out', transform: `scale(${current.scale * 0.9})` }} />
        <div style={{ position: 'absolute', inset: 32, borderRadius: '50%', background: `${vibe.accent}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 1s ease-in-out', transform: `scale(${current.scale * 0.85})` }}>
          <span style={{ fontSize: 22, fontFamily: typo.headingFont, fontWeight: typo.headingWeight, color: vibe.accent }}>{secondsLeft}</span>
        </div>
      </div>
      <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 18, color: vibe.accent }}>{current.label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: vibe.muted }}>
        {['inhale', 'hold', 'exhale', 'hold'][phase]}
      </div>
    </div>
  )
}

function BoxBreathing({ vibe, typo }: { vibe: typeof VIBES[0]; typo: ReturnType<typeof resolveTypo> }) {
  const [step, setStep] = useState(0)
  const [count, setCount] = useState(4)
  const steps = ['Inhale', 'Hold', 'Exhale', 'Hold']

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => {
        if (c <= 1) { setStep(s => (s + 1) % 4); return 4 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '16px 0' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg style={{ position: 'absolute', inset: 0 }} width="140" height="140" viewBox="0 0 140 140">
          <rect x="10" y="10" width="120" height="120" rx="16" fill={`${vibe.accent}12`} stroke={`${vibe.accent}30`} strokeWidth="2" />
          {steps.map((_, i) => (
            <circle key={i}
              cx={i === 0 ? 70 : i === 1 ? 130 : i === 2 ? 70 : 10}
              cy={i === 0 ? 10 : i === 1 ? 70 : i === 2 ? 130 : 70}
              r={i === step ? 10 : 6}
              fill={i === step ? vibe.accent : `${vibe.accent}40`}
              style={{ transition: 'r 0.3s, fill 0.3s' }}
            />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: typo.headingFont, fontWeight: typo.headingWeight, fontSize: 24, color: vibe.accent }}>{count}</span>
        </div>
      </div>
      <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 18, color: vibe.accent }}>{steps[step]}...</div>
    </div>
  )
}

const DayScreen: React.FC<Props> = ({ data, dayNumber, isPremium, onDayComplete, onSettings }) => {
  const [content, setContent] = useState<DayContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [journalText, setJournalText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [dayDone, setDayDone] = useState(false)
  const [meditationStarted, setMeditationStarted] = useState(false)
  const visible = useFadeIn(80)

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)

  const isLocked = !isPremium && dayNumber > 3
  const localKey = `cycle_day_${dayNumber}`

  useEffect(() => {
    if (localStorage.getItem(`${localKey}_done`) === '1') setDayDone(true)
    setJournalText(localStorage.getItem(`${localKey}_journal`) || '')
  }, [])

  useEffect(() => {
    const localContent = localStorage.getItem(localKey)
    if (localContent) {
      try { setContent(JSON.parse(localContent)); setLoading(false); return } catch {}
    }
    fetchContent()
    track('day_screen_viewed', { day_number: dayNumber, treatment_type: TREATMENT_LABELS[data.treatment] || data.treatment })
  }, [dayNumber])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, treatment: TREATMENT_LABELS[data.treatment] || data.treatment, dayNumber, totalDays: data.cycleDays, vibe: data.vibe, genres: data.genres }),
      })
      if (res.ok) {
        const c = await res.json()
        setContent(c)
        localStorage.setItem(localKey, JSON.stringify(c))
      } else throw new Error('fetch failed')
    } catch {
      setContent({
        quote: 'You are doing something extraordinary.', quoteAuthor: 'Your future self',
        songTitle: 'Golden Hour', songArtist: 'JVKE',
        journalPrompt: 'What does it mean to choose this path for yourself?',
        affirmation: `I am ${data.name}, and I am doing enough.`,
        gratitudePrompt: 'What is your body doing right now that you are grateful for?',
      })
    } finally { setLoading(false) }
  }

  const saveJournal = () => {
    localStorage.setItem(`${localKey}_journal`, journalText)
    setJournalSaved(true)
    track('journal_entry_saved', { day_number: dayNumber })
    setTimeout(() => setJournalSaved(false), 2000)
  }

  const markDone = () => {
    localStorage.setItem(`${localKey}_done`, '1')
    setDayDone(true)
    onDayComplete()
  }

  const spotifyUrl = content ? `https://open.spotify.com/search/${encodeURIComponent(`${content.songTitle} ${content.songArtist}`)}` : ''

  const inputStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1px solid ${cardBorder}`,
    borderRadius: 10, padding: '12px', fontFamily: typo.bodyFont,
    fontWeight: typo.bodyWeight, fontSize: 14, color: textColor,
    resize: 'vertical' as const, minHeight: 90, outline: 'none',
    caretColor: vibe.accent, lineHeight: 1.5, boxSizing: 'border-box',
  }

  const sortedComponents = [...data.components].sort((a, b) => COMPONENT_ORDER.indexOf(a) - COMPONENT_ORDER.indexOf(b))

  const progressDots = Array.from({ length: Math.min(data.cycleDays, 28) }, (_, i) => (
    <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < dayNumber ? vibe.accent : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', flexShrink: 0, transition: 'background 0.3s' }} />
  ))

  const renderComponent = (component: string) => {
    if (component === 'quote') {
      track('quote_viewed', { day_number: dayNumber })
      return (
        <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>Daily Quote</SectionLabel>
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: typo.headingWeight, fontSize: 20, color: textColor, lineHeight: 1.4, marginBottom: 8 }}>"{content?.quote}"</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: vibe.accent, letterSpacing: '0.1em' }}>— {content?.quoteAuthor}</div>
        </Card>
      )
    }
    if (component === 'anthem') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Today's Anthem</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${vibe.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎵</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: typo.bodyFont }}>{content?.songTitle}</div>
            <div style={{ fontSize: 12, color: mutedColor, fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight }}>{content?.songArtist}</div>
          </div>
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('song_played', { day_number: dayNumber })} style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>▶ Spotify</a>
        </div>
      </Card>
    )
    if (component === 'affirmation') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Affirmation</SectionLabel>
        <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 24, fontWeight: typo.headingWeight, color: vibe.accent, lineHeight: 1.3, textAlign: 'center', padding: '8px 0' }}>{content?.affirmation}</div>
      </Card>
    )
    if (component === 'journal') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Journal</SectionLabel>
        <div style={{ fontSize: 14, color: textColor, fontFamily: typo.headingFont, fontStyle: 'italic', lineHeight: 1.4, marginBottom: 12 }}>{content?.journalPrompt}</div>
        <textarea value={journalText} onChange={e => setJournalText(e.target.value)} placeholder="Write freely..." style={inputStyle} />
        <button onClick={saveJournal} style={{ marginTop: 8, background: journalSaved ? `${vibe.accent}20` : vibe.accent, color: journalSaved ? vibe.accent : 'white', border: journalSaved ? `1px solid ${vibe.accent}40` : 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: typo.bodyFont, transition: 'all 0.2s' }}>
          {journalSaved ? '✓ Saved' : 'Save entry'}
        </button>
      </Card>
    )
    if (component === 'gratitude') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Gratitude</SectionLabel>
        <div style={{ fontSize: 14, color: textColor, fontFamily: typo.headingFont, fontStyle: 'italic', lineHeight: 1.4 }}>{content?.gratitudePrompt}</div>
      </Card>
    )
    if (component === 'meditation') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Guided Meditation</SectionLabel>
        {!meditationStarted ? (
          <button onClick={() => { setMeditationStarted(true); track('meditation_started', { day_number: dayNumber }) }} style={{ width: '100%', background: `${vibe.accent}15`, border: `1px solid ${vibe.accent}30`, borderRadius: 12, padding: '20px', cursor: 'pointer', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 14, color: vibe.accent }}>
            Begin meditation · 4-4-6-4 breath
          </button>
        ) : (
          <>
            <BreathingCircle vibe={vibe} typo={typo} />
            <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor, lineHeight: 1.5, fontFamily: typo.bodyFont }}>4-4-6-4 breath · breathe at your own pace</div>
          </>
        )}
      </Card>
    )
    if (component === 'breathing') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Breathing Exercise</SectionLabel>
        <BoxBreathing vibe={vibe} typo={typo} />
        <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor, fontFamily: typo.bodyFont }}>Box breathing · 4-4-4-4</div>
      </Card>
    )
    return null
  }

  return (
    <ScreenShell bg={vibe.bg} visible={visible} transition="opacity 0.5s ease">
      <div style={{ padding: '20px 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor, marginBottom: 4 }}>Day {dayNumber} of {data.cycleDays}</div>
          <h1 style={{ fontFamily: typo.headingFont, fontSize: 28, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: textColor, margin: 0, lineHeight: 1 }}>Today</h1>
        </div>
        <button onClick={onSettings} style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙️</button>
      </div>

      <div style={{ display: 'flex', gap: 3, padding: '0 22px 16px', flexWrap: 'wrap' }}>{progressDots}</div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${vibe.accent}40`, borderTop: `2px solid ${vibe.accent}`, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 15, color: mutedColor }}>Preparing your day...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : isLocked ? (
        <div style={{ padding: '0 18px 160px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {sortedComponents.slice(0, 2).map(c => (
            <div key={c} style={{ opacity: 0.35, filter: 'blur(2px)', pointerEvents: 'none' }}>{renderComponent(c)}</div>
          ))}
          <Card cardBg={cardBg} cardBorder={cardBorder} style={{ textAlign: 'center', padding: '28px 18px' }}>
            <div style={{ fontSize: 32 }}>🔒</div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 22, color: textColor, lineHeight: 1.2, marginTop: 8 }}>Day {dayNumber} is waiting for you</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, margin: '8px 0 16px' }}>3 free days done — unlock the rest of your journey</div>
            <button style={{ width: '100%', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Unlock my full journey →</button>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, letterSpacing: '0.08em', marginTop: 8 }}>from £5.99 one-time</div>
          </Card>
        </div>
      ) : (
        <div style={{ padding: '0 18px 160px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {sortedComponents.map(renderComponent)}
          <button onClick={markDone} disabled={dayDone} style={{ width: '100%', background: dayDone ? `${vibe.accent}30` : vibe.accent, color: dayDone ? vibe.accent : 'white', border: dayDone ? `1px solid ${vibe.accent}50` : 'none', borderRadius: 14, padding: '16px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 15, cursor: dayDone ? 'default' : 'pointer', transition: 'all 0.3s', marginTop: 8 }}>
            {dayDone ? `✓ Day ${dayNumber} complete` : `Mark Day ${dayNumber} done ✓`}
          </button>
        </div>
      )}
    </ScreenShell>
  )
}

export default DayScreen
