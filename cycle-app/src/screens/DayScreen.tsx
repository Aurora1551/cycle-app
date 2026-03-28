import React, { useState, useEffect, useRef } from 'react'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'
import type { DayContent } from '../lib/db'

interface Props {
  data: OnboardingData
  dayNumber: number
  onDayComplete: () => void
  onSettings: () => void
}

const COMPONENT_LABELS: Record<string, string> = {
  quote: 'Daily Quote', anthem: 'Today\'s Anthem',
  meditation: 'Guided Meditation', journal: 'Journal',
  affirmation: 'Affirmation', gratitude: 'Gratitude',
  breathing: 'Breathing',
}

const TREATMENT_LABELS: Record<string, string> = {
  'egg-freezing': 'Egg Freezing', ivf: 'IVF', iui: 'IUI',
  'egg-donation': 'Egg Donation', other: 'Other',
}

function BreathingCircle({ vibe }: { vibe: typeof VIBES[0] }) {
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
          <span style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: vibe.accent }}>{secondsLeft}</span>
        </div>
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, color: vibe.accent }}>{current.label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: vibe.muted }}>
        {['inhale', 'hold', 'exhale', 'hold'][phase]}
      </div>
    </div>
  )
}

function BoxBreathing({ vibe }: { vibe: typeof VIBES[0] }) {
  const [step, setStep] = useState(0)
  const [count, setCount] = useState(4)
  const steps = ['Inhale', 'Hold', 'Exhale', 'Hold']
  const corners = [
    { x: '50%', y: '0%' }, { x: '100%', y: '50%' },
    { x: '50%', y: '100%' }, { x: '0%', y: '50%' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          setStep(s => (s + 1) % 4)
          return 4
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const colors = [vibe.accent, `${vibe.accent}CC`, `${vibe.accent}99`, `${vibe.accent}CC`]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '16px 0' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg style={{ position: 'absolute', inset: 0 }} width="140" height="140" viewBox="0 0 140 140">
          <rect x="10" y="10" width="120" height="120" rx="16" fill={`${vibe.accent}12`} stroke={`${vibe.accent}30`} strokeWidth="2" />
          {steps.map((_, i) => (
            <circle
              key={i}
              cx={i === 0 ? 70 : i === 1 ? 130 : i === 2 ? 70 : 10}
              cy={i === 0 ? 10 : i === 1 ? 70 : i === 2 ? 130 : 70}
              r={i === step ? 10 : 6}
              fill={i === step ? vibe.accent : `${vibe.accent}40`}
              style={{ transition: 'r 0.3s, fill 0.3s' }}
            />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 24, color: vibe.accent }}>{count}</span>
        </div>
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, color: vibe.accent }}>
        {steps[step]}...
      </div>
    </div>
  )
}

