import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'
import type { DayContent } from '../lib/db'
import { saveJournalEntry } from '../lib/db'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { TREATMENT_LABELS, COMPONENT_ORDER, VIBE_CONTENT } from '../lib/constants'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, Card, SectionLabel } from '../components/ui'
import { track } from '../lib/posthog'
import { searchSpotifyTrack, getSpotifyStatus } from '../lib/spotify'

interface Props {
  data: OnboardingData
  dayNumber: number
  isPremium: boolean
  onDayComplete: () => void
  onSettings: () => void
  onGoToDay?: (day: number) => void
  onUnlock?: () => void
  onEndOfCycle?: () => void
}

// --- Speech helpers ---
let voicesLoaded = false
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { voicesLoaded = true }
  if (window.speechSynthesis.getVoices().length > 0) voicesLoaded = true
}

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const preferred = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google UK English Female', 'Microsoft Zira', 'Fiona']
  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name))
    if (match) return match
  }
  return voices.find(v => v.lang.startsWith('en')) || null
}

function speak(text: string): Promise<void> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) { resolve(); return }
    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.75
      u.pitch = 0.9
      u.volume = 1.0
      const voice = getBestVoice()
      if (voice) u.voice = voice
      u.onend = () => resolve()
      u.onerror = () => resolve()
      window.speechSynthesis.speak(u)
    }
    if (!voicesLoaded && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => { voicesLoaded = true; doSpeak() }
      setTimeout(() => { voicesLoaded = true; doSpeak() }, 300)
    } else {
      doSpeak()
    }
  })
}

// --- Brown noise generator (warm, calming — not harsh white noise) ---
function createBrownNoise(): { start: () => void; fadeOut: () => Promise<void>; kill: () => void } | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const bufferSize = 4096
    const brownNode = ctx.createScriptProcessor(bufferSize, 1, 1)
    let lastOut = 0.0
    brownNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        lastOut = (lastOut + 0.02 * white) / 1.02
        output[i] = lastOut * 3.5
      }
    }
    // Low-pass filter to soften further
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 500
    const gain = ctx.createGain()
    gain.gain.value = 0
    brownNode.connect(lp)
    lp.connect(gain)
    gain.connect(ctx.destination)

    return {
      start() {
        // Gentle 3s fade in to target volume
        gain.gain.setTargetAtTime(0.25, ctx.currentTime, 1.0)
      },
      fadeOut() {
        return new Promise<void>(resolve => {
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5) // ~2s fade
          setTimeout(() => {
            try { brownNode.disconnect(); lp.disconnect(); gain.disconnect(); ctx.close() } catch {}
            resolve()
          }, 2000)
        })
      },
      kill() {
        try { gain.gain.value = 0; brownNode.disconnect(); lp.disconnect(); gain.disconnect(); ctx.close() } catch {}
      },
    }
  } catch { return null }
}

