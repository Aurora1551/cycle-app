import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'
import type { DayContent } from '../lib/db'
import { saveJournalEntry } from '../lib/db'
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

// Robust speech that waits for voices to load and doesn't aggressively cancel
let voicesLoaded = false
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { voicesLoaded = true }
  if (window.speechSynthesis.getVoices().length > 0) voicesLoaded = true
}

function getCalmVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  // Prefer a soft female English voice
  const preferred = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google UK English Female', 'Microsoft Zira', 'Fiona']
  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name))
    if (match) return match
  }
  // Fallback: any English voice
  return voices.find(v => v.lang.startsWith('en')) || null
}

function speak(text: string): Promise<void> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) { resolve(); return }

    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.7
      u.pitch = 0.9
      u.volume = 1.0
      const voice = getCalmVoice()
      if (voice) u.voice = voice
      u.onend = () => resolve()
      u.onerror = () => resolve()
      window.speechSynthesis.speak(u)
    }

    // If voices aren't loaded yet, wait briefly
    if (!voicesLoaded && window.speechSynthesis.getVoices().length === 0) {
      const waitForVoices = () => {
        voicesLoaded = true
        doSpeak()
      }
      window.speechSynthesis.onvoiceschanged = waitForVoices
      // Fallback if event never fires
      setTimeout(() => { voicesLoaded = true; doSpeak() }, 300)
    } else {
      doSpeak()
    }
  })
}

// Rich calming ambient music using Web Audio API
function createAmbientMusic(): { start: () => void; stop: () => void } | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0
    masterGain.connect(ctx.destination)

    // Warm low-pass filter for soft, muffled tone
    const lpFilter = ctx.createBiquadFilter()
    lpFilter.type = 'lowpass'
    lpFilter.frequency.value = 800
    lpFilter.Q.value = 0.5
    lpFilter.connect(masterGain)

    // Gentle reverb via convolver (simulated with delay)
    const delay = ctx.createDelay()
    delay.delayTime.value = 0.3
    const delayGain = ctx.createGain()
    delayGain.gain.value = 0.15
    const feedback = ctx.createGain()
    feedback.gain.value = 0.3
    delay.connect(delayGain)
    delayGain.connect(masterGain)
    delay.connect(feedback)
    feedback.connect(delay)

    // Two chord layers for richness — Cmaj9 voicing
    const chordA = [130.81, 164.81, 196.00, 246.94, 293.66] // C3, E3, G3, B3, D4
    const chordB = [138.59, 174.61, 207.65, 261.63] // C#3, F3, G#3, C4 — dreamy tension
    const oscs: OscillatorNode[] = []
    const gains: GainNode[] = []

    // Main warm pad
    chordA.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = i < 2 ? 'triangle' : 'sine'
      osc.frequency.value = freq
      osc.detune.value = (i % 2 === 0 ? 4 : -4)
      const g = ctx.createGain()
      g.gain.value = 0.04
      osc.connect(g)
      g.connect(lpFilter)
      g.connect(delay)
      oscs.push(osc)
      gains.push(g)
    })

    // Subtle high shimmer layer
    chordB.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * 2 // octave up
      osc.detune.value = (i % 2 === 0 ? 6 : -6)
      const g = ctx.createGain()
      g.gain.value = 0.008 // very quiet
      osc.connect(g)
      g.connect(lpFilter)
      oscs.push(osc)
      gains.push(g)
    })

    // Slow LFO to gently swell the volume
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.08 // very slow ~12s cycle
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.015
    lfo.connect(lfoGain)
    lfoGain.connect(masterGain.gain)

    return {
      start() {
        oscs.forEach(o => o.start())
        lfo.start()
        masterGain.gain.setTargetAtTime(0.9, ctx.currentTime, 2.0) // gentle fade in
      },
      stop() {
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 1.2) // fade out
        setTimeout(() => {
          oscs.forEach(o => { try { o.stop() } catch {} })
          try { lfo.stop() } catch {}
          ctx.close()
        }, 3500)
      },
    }
  } catch { return null }
}

const PHASES = [
  { label: 'Breathe in...', spokenCounts: ['1...', '2...', '3...', '4...'], duration: 4, scale: 1.4 },
  { label: 'Hold...', spokenCounts: ['1...', '2...', '3...', '4...'], duration: 4, scale: 1.4 },
  { label: 'Breathe out...', spokenCounts: ['1...', '2...', '3...', '4...', '5...', '6...'], duration: 6, scale: 1.0 },
]
const TOTAL_CYCLES = 3

