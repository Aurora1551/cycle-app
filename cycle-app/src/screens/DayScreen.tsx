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

function speak(text: string): Promise<void> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) { resolve(); return }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.72
    u.pitch = 0.95
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

// Soothing ambient pad using Web Audio API
function createAmbientMusic(): { start: () => void; stop: () => void } | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0
    masterGain.connect(ctx.destination)

    // Soft pad: layered detuned oscillators
    const notes = [174.61, 220, 261.63, 329.63] // F3, A3, C4, E4 — Fmaj7 chord
    const oscs: OscillatorNode[] = []
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = (i % 2 === 0 ? 3 : -3) // slight detune for warmth
      const g = ctx.createGain()
      g.gain.value = 0.06
      osc.connect(g)
      g.connect(masterGain)
      oscs.push(osc)
    })

    return {
      start() {
        oscs.forEach(o => o.start())
        masterGain.gain.setTargetAtTime(1, ctx.currentTime, 1.5) // fade in over ~1.5s
      },
      stop() {
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.8) // fade out
        setTimeout(() => {
          oscs.forEach(o => { try { o.stop() } catch {} })
          ctx.close()
        }, 2500)
      },
    }
  } catch { return null }
}

const PHASES = [
  { label: 'Breathe in...', spokenCounts: ['Breathe in...', '2...', '3...', '4...'], duration: 4, scale: 1.4 },
  { label: 'Hold...', spokenCounts: ['Hold...', '2...', '3...', '4...'], duration: 4, scale: 1.4 },
  { label: 'Breathe out...', spokenCounts: ['Breathe out...', '2...', '3...', '4...', '5...', '6...'], duration: 6, scale: 1.0 },
]
const TOTAL_CYCLES = 3

interface GuidedBreathingProps {
  vibe: typeof VIBES[0]
  typo: ReturnType<typeof resolveTypo>
  openingLine: string
  closingLine: string
  genres: string[]
  onComplete: () => void
}