const DayScreen: React.FC<Props> = ({ data, dayNumber, onDayComplete, onSettings }) => {
  const [content, setContent] = useState<DayContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [journalText, setJournalText] = useState('')
  const [gratitudeText, setGratitudeText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [visible, setVisible] = useState(false)
  const [dayDone, setDayDone] = useState(false)

  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg)
  const textColor = isDark ? '#FDF6F0' : vibe.text
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : vibe.muted
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)'

  const localKey = `cycle_day_${dayNumber}`

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    const localDone = localStorage.getItem(`${localKey}_done`) === '1'
    if (localDone) setDayDone(true)
    setJournalText(localStorage.getItem(`${localKey}_journal`) || '')
    setGratitudeText(localStorage.getItem(`${localKey}_gratitude`) || '')
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const localContent = localStorage.getItem(localKey)
    if (localContent) {
      try {
        setContent(JSON.parse(localContent))
        setLoading(false)
        return
      } catch {}
    }
    fetchContent()
  }, [dayNumber])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          treatment: TREATMENT_LABELS[data.treatment] || data.treatment,
          dayNumber,
          totalDays: data.cycleDays,
          vibe: data.vibe,
          genres: data.genres,
        }),
      })
      if (res.ok) {
        const c = await res.json()
        setContent(c)
        localStorage.setItem(localKey, JSON.stringify(c))
      } else throw new Error('fetch failed')
    } catch {
      const fallback: DayContent = {
        quote: 'You are doing something extraordinary.',
        quoteAuthor: 'Your future self',
        songTitle: 'Golden Hour',
        songArtist: 'JVKE',
        journalPrompt: 'What does it mean to choose this path for yourself?',
        affirmation: `I am ${data.name}, and I am doing enough.`,
        gratitudePrompt: 'What is your body doing right now that you are grateful for?',
      }
      setContent(fallback)
    } finally {
      setLoading(false)
    }
  }

  const saveJournal = () => {
    localStorage.setItem(`${localKey}_journal`, journalText)
    setJournalSaved(true)
    setTimeout(() => setJournalSaved(false), 2000)
  }

  const markDone = () => {
    localStorage.setItem(`${localKey}_done`, '1')
    localStorage.setItem(`${localKey}_gratitude`, gratitudeText)
    setDayDone(true)
    onDayComplete()
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1px solid ${cardBorder}`,
    borderRadius: 10, padding: '12px', fontFamily: "'Karla', sans-serif",
    fontSize: 14, color: textColor, resize: 'vertical' as const, minHeight: 90,
    outline: 'none', caretColor: vibe.accent, lineHeight: 1.5,
    boxSizing: 'border-box',
  }

  const sectionCard = (children: React.ReactNode, key?: string): React.ReactNode => (
    <div key={key} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '18px' }}>
      {children}
    </div>
  )

  const sectionLabel = (label: string) => (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedColor, marginBottom: 10 }}>
      {label}
    </div>
  )

  const spotifyUrl = content ? `https://open.spotify.com/search/${encodeURIComponent(`${content.songTitle} ${content.songArtist}`)}` : ''

  const progressDots = Array.from({ length: Math.min(data.cycleDays, 28) }, (_, i) => (
    <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < dayNumber ? vibe.accent : i === dayNumber - 1 ? vibe.accent : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', flexShrink: 0, transition: 'background 0.3s' }} />
  ))

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibe.bg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div style={{ padding: '20px 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor, marginBottom: 4 }}>
            Day {dayNumber} of {data.cycleDays}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: textColor, fontStyle: 'italic', margin: 0, lineHeight: 1 }}>
            Today
          </h1>
        </div>
        <button onClick={onSettings} style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          ⚙️
        </button>
      </div>

      <div style={{ display: 'flex', gap: 3, padding: '0 22px 16px', flexWrap: 'wrap' }}>
        {progressDots}
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${vibe.accent}40`, borderTop: `2px solid ${vibe.accent}`, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: mutedColor }}>
            Preparing your day...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
        <div style={{ padding: '0 18px 100px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {data.components.map(component => {
            if (component === 'quote') return sectionCard(
              <>
                {sectionLabel('Daily Quote')}
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 20, color: textColor, lineHeight: 1.4, marginBottom: 8 }}>
                  "{content?.quote}"
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, letterSpacing: '0.1em' }}>
                  — {content?.quoteAuthor}
                </div>
              </>, component
            )

            if (component === 'anthem') return sectionCard(
              <>
                {sectionLabel("Today's Anthem")}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${vibe.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎵</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: "'Karla', sans-serif" }}>{content?.songTitle}</div>
                    <div style={{ fontSize: 12, color: mutedColor }}>{content?.songArtist}</div>
                  </div>
                  <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: "'Karla', sans-serif", letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                    ▶ Spotify
                  </a>
                </div>
              </>, component
            )

            if (component === 'meditation') return sectionCard(
              <>
                {sectionLabel('Guided Meditation')}
                <BreathingCircle vibe={vibe} />
                <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor, lineHeight: 1.5 }}>
                  4-4-6-4 breath · breathe at your own pace
                </div>
              </>, component
            )

            if (component === 'journal') return sectionCard(
              <>
                {sectionLabel('Journal')}
                <div style={{ fontSize: 14, color: textColor, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', lineHeight: 1.4, marginBottom: 12 }}>
                  {content?.journalPrompt}
                </div>
                <textarea value={journalText} onChange={e => setJournalText(e.target.value)} placeholder="Write freely..." style={fieldStyle} />
                <button onClick={saveJournal} style={{ marginTop: 8, background: journalSaved ? `${vibe.accent}20` : vibe.accent, color: journalSaved ? vibe.accent : 'white', border: journalSaved ? `1px solid ${vibe.accent}40` : 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Karla', sans-serif", transition: 'all 0.2s' }}>
                  {journalSaved ? '✓ Saved' : 'Save entry'}
                </button>
              </>, component
            )

            if (component === 'affirmation') return sectionCard(
              <>
                {sectionLabel('Affirmation')}
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: vibe.accent, lineHeight: 1.3, textAlign: 'center', padding: '8px 0' }}>
                  {content?.affirmation}
                </div>
              </>, component
            )

            if (component === 'gratitude') return sectionCard(
              <>
                {sectionLabel('Gratitude')}
                <div style={{ fontSize: 14, color: textColor, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', lineHeight: 1.4, marginBottom: 12 }}>
                  {content?.gratitudePrompt}
                </div>
                <textarea value={gratitudeText} onChange={e => setGratitudeText(e.target.value)} placeholder="I am grateful for..." style={fieldStyle} />
              </>, component
            )

            if (component === 'breathing') return sectionCard(
              <>
                {sectionLabel('Breathing Exercise')}
                <BoxBreathing vibe={vibe} />
                <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor }}>
                  Box breathing · 4-4-4-4
                </div>
              </>, component
            )

            return null
          })}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, padding: '12px 18px 28px', background: `linear-gradient(to top, ${vibe.bg} 70%, transparent)` }}>
        <button onClick={markDone} disabled={dayDone} style={{ width: '100%', background: dayDone ? `${vibe.accent}30` : vibe.accent, color: dayDone ? vibe.accent : 'white', border: dayDone ? `1px solid ${vibe.accent}50` : 'none', borderRadius: 14, padding: '16px', fontFamily: "'Karla', sans-serif", fontSize: 15, fontWeight: 600, cursor: dayDone ? 'default' : 'pointer', letterSpacing: '0.02em', transition: 'all 0.3s' }}>
          {dayDone ? `✓ Day ${dayNumber} complete` : `Mark Day ${dayNumber} done ✓`}
        </button>
      </div>
    </div>
  )
}

export default DayScreen