interface GuidedBreathingProps {
  vibe: typeof VIBES[0]
  typo: ReturnType<typeof resolveTypo>
  openingLine: string
  closingLine: string
  genres: string[]
  onComplete: () => void
  onStop: () => void
}

function GuidedBreathing({ vibe, typo, openingLine, closingLine, genres, onComplete, onStop }: GuidedBreathingProps) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<'opening' | 'breathing' | 'done'>('opening')
  const [cycle, setCycle] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [count, setCount] = useState(1)
  const [openingFade, setOpeningFade] = useState(0)
  const ambientRef = React.useRef<ReturnType<typeof createAmbientMusic>>(null)
  const phase = PHASES[phaseIdx]

  const stopMeditation = () => {
    try { window.speechSynthesis?.cancel() } catch {}
    ambientRef.current?.stop()
    onStop()
  }

  // Start ambient music + speak opening line, then transition after speech finishes
  useEffect(() => {
    ambientRef.current = createAmbientMusic()
    ambientRef.current?.start()
    setOpeningFade(1)

    const run = async () => {
      await speak(openingLine)
      await new Promise(r => setTimeout(r, 1500))
      setStage('breathing')
    }
    run()

    return () => { try { window.speechSynthesis?.cancel() } catch {}; ambientRef.current?.stop() }
  }, [])

  // Breathing timer — 2s per count for a calm, natural pace
  useEffect(() => {
    if (stage !== 'breathing') return
    // Cancel any lingering speech before the next count
    try { window.speechSynthesis?.cancel() } catch {}
    // Small delay to let cancel settle before speaking
    const speakTimeout = setTimeout(() => {
      if (count === 1) {
        speak(phase.label.replace('...', '') + '... 1')
      } else {
        speak(String(count))
      }
    }, 50)

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
    }, 2000)
    return () => { clearTimeout(speakTimeout); clearTimeout(interval) }
  }, [stage, cycle, phaseIdx, count])

  if (stage === 'opening') {
    return (
      <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 12px', minHeight: 200, opacity: openingFade, transition: 'opacity 1.2s ease' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${vibe.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌿</div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 20, color: vibe.accent, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>{openingLine}</div>
        <div className="mono-hint" style={{ color: vibe.muted, fontSize: 11 }}>{t('day.preparingBreath')}</div>
        <button onClick={stopMeditation} style={{ background: `${vibe.accent}15`, border: `1.5px solid ${vibe.accent}35`, borderRadius: 24, padding: '10px 28px', cursor: 'pointer', fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 600, color: vibe.accent, marginTop: 8 }}>{t('day.stop')}</button>
      </div>
    )
  }

  if (stage === 'done') {
    const insightTimerUrl = 'https://insighttimer.com/search?q=fertility+meditation'
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(genres.join(' ') + ' meditation calm')}`
    return (
      <div className="flex-col" style={{ alignItems: 'center', gap: 20, padding: '16px 0' }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>✨</div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 20, color: vibe.accent, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>{closingLine}</div>
        <div className="mono-hint" style={{ color: vibe.muted, fontSize: 11 }}>{t('day.breathingComplete')}</div>
        <div style={{ width: '100%', marginTop: 8 }}>
          <div className="mono-hint" style={{ color: vibe.accent, marginBottom: 10 }}>{t('day.goDeeper')}</div>
          <div className="flex-col" style={{ gap: 8 }}>
            <a href={insightTimerUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('insight_timer_tapped', {})}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${vibe.accent}33`, background: `${vibe.accent}08`, textDecoration: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>🎧</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: typo.bodyFont, color: vibe.accent }}>{t('day.insightTimer')}</span>
            </a>
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('spotify_playlist_tapped', {})}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${vibe.accent}33`, background: `${vibe.accent}08`, textDecoration: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>🎵</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: typo.bodyFont, color: vibe.accent }}>{t('day.spotifyCalm')}</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Breathing stage
  return (
    <div className="flex-col" style={{ alignItems: 'center', gap: 24, padding: '16px 0' }}>
      <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 18, color: vibe.accent }}>{phaseIdx === 0 ? t('day.breatheIn') : phaseIdx === 1 ? t('day.hold') : t('day.breatheOut')}</div>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <div className="breath-ring" style={{ inset: 0, background: `${vibe.accent}18`, transform: `scale(${phase.scale})` }} />
        <div className="breath-ring" style={{ inset: 16, background: `${vibe.accent}28`, transform: `scale(${phase.scale * 0.9})` }} />
        <div className="breath-ring flex-center" style={{ inset: 32, background: `${vibe.accent}45`, transform: `scale(${phase.scale * 0.85})`, flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 28, fontFamily: typo.headingFont, fontWeight: typo.headingWeight, color: vibe.accent }}>{count}</span>
          <button onClick={stopMeditation} style={{ background: `${vibe.accent}20`, border: `1.5px solid ${vibe.accent}40`, borderRadius: 20, padding: '6px 18px', cursor: 'pointer', fontFamily: typo.bodyFont, fontSize: 13, fontWeight: 600, color: vibe.accent }}>{t('day.stop')}</button>
        </div>
      </div>
      <div className="mono-hint" style={{ color: vibe.muted }}>{t('day.cycleOf', { current: cycle + 1, total: TOTAL_CYCLES })}</div>
    </div>
  )
}

const DayScreen: React.FC<Props> = ({ data, dayNumber, isPremium, onDayComplete, onSettings }) => {
  const { t } = useTranslation()
  const [content, setContent] = useState<DayContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [journalText, setJournalText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [dayDone, setDayDone] = useState(false)
  const [meditationStarted, setMeditationStarted] = useState(false)
  const visible = useFadeIn(80)

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)
  const isLocked = !isPremium && dayNumber > 3
  // Cache key includes user name + vibe to bust cache when profile changes
  const localKey = `cycle_content_${data.name}_${data.vibe}_day${dayNumber}`

  useEffect(() => {
    if (localStorage.getItem(`cycle_day_${dayNumber}_done`) === '1') setDayDone(true)
    setJournalText(localStorage.getItem(`cycle_day_${dayNumber}_journal`) || '')
  }, [])

  useEffect(() => {
    // Check localStorage cache for this specific user+day combo
    const cached = localStorage.getItem(localKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        // Only use cache if it has real API content (not placeholder)
        if (parsed.quote && parsed.quoteAuthor && !parsed.error) {
          setContent(parsed)
          setLoading(false)
          return
        }
      } catch {}
    }
    fetchContent()
    track('day_screen_viewed', { day_number: dayNumber, treatment_type: TREATMENT_LABELS[data.treatment] || data.treatment })
  }, [dayNumber])

  const fetchContent = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-day', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, treatment: TREATMENT_LABELS[data.treatment] || data.treatment, dayNumber, totalDays: data.cycleDays, vibe: data.vibe, genres: data.genres, userId: data.name, language: localStorage.getItem('cycle_language') || 'en' }),
      })
      const body = await res.json()
      if (!res.ok || body.error) {
        throw new Error(body.message || 'Content generation failed')
      }
      setContent(body)
      localStorage.setItem(localKey, JSON.stringify(body))
    } catch (err: any) {
      setError(err.message || 'Unable to load your content right now')
      setContent(null)
    } finally { setLoading(false) }
  }

  const saveJournal = () => {
    localStorage.setItem(`${localKey}_journal`, journalText)
    saveJournalEntry(data.name, dayNumber, journalText)
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
          <SectionLabel color={vibe.accent}>{t('day.dailyQuote')}</SectionLabel>
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: typo.headingWeight, fontSize: 20, color: textColor, lineHeight: 1.4, marginBottom: 8 }}>"{content?.quote}"</div>
          <div className="mono-sm" style={{ color: vibe.accent }}>— {content?.quoteAuthor}</div>
        </Card>
      )
    }
    if (component === 'anthem') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>{t('day.todaysAnthem')}</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="icon-box flex-center" style={{ width: 48, height: 48, borderRadius: 12, background: `${vibe.accent}25`, fontSize: 20 }}>🎵</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: typo.bodyFont }}>{content?.songTitle}</div>
            <div style={{ fontSize: 12, color: mutedColor, fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight }}>{content?.songArtist}</div>
          </div>
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('song_played', { day_number: dayNumber })} style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('day.spotify')}</a>
        </div>
      </Card>
    )
    if (component === 'affirmation') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>{t('day.affirmation')}</SectionLabel>
        <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 24, fontWeight: typo.headingWeight, color: vibe.accent, lineHeight: 1.3, textAlign: 'center', padding: '8px 0' }}>{content?.affirmation}</div>
      </Card>
    )
    if (component === 'journal') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>{t('day.journal')}</SectionLabel>
        <div style={{ fontSize: 14, color: textColor, fontFamily: typo.headingFont, fontStyle: 'italic', lineHeight: 1.4, marginBottom: 12 }}>{content?.journalPrompt}</div>
        <textarea value={journalText} onChange={e => setJournalText(e.target.value)} placeholder={t('day.writePlaceholder')} style={inputStyle} />
        <button onClick={saveJournal} style={{ marginTop: 8, background: journalSaved ? `${vibe.accent}20` : vibe.accent, color: journalSaved ? vibe.accent : 'white', border: journalSaved ? `1px solid ${vibe.accent}40` : 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: typo.bodyFont, transition: 'all 0.2s' }}>
          {journalSaved ? t('day.saved') : t('day.saveEntry')}
        </button>
      </Card>
    )
    if (component === 'gratitude') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>{t('day.gratitude')}</SectionLabel>
        <div style={{ fontSize: 14, color: textColor, fontFamily: typo.headingFont, fontStyle: 'italic', lineHeight: 1.4 }}>{content?.gratitudePrompt}</div>
      </Card>
    )
    if (component === 'meditation' || component === 'breathing') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>{t('day.guidedBreathing')}</SectionLabel>
        {!meditationStarted ? (
          <button onClick={() => { setMeditationStarted(true); track('meditation_started', { day_number: dayNumber }) }} style={{ width: '100%', background: `${vibe.accent}15`, border: `1px solid ${vibe.accent}30`, borderRadius: 12, padding: '20px', cursor: 'pointer', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 14, color: vibe.accent }}>
            {t('day.startMeditation')}
          </button>
        ) : (
          <GuidedBreathing
            vibe={vibe}
            typo={typo}
            openingLine={content?.breathingOpening || `${data.name}, take a moment just for you.`}
            closingLine={content?.breathingClosing || `You've got this, ${data.name}.`}
            genres={data.genres}
            onComplete={() => track('breathing_completed', { day_number: dayNumber })}
            onStop={() => setMeditationStarted(false)}
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
          <div className="mono-hint" style={{ color: mutedColor, marginBottom: 4, letterSpacing: '0.18em' }}>{t('day.dayOf', { day: dayNumber, total: data.cycleDays })}</div>
          <h1 className="heading-sm" style={{ fontFamily: typo.headingFont, fontWeight: typo.headingWeight, fontStyle: typo.headingStyle, color: textColor }}>{t('day.today')}</h1>
        </div>
        <button onClick={onSettings} className="flex-center" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 14 }}>⚙️</button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: 14 }}>
          <div className="spinner" style={{ width: 40, height: 40, border: `2px solid ${vibe.accent}40`, borderTop: `2px solid ${vibe.accent}` }} />
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 15, color: mutedColor }}>{t('day.loading')}</div>
        </div>
      ) : error ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: 14, padding: '0 24px' }}>
          <div style={{ fontSize: 32 }}>✨</div>
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 16, color: textColor, textAlign: 'center', lineHeight: 1.4 }}>{t('day.contentPreparing')}</div>
          <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: mutedColor, textAlign: 'center', lineHeight: 1.5 }}>{error}</div>
          <button onClick={fetchContent} style={{ marginTop: 8, background: vibe.accent, color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: typo.bodyFont }}>
            {t('day.tryAgain')}
          </button>
        </div>
      ) : isLocked ? (
        <div className="flex-col gap-12" style={{ padding: '0 18px 160px', flex: 1 }}>
          {sortedComponents.slice(0, 2).map(c => (
            <div key={c} style={{ opacity: 0.35, filter: 'blur(2px)', pointerEvents: 'none' }}>{renderComponent(c)}</div>
          ))}
          <Card cardBg={cardBg} cardBorder={cardBorder} style={{ textAlign: 'center', padding: '28px 18px' }}>
            <div style={{ fontSize: 32 }}>🔒</div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 22, color: textColor, lineHeight: 1.2, marginTop: 8 }}>{t('day.lockedHeading', { day: dayNumber })}</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, margin: '8px 0 16px' }}>{t('day.lockedMessage')}</div>
            <button className="btn-primary" style={{ background: '#C4614A' }}>{t('day.unlockButton')}</button>
            <div className="mono-xs" style={{ color: mutedColor, marginTop: 8 }}>{t('day.unlockHint')}</div>
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
            {dayDone ? t('day.dayComplete', { day: dayNumber }) : t('day.markDone', { day: dayNumber })}
          </button>
        </div>
      )}
    </ScreenShell>
  )
}

export default DayScreen