function GuidedBreathing({ vibe, typo, openingLine, closingLine, genres, onComplete }: GuidedBreathingProps) {
  const [stage, setStage] = useState<'opening' | 'breathing' | 'done'>('opening')
  const [cycle, setCycle] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [count, setCount] = useState(1)
  const [openingFade, setOpeningFade] = useState(0)
  const ambientRef = React.useRef<ReturnType<typeof createAmbientMusic>>(null)
  const phase = PHASES[phaseIdx]

  // Start ambient music + speak opening line, then transition after speech finishes
  useEffect(() => {
    ambientRef.current = createAmbientMusic()
    ambientRef.current?.start()
    setOpeningFade(1)

    // Wait for speech to finish, then add a gentle pause before breathing starts
    const run = async () => {
      await speak(openingLine)
      await new Promise(r => setTimeout(r, 1800))
      setStage('breathing')
    }
    run()

    return () => { window.speechSynthesis?.cancel(); ambientRef.current?.stop() }
  }, [])

  // Breathing timer — slower pace (1.2s per count instead of 1s)
  useEffect(() => {
    if (stage !== 'breathing') return
    speak(phase.spokenCounts[count - 1])

    const interval = setTimeout(() => {
      if (count >= phase.duration) {
        const nextPhase = phaseIdx + 1
        if (nextPhase >= PHASES.length) {
          const nextCycle = cycle + 1
          if (nextCycle >= TOTAL_CYCLES) {
            speak(closingLine)
            ambientRef.current?.stop()
            setStage('done')
            onComplete()
            return
          }
          setCycle(nextCycle)
          setPhaseIdx(0)
          setCount(1)
        } else {
          setPhaseIdx(nextPhase)
          setCount(1)
        }
      } else {
        setCount(c => c + 1)
      }
    }, 1200)
    return () => clearTimeout(interval)
  }, [stage, cycle, phaseIdx, count])

  if (stage === 'opening') {
    return (
      <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 12px', minHeight: 180, opacity: openingFade, transition: 'opacity 1.2s ease' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${vibe.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🌿</div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 20, color: vibe.accent, textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>{openingLine}</div>
        <div className="mono-hint" style={{ color: vibe.muted, fontSize: 11 }}>preparing your breath...</div>
      </div>
    )
  }

  if (stage === 'done') {
    const insightTimerUrl = 'https://insighttimer.com/search?q=fertility+meditation'
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(genres.join(' ') + ' meditation calm')}`
    return (
      <div className="flex-col" style={{ alignItems: 'center', gap: 20, padding: '16px 0' }}>
        <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 18, color: vibe.accent, textAlign: 'center', lineHeight: 1.4 }}>{closingLine}</div>
        <div style={{ width: '100%', marginTop: 8 }}>
          <div className="mono-hint" style={{ color: vibe.accent, marginBottom: 10 }}>Want to go deeper?</div>
          <div className="flex-col" style={{ gap: 8 }}>
            <a href={insightTimerUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('insight_timer_tapped', {})}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${vibe.accent}33`, background: `${vibe.accent}08`, textDecoration: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>🎧</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: typo.bodyFont, color: vibe.accent }}>Guided meditation on Insight Timer</span>
            </a>
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('spotify_playlist_tapped', {})}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${vibe.accent}33`, background: `${vibe.accent}08`, textDecoration: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>🎵</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: typo.bodyFont, color: vibe.accent }}>Calm playlist on Spotify</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Breathing stage
  return (
    <div className="flex-col" style={{ alignItems: 'center', gap: 24, padding: '16px 0' }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <div className="breath-ring" style={{ inset: 0, background: `${vibe.accent}18`, transform: `scale(${phase.scale})` }} />
        <div className="breath-ring" style={{ inset: 16, background: `${vibe.accent}28`, transform: `scale(${phase.scale * 0.9})` }} />
        <div className="breath-ring flex-center" style={{ inset: 32, background: `${vibe.accent}45`, transform: `scale(${phase.scale * 0.85})` }}>
          <span style={{ fontSize: 22, fontFamily: typo.headingFont, fontWeight: typo.headingWeight, color: vibe.accent }}>{count}</span>
        </div>
      </div>
      <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 18, color: vibe.accent }}>{phase.label}</div>
      <div className="mono-hint" style={{ color: vibe.muted }}>cycle {cycle + 1} of {TOTAL_CYCLES}</div>
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
    if (localContent) { try { setContent(JSON.parse(localContent)); setLoading(false); return } catch {} }
    fetchContent()
    track('day_screen_viewed', { day_number: dayNumber, treatment_type: TREATMENT_LABELS[data.treatment] || data.treatment })
  }, [dayNumber])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-day', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, treatment: TREATMENT_LABELS[data.treatment] || data.treatment, dayNumber, totalDays: data.cycleDays, vibe: data.vibe, genres: data.genres }),
      })
      if (res.ok) { const c = await res.json(); setContent(c); localStorage.setItem(localKey, JSON.stringify(c)) }
      else throw new Error('fetch failed')
    } catch {
      setContent({ quote: 'You are doing something extraordinary.', quoteAuthor: 'Your future self', songTitle: 'Golden Hour', songArtist: 'JVKE', journalPrompt: 'What does it mean to choose this path for yourself?', affirmation: `I am ${data.name}, and I am doing enough.`, gratitudePrompt: 'What is your body doing right now that you are grateful for?', breathingOpening: `${data.name}, take a moment just for you.`, breathingClosing: `You've got this, ${data.name}.` })
    } finally { setLoading(false) }
  }

  const saveJournal = () => {
    localStorage.setItem(`${localKey}_journal`, journalText)
    setJournalSaved(true); track('journal_entry_saved', { day_number: dayNumber })
    setTimeout(() => setJournalSaved(false), 2000)
  }

  const markDone = () => { localStorage.setItem(`${localKey}_done`, '1'); setDayDone(true); onDayComplete() }
  const spotifyUrl = content ? `https://open.spotify.com/search/${encodeURIComponent(`${content.songTitle} ${content.songArtist}`)}` : ''
  // Deduplicate: meditation and breathing both render the same Guided Breathing card
  const deduped = [...data.components].sort((a, b) => COMPONENT_ORDER.indexOf(a) - COMPONENT_ORDER.indexOf(b))
  const hasBoth = deduped.includes('meditation') && deduped.includes('breathing')
  const sortedComponents = hasBoth ? deduped.filter(c => c !== 'breathing') : deduped

  const inputStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: '12px',
    fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 14, color: textColor,
    resize: 'vertical', minHeight: 90, outline: 'none', caretColor: vibe.accent, lineHeight: 1.5, boxSizing: 'border-box',
  }

  const renderComponent = (component: string) => {
    if (component === 'quote') {
      track('quote_viewed', { day_number: dayNumber })
      return (
        <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>Daily Quote</SectionLabel>
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: typo.headingWeight, fontSize: 20, color: textColor, lineHeight: 1.4, marginBottom: 8 }}>"{content?.quote}"</div>
          <div className="mono-sm" style={{ color: vibe.accent }}>— {content?.quoteAuthor}</div>
        </Card>
      )
    }
    if (component === 'anthem') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Today's Anthem</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="icon-box flex-center" style={{ width: 48, height: 48, borderRadius: 12, background: `${vibe.accent}25`, fontSize: 20 }}>🎵</div>
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
    if (component === 'meditation' || component === 'breathing') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>Guided Breathing</SectionLabel>
        {!meditationStarted ? (
          <button onClick={() => { setMeditationStarted(true); track('meditation_started', { day_number: dayNumber }) }} style={{ width: '100%', background: `${vibe.accent}15`, border: `1px solid ${vibe.accent}30`, borderRadius: 12, padding: '20px', cursor: 'pointer', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 14, color: vibe.accent }}>
            Begin · 3 cycles · ~45 seconds
          </button>
        ) : (
          <GuidedBreathing
            vibe={vibe}
            typo={typo}
            openingLine={content?.breathingOpening || `${data.name}, take a moment just for you.`}
            closingLine={content?.breathingClosing || `You've got this, ${data.name}.`}
            genres={data.genres}
            onComplete={() => track('breathing_completed', { day_number: dayNumber })}
          />
        )}
      </Card>
    )
    return null
  }

  return (
    <ScreenShell bg={vibe.bg} visible={visible} transition="opacity 0.5s ease">
      <div className="flex-between" style={{ padding: '20px 22px 10px' }}>
        <div>
          <div className="mono-hint" style={{ color: mutedColor, marginBottom: 4, letterSpacing: '0.18em' }}>Day {dayNumber} of {data.cycleDays}</div>
          <h1 className="heading-sm" style={{ fontFamily: typo.headingFont, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: textColor }}>Today</h1>
        </div>
        <button onClick={onSettings} className="flex-center" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 14 }}>⚙️</button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: 14 }}>
          <div className="spinner" style={{ width: 40, height: 40, border: `2px solid ${vibe.accent}40`, borderTop: `2px solid ${vibe.accent}` }} />
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 15, color: mutedColor }}>Preparing your day...</div>
        </div>
      ) : isLocked ? (
        <div className="flex-col gap-12" style={{ padding: '0 18px 160px', flex: 1 }}>
          {sortedComponents.slice(0, 2).map(c => (
            <div key={c} style={{ opacity: 0.35, filter: 'blur(2px)', pointerEvents: 'none' }}>{renderComponent(c)}</div>
          ))}
          <Card cardBg={cardBg} cardBorder={cardBorder} style={{ textAlign: 'center', padding: '28px 18px' }}>
            <div style={{ fontSize: 32 }}>🔒</div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 22, color: textColor, lineHeight: 1.2, marginTop: 8 }}>Day {dayNumber} is waiting for you</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, margin: '8px 0 16px' }}>3 free days done — unlock the rest of your journey</div>
            <button className="btn-primary" style={{ background: '#C4614A' }}>Unlock my full journey →</button>
            <div className="mono-xs" style={{ color: mutedColor, marginTop: 8 }}>from £5.99 one-time</div>
          </Card>
        </div>
      ) : (
        <div className="flex-col gap-12" style={{ padding: '0 18px 160px', flex: 1 }}>
          {sortedComponents.map(renderComponent)}
          <button onClick={markDone} disabled={dayDone} className="btn-primary" style={{
            background: dayDone ? `${vibe.accent}30` : vibe.accent,
            color: dayDone ? vibe.accent : 'white',
            border: dayDone ? `1px solid ${vibe.accent}50` : 'none',
            marginTop: 8, transition: 'all 0.3s',
          }}>
            {dayDone ? `✓ Day ${dayNumber} complete` : `Mark Day ${dayNumber} done ✓`}
          </button>
        </div>
      )}
    </ScreenShell>
  )
}

export default DayScreen