// --- Breathing phases ---
const PHASES: { label: string; spokenLabel: string; duration: number; scale: number }[] = [
  { label: 'Breathe in...', spokenLabel: 'Breathe in', duration: 4, scale: 1.35 },
  { label: 'Hold...', spokenLabel: 'Hold', duration: 4, scale: 1.35 },
  { label: 'Breathe out...', spokenLabel: 'Breathe out', duration: 6, scale: 1.0 },
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
  const [countdown, setCountdown] = useState(4) // counts DOWN
  const [openingFade, setOpeningFade] = useState(0)
  const noiseRef = React.useRef<ReturnType<typeof createBrownNoise>>(null)
  const stoppedRef = React.useRef(false)
  const phase = PHASES[phaseIdx]

  // Compute circle scale based on current phase for smooth CSS transition
  const circleScale = stage === 'breathing' ? phase.scale : 1.0

  const stopMeditation = async () => {
    stoppedRef.current = true
    try { window.speechSynthesis?.cancel() } catch {}
    if (noiseRef.current) {
      await noiseRef.current.fadeOut()
      noiseRef.current = null
    }
    onStop()
  }

  // Start brown noise + speak opening line
  useEffect(() => {
    noiseRef.current = createBrownNoise()
    noiseRef.current?.start()
    setOpeningFade(1)

    const run = async () => {
      await speak(openingLine)
      if (stoppedRef.current) return
      await new Promise(r => setTimeout(r, 1200))
      if (stoppedRef.current) return
      setStage('breathing')
    }
    run()

    return () => {
      stoppedRef.current = true
      try { window.speechSynthesis?.cancel() } catch {}
      noiseRef.current?.kill()
    }
  }, [])

  // Breathing timer — 1 tick per second
  useEffect(() => {
    if (stage !== 'breathing' || stoppedRef.current) return

    // Speak phase name ONLY at the start of each phase (when countdown equals duration)
    if (countdown === phase.duration) {
      speak(phase.spokenLabel)
    }

    const timer = setTimeout(() => {
      if (stoppedRef.current) return

      if (countdown <= 1) {
        // Phase complete — move to next
        const nextPhase = phaseIdx + 1
        if (nextPhase >= PHASES.length) {
          // Cycle complete
          const nextCycle = cycle + 1
          if (nextCycle >= TOTAL_CYCLES) {
            // All cycles done — closing
            try { window.speechSynthesis?.cancel() } catch {}
            speak(closingLine)
            if (noiseRef.current) {
              noiseRef.current.fadeOut().then(() => { noiseRef.current = null })
            }
            setStage('done')
            onComplete()
            return
          }
          setCycle(nextCycle)
          setPhaseIdx(0)
          setCountdown(PHASES[0].duration)
        } else {
          setPhaseIdx(nextPhase)
          setCountdown(PHASES[nextPhase].duration)
        }
      } else {
        setCountdown(c => c - 1)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [stage, cycle, phaseIdx, countdown])

  // --- Opening stage ---
  if (stage === 'opening') {
    return (
      <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 12px', minHeight: 200, opacity: openingFade, transition: 'opacity 1.2s ease' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${vibe.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌿</div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 20, color: vibe.accent, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>{openingLine}</div>
        <div className="mono-hint" style={{ color: vibe.muted, fontSize: 11 }}>{t('day.preparingBreath')}</div>
        <button onClick={stopMeditation} style={{ background: `${vibe.accent}15`, border: `1.5px solid ${vibe.accent}35`, borderRadius: 24, padding: '10px 28px', cursor: 'pointer', fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 600, color: vibe.accent, marginTop: 8 }}>{t('day.stop')}</button>
      </div>
    )
  }

  // --- Done stage ---
  if (stage === 'done') {
    const insightTimerUrl = 'https://insighttimer.com/search?q=fertility+meditation'
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(genres.join(' ') + ' meditation calm')}`
    return (
      <div className="flex-col" style={{ alignItems: 'center', gap: 20, padding: '16px 0' }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>✨</div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 20, color: vibe.accent, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>{closingLine}</div>
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

  // --- Breathing stage ---
  // The circle scale is driven by CSS transition on .breath-ring (transition: transform 1s ease-in-out)
  return (
    <div className="flex-col" style={{ alignItems: 'center', gap: 12, padding: '16px 0' }}>
      {/* Breathing circle */}
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <div className="breath-ring" style={{ inset: 0, background: `${vibe.accent}15`, transform: `scale(${circleScale})` }} />
        <div className="breath-ring" style={{ inset: 18, background: `${vibe.accent}22`, transform: `scale(${circleScale * 0.95})` }} />
        <div className="breath-ring flex-center" style={{ inset: 36, background: `${vibe.accent}38`, transform: `scale(${circleScale * 0.9})` }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 14, color: vibe.accent, opacity: 0.85 }}>
              {phase.label}
            </div>
            <div style={{ fontFamily: typo.headingFont, fontWeight: 700, fontSize: 40, color: vibe.accent, lineHeight: 1 }}>
              {countdown}
            </div>
          </div>
        </div>
      </div>

      {/* Cycle indicator */}
      <div className="mono-hint" style={{ color: vibe.muted, marginTop: 4 }}>{t('day.cycleOf', { current: cycle + 1, total: TOTAL_CYCLES })}</div>

      {/* Stop button */}
      <button onClick={stopMeditation} style={{
        background: `${vibe.accent}15`, border: `1.5px solid ${vibe.accent}35`, borderRadius: 24,
        padding: '10px 28px', cursor: 'pointer', fontFamily: typo.bodyFont, fontSize: 14,
        fontWeight: 600, color: vibe.accent, marginTop: 8,
      }}>{t('day.stop')}</button>
    </div>
  )
}

const DayScreen: React.FC<Props> = ({ data, dayNumber, isPremium, onDayComplete, onSettings, onGoToDay, onUnlock, onEndOfCycle }) => {
  const { t } = useTranslation()
  const [content, setContent] = useState<DayContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [journalText, setJournalText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [dayDone, setDayDone] = useState(() => localStorage.getItem(`cycle_day_${dayNumber}_done`) === '1')
  const [meditationStarted, setMeditationStarted] = useState(false)
  const [spotifyConnected, setSpotifyConnected] = useState(() => localStorage.getItem('spotify_connected') === '1')
  const [spotifyTrack, setSpotifyTrack] = useState<{ trackUri: string; trackUrl: string } | null>(null)
  const [showSpotifyPopup, setShowSpotifyPopup] = useState(false)
  const visible = useFadeIn(80)

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)
  const vibeContent = VIBE_CONTENT[data.vibe || 'fierce'] || VIBE_CONTENT.fierce
  const isLocked = !isPremium && dayNumber > 3
  // Which days are completed (for dot grid)
  const completedDays = React.useMemo(() => {
    const set = new Set<number>()
    for (let d = 1; d <= data.cycleDays; d++) {
      if (localStorage.getItem(`cycle_day_${d}_done`) === '1') set.add(d)
    }
    return set
  }, [data.cycleDays, dayDone, dayNumber])
  // Cache key includes user name + vibe to bust cache when profile changes
  const localKey = `cycle_content_${data.name}_${data.vibe}_day${dayNumber}`

  // Reset state when day changes and scroll to top
  useEffect(() => {
    setDayDone(localStorage.getItem(`cycle_day_${dayNumber}_done`) === '1')
    setJournalText(localStorage.getItem(`cycle_day_${dayNumber}_journal`) || '')
    setMeditationStarted(false)
    setJournalSaved(false)
    // Scroll to top of screen
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [dayNumber])

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

  // Search Spotify for the exact track when content is available and user is connected
  useEffect(() => {
    if (!content?.songTitle || !content?.songArtist) return
    // Re-check connection status
    getSpotifyStatus(data.name).then(status => {
      setSpotifyConnected(status.connected)
      if (!status.connected) {
        localStorage.removeItem('spotify_connected')
        return
      }
      localStorage.setItem('spotify_connected', '1')
      searchSpotifyTrack(data.name, content.songTitle, content.songArtist).then(result => {
        if (result.found && result.trackUri && result.trackUrl) {
          setSpotifyTrack({ trackUri: result.trackUri, trackUrl: result.trackUrl })
        } else {
          setSpotifyTrack(null)
          track('spotify_search_fallback', { song: content.songTitle, artist: content.songArtist })
        }
      })
    })
  }, [content?.songTitle, content?.songArtist, data.name])

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

  const markDone = () => {
    if (dayDone) return
    localStorage.setItem(`cycle_day_${dayNumber}_done`, '1')
    setDayDone(true)
    track('day_marked_done', { day_number: dayNumber })
    onDayComplete()
  }

  const unmarkDone = () => {
    localStorage.removeItem(`cycle_day_${dayNumber}_done`)
    setDayDone(false)
  }
  const spotifySearchUrl = content ? `https://open.spotify.com/search/${encodeURIComponent(`${content.songTitle} ${content.songArtist}`)}` : ''
  // Deduplicate: meditation and breathing both render the same Guided Breathing card
  const deduped = [...data.components].sort((a, b) => COMPONENT_ORDER.indexOf(a) - COMPONENT_ORDER.indexOf(b))
  const hasBoth = deduped.includes('meditation') && deduped.includes('breathing')
  const sortedComponents = hasBoth ? deduped.filter(c => c !== 'breathing') : deduped

  const inputStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: '12px',
    fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 14, color: textColor,
    resize: 'vertical', minHeight: 90, outline: 'none', caretColor: vibe.accent, lineHeight: 1.5, boxSizing: 'border-box',
  }

  // Renders emoji + label text in DM Mono uppercase
  const vibeLabel = (label: { emoji: string; text: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{label.emoji}</span>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
        color: vibe.accent, letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>{label.text}</span>
    </div>
  )

  const renderComponent = (component: string) => {
    if (component === 'quote') {
      track('quote_viewed', { day_number: dayNumber })
      return (
        <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
          {vibeLabel(vibeContent.labels.quote)}
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: typo.headingWeight, fontSize: 20, color: textColor, lineHeight: 1.4, marginBottom: 8 }}>"{content?.quote}"</div>
          <div className="mono-sm" style={{ color: vibe.accent }}>— {content?.quoteAuthor}</div>
        </Card>
      )
    }
    if (component === 'anthem') {
      const handleSpotifyTap = (e: React.MouseEvent) => {
        if (spotifyConnected && spotifyTrack) {
          e.preventDefault()
          track('spotify_track_opened', { song: content?.songTitle || '', artist: content?.songArtist || '' })
          const appLink = spotifyTrack.trackUri
          const webLink = spotifyTrack.trackUrl
          const start = Date.now()
          window.location.href = appLink
          setTimeout(() => {
            if (Date.now() - start < 2000) window.open(webLink, '_blank')
          }, 1500)
        } else {
          // Not connected — show popup instead of navigating
          e.preventDefault()
          setShowSpotifyPopup(true)
        }
      }
      const spotifyHref = spotifyConnected && spotifyTrack ? spotifyTrack.trackUrl : spotifySearchUrl
      return (
        <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
          {vibeLabel(vibeContent.labels.anthem)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="icon-box flex-center" style={{ width: 48, height: 48, borderRadius: 12, background: `${vibe.accent}25`, fontSize: 20 }}>🎵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: typo.bodyFont }}>{content?.songTitle}</div>
              <div style={{ fontSize: 12, color: mutedColor, fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight }}>{content?.songArtist}</div>
            </div>
            <a href={spotifyHref} target="_blank" rel="noopener noreferrer" onClick={handleSpotifyTap} style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('day.spotify')}</a>
          </div>
        </Card>
      )
    }
    if (component === 'affirmation') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        {vibeLabel(vibeContent.labels.affirmation)}
        <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 24, fontWeight: typo.headingWeight, color: vibe.accent, lineHeight: 1.3, textAlign: 'center', padding: '8px 0' }}>{content?.affirmation}</div>
      </Card>
    )
    if (component === 'journal') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        {vibeLabel(vibeContent.labels.journal)}
        <div style={{ fontSize: 14, color: textColor, fontFamily: typo.headingFont, fontStyle: 'italic', lineHeight: 1.4, marginBottom: 12 }}>{content?.journalPrompt}</div>
        <textarea value={journalText} onChange={e => setJournalText(e.target.value)} placeholder={t('day.writePlaceholder')} style={inputStyle} />
        <button onClick={saveJournal} style={{ marginTop: 8, background: journalSaved ? `${vibe.accent}20` : vibe.accent, color: journalSaved ? vibe.accent : 'white', border: journalSaved ? `1px solid ${vibe.accent}40` : 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: typo.bodyFont, transition: 'all 0.2s' }}>
          {journalSaved ? t('day.saved') : t('day.saveEntry')}
        </button>
      </Card>
    )
    if (component === 'gratitude') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        {vibeLabel(vibeContent.labels.gratitude)}
        <div style={{ fontSize: 14, color: textColor, fontFamily: typo.headingFont, fontStyle: 'italic', lineHeight: 1.4 }}>{content?.gratitudePrompt}</div>
      </Card>
    )
    if (component === 'meditation' || component === 'breathing') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        {vibeLabel(vibeContent.labels.breathing)}
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
    <>
    <ScreenShell bg={vibe.bg} visible={visible} transition="opacity 0.5s ease">
      {/* Header — centered tagline, title, subtitle + settings icon top-right */}
      <div style={{ padding: '20px 22px 0', position: 'relative' }}>
        <button onClick={onSettings} className="flex-center" style={{ position: 'absolute', top: 20, right: 22, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 14, zIndex: 1 }}>⚙️</button>
        <div style={{ textAlign: 'center' }}>
          {/* Tagline */}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: vibe.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, textShadow: `0 0 8px ${vibe.accent}60` }}>
            {vibeContent.dayHeader.tagline}
          </div>
          {/* Title */}
          <div style={{
            fontFamily: (data.vibe === 'lighthearted') ? "'Nunito', sans-serif" : "'Cormorant Garamond', serif",
            fontWeight: (data.vibe === 'fierce' || data.vibe === 'nurturing') ? 700 : (data.vibe === 'lighthearted') ? 700 : (data.vibe === 'calm') ? 300 : 400,
            fontStyle: (data.vibe === 'lighthearted') ? 'normal' : 'italic',
            fontSize: 36,
            color: (data.vibe === 'fierce') ? '#FDF6F0' : (data.vibe === 'nurturing') ? '#3D1810' : (data.vibe === 'calm') ? '#E8F4F0' : (data.vibe === 'lighthearted') ? '#1A0A00' : '#F0EAF8',
            lineHeight: 1.2,
            marginBottom: 6,
          }}>
            {vibeContent.dayHeader.title}
          </div>
          {/* Subtitle */}
          <div style={{
            fontFamily: (data.vibe === 'lighthearted') ? "'Nunito', sans-serif" : "'Karla', sans-serif",
            fontWeight: (data.vibe === 'lighthearted') ? 400 : 300,
            fontSize: 14,
            color: (data.vibe === 'fierce') ? '#E8A598' : (data.vibe === 'nurturing') ? '#C47A6A' : (data.vibe === 'calm') ? '#7FB5A0' : (data.vibe === 'lighthearted') ? '#D4820A' : '#C4A8E8',
            marginBottom: 12,
          }}>
            {vibeContent.dayHeader.subtitle}
          </div>
        </div>
        {/* Today — left-aligned, smaller */}
        <h1 style={{
          fontFamily: (data.vibe === 'lighthearted') ? "'Nunito', sans-serif" : "'Cormorant Garamond', serif",
          fontWeight: (data.vibe === 'fierce') ? 900 : (data.vibe === 'lighthearted') ? 700 : (data.vibe === 'calm') ? 300 : undefined,
          fontStyle: 'italic',
          fontSize: 24,
          color: (data.vibe === 'fierce') ? '#FDF6F0' : (data.vibe === 'nurturing') ? '#3D1810' : (data.vibe === 'calm') ? '#E8F4F0' : (data.vibe === 'lighthearted') ? '#1A0A00' : '#F0EAF8',
          margin: '0 0 6px',
          lineHeight: 1.1,
        }}>
          {t('day.today')}
        </h1>
      </div>

      {/* Day Box Card */}
      <div style={{ padding: '0 18px 8px' }}>
        <Card cardBg={cardBg} cardBorder={cardBorder} style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left side: You're on + day number + of X days */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, color: mutedColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>You're on day</div>
              <div style={{
                fontFamily: (data.vibe === 'lighthearted') ? "'Nunito', sans-serif" : "'Cormorant Garamond', serif",
                fontWeight: 900,
                fontSize: 56,
                color: (data.vibe === 'fierce') ? '#FDF6F0' : (data.vibe === 'nurturing') ? '#3D1810' : (data.vibe === 'calm') ? '#E8F4F0' : (data.vibe === 'lighthearted') ? '#1A0A00' : '#F0EAF8',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {dayNumber}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, color: mutedColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                of {data.cycleDays} days
              </div>
            </div>
            {/* Right side: clickable dots grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignSelf: 'center' }}>
              {Array.from({ length: data.cycleDays }, (_, i) => i + 1).map(d => {
                const isDone = completedDays.has(d)
                const isToday = d === dayNumber
                const isFuture = !isDone && !isToday
                const dotSize = isToday ? 12 : 8
                const canNavigate = isDone || d <= dayNumber || (isPremium || d <= 3)
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (!isPremium && d > 3) { onUnlock?.(); return }
                      onGoToDay?.(d)
                    }}
                    style={{
                      width: dotSize, height: dotSize, borderRadius: '50%', padding: 0,
                      background: isDone ? vibe.accent : isToday ? '#F5C842' : `${mutedColor}25`,
                      border: isToday ? '1.5px solid #F5C842' : 'none',
                      boxShadow: isToday ? '0 0 6px #F5C84280' : 'none',
                      opacity: isFuture ? 0.35 : 1,
                      transition: 'all 0.3s',
                      margin: 'auto',
                      cursor: 'pointer',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </Card>
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
        <div className="flex-col gap-12" style={{ padding: '0 18px 140px', flex: 1 }}>
          {sortedComponents.slice(0, 2).map(c => (
            <div key={c} style={{ opacity: 0.35, filter: 'blur(2px)', pointerEvents: 'none' }}>{renderComponent(c)}</div>
          ))}
          <Card cardBg={cardBg} cardBorder={cardBorder} style={{ textAlign: 'center', padding: '28px 18px' }}>
            <div style={{ fontSize: 32 }}>🔒</div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 22, color: textColor, lineHeight: 1.2, marginTop: 8 }}>{t('day.lockedHeading', { day: dayNumber })}</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, margin: '8px 0 16px' }}>{t('day.lockedMessage')}</div>
            <button onClick={onUnlock} className="btn-primary" style={{ background: '#C4614A' }}>{t('day.unlockButton')}</button>
            <div className="mono-xs" style={{ color: mutedColor, marginTop: 8 }}>{t('day.unlockHint')}</div>
          </Card>
        </div>
      ) : (
        <div className="flex-col gap-12" style={{ padding: '0 18px 140px', flex: 1 }}>
          {sortedComponents.map(renderComponent)}
          {/* Friend note card */}
          <Card cardBg={cardBg} cardBorder={cardBorder}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>{vibeContent.friendNote.emoji}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
                color: vibe.accent, letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>{vibeContent.friendNote.heading}</span>
            </div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: typo.headingWeight, fontSize: 16, color: textColor, lineHeight: 1.5, textAlign: 'center', padding: '8px 4px' }}>
              {content?.friendNote || vibeContent.friendNote.text.replace('[name]', data.name).replace('[X]', String(dayNumber))}
            </div>
            <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: vibe.accent, textAlign: 'center', marginTop: 8 }}>
              I am so proud of you 🔥
            </div>
          </Card>
        </div>
      )}
      {/* Spotify connect popup */}
      {showSpotifyPopup && (
        <div className="modal-overlay modal-overlay-dark modal-center" onClick={() => setShowSpotifyPopup(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, background: isDark ? '#1a1a1a' : '#fff', borderRadius: 20, padding: '28px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#1DB954" style={{ marginBottom: 12 }}><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 20, color: isDark ? '#fff' : '#1a1a1a', marginBottom: 6 }}>Listen on Spotify</div>
            <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : '#888', lineHeight: 1.5, marginBottom: 20 }}>
              Connect your account in Settings for the best experience, or open Spotify directly.
            </div>
            <button onClick={() => { setShowSpotifyPopup(false); onSettings() }} style={{
              width: '100%', background: '#1DB954', border: 'none', borderRadius: 12,
              padding: '14px', fontFamily: typo.bodyFont, fontWeight: 700, fontSize: 14,
              color: 'white', cursor: 'pointer', marginBottom: 10,
            }}>
              Connect Spotify
            </button>
            <button onClick={() => {
              setShowSpotifyPopup(false)
              track('song_played', { day_number: dayNumber })
              window.open(spotifySearchUrl, '_blank')
            }} style={{
              width: '100%', background: 'transparent', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 12, padding: '13px', fontFamily: typo.bodyFont, fontSize: 14,
              color: isDark ? 'rgba(255,255,255,0.6)' : '#666', cursor: 'pointer',
            }}>
              Open Spotify without connecting
            </button>
          </div>
        </div>
      )}
    </ScreenShell>

    {/* Pinned bottom navigation row — outside ScreenShell so position:fixed works */}
    <div style={{
      position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 390, padding: '10px 18px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      background: vibe.bg,
      borderTop: `1px solid ${cardBorder}`,
      zIndex: 40,
    }}>
      {/* Left arrow */}
      <button
        onClick={() => dayNumber > 1 && onGoToDay?.(dayNumber - 1)}
        disabled={dayNumber <= 1}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'transparent',
          border: `1.5px solid ${dayNumber <= 1 ? `${vibe.accent}30` : vibe.accent}`,
          color: dayNumber <= 1 ? `${vibe.accent}30` : vibe.accent,
          fontSize: 18, cursor: dayNumber <= 1 ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: dayNumber <= 1 ? 0.4 : 1,
          transition: 'all 0.2s', flexShrink: 0,
        }}
      >‹</button>
      {/* Mark Day X done / completed with undo */}
      {dayDone ? (
        <button
          onClick={unmarkDone}
          style={{
            flex: 1, height: 48, borderRadius: 14,
            background: 'transparent',
            color: vibe.accent,
            border: `1.5px solid ${vibe.accent}50`,
            fontFamily: typo.bodyFont, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span>✓ Day {dayNumber} complete</span>
          <span style={{ fontSize: 15, opacity: 0.7 }}>↩</span>
        </button>
      ) : (
        <button
          onClick={markDone}
          style={{
            flex: 1, height: 48, borderRadius: 14,
            background: vibe.accent,
            color: 'white',
            border: 'none',
            fontFamily: typo.bodyFont, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
        >
          Mark Day {dayNumber} done ✓
        </button>
      )}
      {/* Right arrow */}
      <button
        onClick={() => {
          if (dayNumber >= data.cycleDays) {
            onEndOfCycle?.()
          } else if (!isPremium && dayNumber >= 3) {
            onUnlock?.()
          } else {
            onGoToDay?.(dayNumber + 1)
          }
        }}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'transparent',
          border: `1.5px solid ${vibe.accent}`,
          color: vibe.accent,
          fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', flexShrink: 0,
        }}
      >›</button>
    </div>
    </>
  )
}

export default DayScreen
