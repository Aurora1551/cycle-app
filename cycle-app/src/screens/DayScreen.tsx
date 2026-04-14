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
  isPaused?: boolean
  onResume?: () => void
  onDayComplete: () => void
  onSettings: () => void
  onGoToDay?: (day: number) => void
  onUnlock?: () => void
  onEndOfCycle?: () => void
}

// --- Speech: Warm voice for opening/closing phrases only ---
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

// Track whether speech has been unlocked by user gesture
let speechUnlocked = false

// Unlock speech synthesis on user gesture (mobile browsers block without gesture)
function unlockSpeech() {
  if (!('speechSynthesis' in window)) return
  // Speak a single space to unlock the audio context
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0.01
  u.rate = 10
  window.speechSynthesis.speak(u)
  speechUnlocked = true
  // Force load voices
  window.speechSynthesis.getVoices()
}

function speak(text: string): Promise<void> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) { console.warn('[Speech] Not supported'); resolve(); return }
    if (!text || !text.trim()) { resolve(); return }

    // Ensure voices are loaded
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      // Try loading voices and retry
      console.log('[Speech] No voices yet, waiting...')
      const onVoices = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
        voicesLoaded = true
        doSpeak()
      }
      window.speechSynthesis.addEventListener('voiceschanged', onVoices)
      // Fallback if event never fires
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
        voicesLoaded = true
        doSpeak()
      }, 1000)
      return
    }

    function doSpeak() {
      // Cancel anything queued, then speak after a tick
      window.speechSynthesis.cancel()
      setTimeout(() => {
        const u = new SpeechSynthesisUtterance(text)
        u.rate = 0.75
        u.pitch = 0.85
        u.volume = 1.0
        const voice = getBestVoice()
        if (voice) {
          u.voice = voice
          console.log('[Speech] Using voice:', voice.name)
        } else {
          console.warn('[Speech] No suitable voice found, using default')
        }
        const fallback = setTimeout(() => { console.warn('[Speech] Timeout fallback'); resolve() }, text.length * 150 + 5000)
        u.onend = () => { clearTimeout(fallback); console.log('[Speech] Done'); resolve() }
        u.onerror = (e) => { clearTimeout(fallback); console.error('[Speech] Error:', e); resolve() }
        window.speechSynthesis.speak(u)
        console.log('[Speech] Speaking:', text.substring(0, 40) + '...')
      }, 200)
    }

    doSpeak()
  })
}

// --- Audio: Singing bowl chime (Web Audio synthesis) ---
function createChime(): { play: () => void; ctx: AudioContext } | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    return {
      ctx,
      play() {
        // Layered sine waves for a singing bowl sound
        const freqs = [528, 396, 264] // C major chord, solfeggio-inspired
        const master = ctx.createGain()
        master.gain.value = 0.3
        master.connect(ctx.destination)

        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.value = freq
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.25 - i * 0.06, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5)
          osc.connect(gain)
          gain.connect(master)
          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 3.5)
        })
      },
    }
  } catch { return null }
}

// --- Audio: Warm ambient pad ---
function createAmbientPad(): { start: () => void; swell: () => void; duck: () => void; unduck: () => void; fadeOut: () => Promise<void>; kill: () => void } | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const master = ctx.createGain()
    master.gain.value = 0
    // Warm reverb-like effect via delay
    const delay = ctx.createDelay()
    delay.delayTime.value = 0.15
    const feedback = ctx.createGain()
    feedback.gain.value = 0.3
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 600 // lower cutoff for warmer tone

    // Drone: layered detuned oscillators for warmth
    const oscs: OscillatorNode[] = []
    const notes = [66, 99, 132, 198] // C2, G2, C3, G3 — deeper, warmer
    notes.forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(lp)
      oscs.push(osc)
      // Slight detune for richness
      const osc2 = ctx.createOscillator()
      osc2.type = 'triangle' // triangle wave adds gentle overtones
      osc2.frequency.value = freq * 1.002
      osc2.connect(lp)
      oscs.push(osc2)
    })

    lp.connect(master)
    lp.connect(delay)
    delay.connect(feedback)
    feedback.connect(lp)
    master.connect(ctx.destination)

    let started = false

    return {
      start() {
        if (started) return
        started = true
        oscs.forEach(o => o.start())
        master.gain.setTargetAtTime(0.12, ctx.currentTime, 2.5) // gentle fade in, warmer volume
      },
      swell() {
        // Brief volume swell during inhale
        master.gain.setTargetAtTime(0.18, ctx.currentTime, 1.5)
        setTimeout(() => {
          master.gain.setTargetAtTime(0.08, ctx.currentTime, 2.0)
        }, 7000)
      },
      duck() {
        // Lower volume to let speech be heard
        master.gain.setTargetAtTime(0.02, ctx.currentTime, 0.3)
      },
      unduck() {
        // Restore volume after speech
        master.gain.setTargetAtTime(0.10, ctx.currentTime, 0.5)
      },
      fadeOut() {
        return new Promise<void>(resolve => {
          master.gain.setTargetAtTime(0, ctx.currentTime, 1.0)
          setTimeout(() => {
            try { oscs.forEach(o => o.stop()); delay.disconnect(); feedback.disconnect(); lp.disconnect(); master.disconnect(); ctx.close() } catch {}
            resolve()
          }, 3000)
        })
      },
      kill() {
        try { master.gain.value = 0; oscs.forEach(o => o.stop()); ctx.close() } catch {}
      },
    }
  } catch { return null }
}

// --- "Your Moment" breathing: 1 breath cycle, ~35 seconds ---
// Timeline: chime (0-3s) → inhale (3-10s, 7s) → hold (10-13s, 3s) → exhale (13-21s, 8s) → closing text (21-30s) → chime (30-33s) → done (35s)
const MOMENT_PHASES = [
  { key: 'inhale', label: 'Breathe in slowly', duration: 7, scale: 1.4 },
  { key: 'hold', label: 'Hold gently', duration: 3, scale: 1.4 },
  { key: 'exhale', label: 'And release', duration: 8, scale: 1.0 },
] as const

// Vibe-specific moment phrases
const MOMENT_PHRASES: Record<string, { opening: string; closing: string }> = {
  fierce: { opening: 'Place your hand on your belly.\nYou are powerful.', closing: 'That strength lives in you.' },
  nurturing: { opening: 'Rest your hand gently\nbelow your navel.', closing: 'You are held, always.' },
  calm: { opening: 'Feel the stillness\nin your body.', closing: 'You are exactly where\nyou need to be.' },
  lighthearted: { opening: 'Smile.\nTake one big breath with me.', closing: 'See? You\'ve got this.' },
  spiritual: { opening: 'Place your hand on your heart.\nBe still.', closing: 'You are guided.\nTrust this.' },
}

interface YourMomentProps {
  vibe: typeof VIBES[0]
  typo: ReturnType<typeof resolveTypo>
  openingLine: string
  closingLine: string
  genres: string[]
  onComplete: () => void
  onStop: () => void
}

function YourMoment({ vibe, typo, openingLine, closingLine, genres, onComplete, onStop }: YourMomentProps) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<'opening' | 'breathing' | 'closing' | 'done'>('opening')
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0) // elapsed within current phase
  const [openingFade, setOpeningFade] = useState(0)
  const padRef = React.useRef<ReturnType<typeof createAmbientPad>>(null)
  const chimeRef = React.useRef<ReturnType<typeof createChime>>(null)
  const stoppedRef = React.useRef(false)

  const phase = MOMENT_PHASES[phaseIdx]
  const progress = stage === 'breathing' ? elapsed / phase.duration : 0
  const circleScale = stage === 'breathing' ? phase.scale : stage === 'closing' || stage === 'done' ? 1.0 : 1.0

  // Vibe phrases (use AI-generated if available, fallback to vibe defaults)
  const vibeKey = vibe.key || 'calm'
  const phrases = MOMENT_PHRASES[vibeKey] || MOMENT_PHRASES.calm
  const displayOpening = openingLine || phrases.opening
  const displayClosing = closingLine || phrases.closing

  const stopMoment = () => {
    stoppedRef.current = true
    try { window.speechSynthesis?.cancel() } catch {}
    padRef.current?.kill()
    padRef.current = null
    onStop()
  }

  // Init audio + opening sequence
  useEffect(() => {
    padRef.current = createAmbientPad()
    chimeRef.current = createChime()

    // Opening chime + pad + voice
    chimeRef.current?.play()
    padRef.current?.start()
    setOpeningFade(1)

    // Speak opening phrase after chime settles, then transition to breathing
    const run = async () => {
      await new Promise(r => setTimeout(r, 2500))
      if (stoppedRef.current) return
      // Duck ambient pad so voice is clearly heard
      padRef.current?.duck()
      const textToSpeak = displayOpening.replace(/\n/g, '. ')
      console.log('[Meditation] About to speak:', textToSpeak)
      console.log('[Meditation] speechSynthesis available:', 'speechSynthesis' in window)
      console.log('[Meditation] voices:', window.speechSynthesis?.getVoices()?.length)
      // Test: try speaking directly without the wrapper to rule out speak() issues
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const testU = new SpeechSynthesisUtterance(textToSpeak)
        testU.rate = 0.75
        testU.pitch = 0.85
        testU.volume = 1.0
        const v = window.speechSynthesis.getVoices()
        console.log('[Meditation] Available voices:', v.map(x => x.name).join(', '))
        if (v.length > 0) testU.voice = v.find(x => x.lang.startsWith('en')) || v[0]
        window.speechSynthesis.speak(testU)
        console.log('[Meditation] Direct speak fired')
        await new Promise(r => { testU.onend = r; testU.onerror = () => { console.error('[Meditation] Speech error'); r(undefined) }; setTimeout(r, textToSpeak.length * 150 + 5000) })
      } else {
        console.error('[Meditation] No speechSynthesis — this browser does not support it')
        await new Promise(r => setTimeout(r, 2000))
      }
      console.log('[Meditation] Speech done, transitioning to breathing')
      padRef.current?.unduck()
      if (stoppedRef.current) return
      await new Promise(r => setTimeout(r, 800))
      if (stoppedRef.current) return
      padRef.current?.swell()
      setStage('breathing')
    }
    run()
    const timer = setTimeout(() => {}, 0) // keep cleanup shape

    return () => {
      clearTimeout(timer)
      stoppedRef.current = true
      try { window.speechSynthesis?.cancel() } catch {}
      padRef.current?.kill()
    }
  }, [])

  // Breathing timer — ticks every 100ms for smooth progress bar
  useEffect(() => {
    if (stage !== 'breathing' || stoppedRef.current) return

    const interval = setInterval(() => {
      if (stoppedRef.current) return
      setElapsed(prev => {
        const next = prev + 0.1
        if (next >= phase.duration) {
          // Move to next phase
          const nextPhaseIdx = phaseIdx + 1
          if (nextPhaseIdx >= MOMENT_PHASES.length) {
            // All phases done — go to closing with voice
            clearInterval(interval)
            setStage('closing')
            const closingSequence = async () => {
              await new Promise(r => setTimeout(r, 1000))
              if (stoppedRef.current) return
              padRef.current?.duck()
              await speak(displayClosing.replace(/\n/g, '. '))
              if (stoppedRef.current) return
              await new Promise(r => setTimeout(r, 800))
              if (stoppedRef.current) return
              chimeRef.current?.play()
              padRef.current?.fadeOut().then(() => { padRef.current = null })
              await new Promise(r => setTimeout(r, 3000))
              if (stoppedRef.current) return
              setStage('done')
              onComplete()
            }
            closingSequence()
            return 0
          }
          setPhaseIdx(nextPhaseIdx)
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [stage, phaseIdx])

  // --- Opening stage ---
  if (stage === 'opening') {
    return (
      <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 12px', minHeight: 240, opacity: openingFade, transition: 'opacity 1.5s ease' }}>
        <div onClick={stopMoment} style={{
          width: 100, height: 100, borderRadius: '50%',
          background: `radial-gradient(circle at 40% 40%, ${vibe.accent}60, ${vibe.accent}20)`,
          boxShadow: `0 0 40px ${vibe.accent}30, 0 0 80px ${vibe.accent}15`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          animation: 'float 3s ease-in-out infinite', cursor: 'pointer',
        }}>
          <div style={{ fontSize: 22, opacity: 0.8 }}>&#10024;</div>
          <div style={{ fontFamily: typo.bodyFont, fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>tap to end</div>
        </div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 18, color: vibe.accent, textAlign: 'center', lineHeight: 1.6, maxWidth: 260, whiteSpace: 'pre-line' }}>
          {displayOpening}
        </div>
      </div>
    )
  }

  // --- Done stage ---
  if (stage === 'done') {
    const insightTimerUrl = 'https://insighttimer.com/search?q=fertility+meditation'
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(genres.join(' ') + ' meditation calm')}`
    return (
      <div className="flex-col" style={{ alignItems: 'center', gap: 20, padding: '16px 0' }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>&#10024;</div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 20, color: vibe.accent, textAlign: 'center', lineHeight: 1.5, maxWidth: 280, whiteSpace: 'pre-line' }}>{displayClosing}</div>
        <div className="mono-hint" style={{ color: vibe.muted, fontSize: 11 }}>{t('day.breathingComplete')}</div>
        <div style={{ width: '100%', marginTop: 8 }}>
          <div className="mono-hint" style={{ color: vibe.accent, marginBottom: 10 }}>{t('day.goDeeper')}</div>
          <div className="flex-col" style={{ gap: 8 }}>
            <a href={insightTimerUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('insight_timer_tapped', {})}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${vibe.accent}33`, background: `${vibe.accent}08`, textDecoration: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>&#127911;</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: typo.bodyFont, color: vibe.accent }}>{t('day.insightTimer')}</span>
            </a>
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('spotify_playlist_tapped', {})}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${vibe.accent}33`, background: `${vibe.accent}08`, textDecoration: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>&#127925;</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: typo.bodyFont, color: vibe.accent }}>{t('day.spotifyCalm')}</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // --- Closing stage ---
  if (stage === 'closing') {
    return (
      <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 12px', minHeight: 240 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: `radial-gradient(circle at 40% 40%, ${vibe.accent}60, ${vibe.accent}20)`,
          boxShadow: `0 0 40px ${vibe.accent}30`,
        }}>
        </div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 20, color: vibe.accent, textAlign: 'center', lineHeight: 1.5, maxWidth: 280, whiteSpace: 'pre-line', opacity: 0.9, transition: 'opacity 1s ease' }}>
          {displayClosing}
        </div>
      </div>
    )
  }

  // --- Breathing stage ---
  const totalDuration = MOMENT_PHASES.reduce((sum, p) => sum + p.duration, 0)
  const elapsedTotal = MOMENT_PHASES.slice(0, phaseIdx).reduce((sum, p) => sum + p.duration, 0) + elapsed
  const overallProgress = elapsedTotal / totalDuration

  return (
    <div className="flex-col" style={{ alignItems: 'center', gap: 16, padding: '24px 0' }}>
      {/* Breathing orb — single, clean */}
      <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer glow */}
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          background: `radial-gradient(circle, ${vibe.accent}18 0%, transparent 70%)`,
          transform: `scale(${circleScale})`,
          transition: `transform ${phase.duration}s ease-in-out`,
        }} />
        {/* Main orb — tap anywhere to end */}
        <div onClick={stopMoment} style={{
          width: 120, height: 120, borderRadius: '50%',
          background: `radial-gradient(circle at 40% 40%, ${vibe.accent}80, ${vibe.accent}30)`,
          boxShadow: `0 0 ${circleScale > 1.2 ? 50 : 25}px ${vibe.accent}40`,
          transform: `scale(${circleScale})`,
          transition: `transform ${phase.duration}s ease-in-out, box-shadow ${phase.duration}s ease-in-out`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          cursor: 'pointer',
        }}>
          <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.2 }}>
            {phase.label}
          </div>
          <div style={{ fontFamily: typo.bodyFont, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: 600 }}>
            tap to end
          </div>
        </div>
      </div>

      {/* Subtle progress bar */}
      <div style={{ width: '60%', height: 2, background: `${vibe.accent}15`, borderRadius: 1, overflow: 'hidden', marginTop: 8 }}>
        <div style={{
          width: `${overallProgress * 100}%`, height: '100%',
          background: vibe.accent, borderRadius: 1,
          transition: 'width 0.1s linear',
        }} />
      </div>
    </div>
  )
}

const DayScreen: React.FC<Props> = ({ data, dayNumber, isPremium, isPaused, onResume, onDayComplete, onSettings, onGoToDay, onUnlock, onEndOfCycle }) => {
  const { t } = useTranslation()
  const [content, setContent] = useState<DayContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [journalText, setJournalText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [fuelIdx, setFuelIdx] = useState(0)
  const [fuelDismissKey, setFuelDismissKey] = useState(0) // bump to force re-render after dismiss
  const [favorites, setFavorites] = useState<Array<{ type: string; text: string; author?: string; day: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('cycle_favorites') || '[]') } catch { return [] }
  })
  const [dayDone, setDayDone] = useState(() => localStorage.getItem(`cycle_day_${dayNumber}_done`) === '1')
  const [meditationStarted, setMeditationStarted] = useState(false)
  const [spotifyConnected, setSpotifyConnected] = useState(() => localStorage.getItem('spotify_connected') === '1')
  const [spotifyTrack, setSpotifyTrack] = useState<{ trackUri: string; trackUrl: string } | null>(null)
  const [showSpotifyPopup, setShowSpotifyPopup] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [mood, setMood] = useState<string | null>(() => localStorage.getItem(`cycle_mood_day${dayNumber}`))
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

  // Streak: count consecutive completed days ending at current position
  const streak = React.useMemo(() => {
    let count = 0
    for (let d = dayNumber; d >= 1; d--) {
      if (completedDays.has(d)) count++
      else break
    }
    return count
  }, [completedDays, dayNumber])

  // Cache key includes user name + vibe to bust cache when profile changes
  const localKey = `cycle_content_${data.name}_${data.vibe}_day${dayNumber}`

  // Reset state when day changes and scroll to top
  useEffect(() => {
    setDayDone(localStorage.getItem(`cycle_day_${dayNumber}_done`) === '1')
    setShowCelebration(false)
    setJournalText(localStorage.getItem(`cycle_day_${dayNumber}_journal`) || '')
    setMeditationStarted(false)
    setJournalSaved(false)
    setFuelIdx(0)
    setMood(localStorage.getItem(`cycle_mood_day${dayNumber}`))
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
        body: JSON.stringify({ name: data.name, treatment: TREATMENT_LABELS[data.treatment] || data.treatment, dayNumber, totalDays: data.cycleDays, vibe: data.vibe, genres: data.genres, userId: data.name, language: localStorage.getItem('cycle_language') || 'en', dietaryPrefs: (() => { try { return JSON.parse(localStorage.getItem('cycle_diet_prefs') || '[]') } catch { return [] } })() }),
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

  const spawnConfetti = () => {
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden'
    document.body.appendChild(container)
    const colors = [vibe.accent, '#D4878F', '#F5C842', '#7BD4A0', '#C4A8E8', '#E8A598']
    for (let i = 0; i < 35; i++) {
      const p = document.createElement('div')
      const size = 4 + Math.random() * 5
      const color = colors[Math.floor(Math.random() * colors.length)]
      const startX = 35 + Math.random() * 30
      const endX = startX + (Math.random() - 0.5) * 30
      const endY = 80 + Math.random() * 160
      const rotation = Math.random() * 720 - 360
      const dur = 0.8 + Math.random() * 0.6
      const delay = Math.random() * 0.2
      p.style.cssText = `position:absolute;bottom:100px;left:${startX}%;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '1px'};opacity:0;`
      p.animate([
        { transform: `translateY(0) translateX(0) rotate(0deg)`, opacity: 1 },
        { transform: `translateY(-${endY}px) translateX(${endX - startX}vw) rotate(${rotation}deg)`, opacity: 0 },
      ], { duration: dur * 1000, delay: delay * 1000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' })
      container.appendChild(p)
    }
    setTimeout(() => container.remove(), 1800)
  }

  const markDone = () => {
    if (dayDone) return
    localStorage.setItem(`cycle_day_${dayNumber}_done`, '1')
    setDayDone(true)
    setShowCelebration(true)
    spawnConfetti()
    track('day_marked_done', { day_number: dayNumber })
    fetch('/api/day-complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: data.name, dayNumber, completed: true }) }).catch(() => {})
    // Auto-advance to next day after celebration
    setTimeout(() => {
      setShowCelebration(false)
      onDayComplete()
    }, 1800)
  }

  const unmarkDone = () => {
    localStorage.removeItem(`cycle_day_${dayNumber}_done`)
    fetch('/api/day-complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: data.name, dayNumber, completed: false }) }).catch(() => {})
    setDayDone(false)
  }

  const toggleFavorite = (type: string, text: string, author?: string) => {
    const exists = favorites.some(f => f.type === type && f.day === dayNumber)
    const next = exists
      ? favorites.filter(f => !(f.type === type && f.day === dayNumber))
      : [...favorites, { type, text, author, day: dayNumber }]
    setFavorites(next)
    localStorage.setItem('cycle_favorites', JSON.stringify(next))
    fetch('/api/favorite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: data.name, dayNumber, type, content: exists ? null : text, author }) }).catch(() => {})
  }

  const isFavorited = (type: string) => favorites.some(f => f.type === type && f.day === dayNumber)
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

  // Consistent save + share row — always bottom-right of card
  const saveShareRow = (type: string, text: string, author?: string) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 10, alignItems: 'center' }}>
      <button onClick={() => { toggleFavorite(type, text, author); track(`${type}_favorited`, { day_number: dayNumber }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', transition: 'opacity 0.2s', lineHeight: 0 }}>
        {isFavorited(type) ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#D4878F" stroke="#D4878F" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mutedColor} strokeWidth="1.5" style={{ opacity: 0.5 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        )}
      </button>
      <button onClick={() => {
        const shareText = author ? `"${text}" — ${author}\n\nShared via Cycle` : `${text}\n\nShared via Cycle`
        if (navigator.share) { navigator.share({ text: shareText }).catch(() => {}) } else { window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank') }
        track(`${type}_shared`, { day_number: dayNumber })
      }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: mutedColor, padding: '2px', lineHeight: 1, opacity: 0.5 }}>
        &#10148;
      </button>
    </div>
  )

  const renderComponent = (component: string) => {
    if (component === 'quote') {
      track('quote_viewed', { day_number: dayNumber })
      return (
        <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
          {vibeLabel(vibeContent.labels.quote)}
          <div style={{ position: 'relative', padding: '0 8px' }}>
            <div style={{ fontFamily: typo.headingFont, fontSize: 48, color: `${vibe.accent}18`, lineHeight: 0.5, position: 'absolute', top: 4, left: -4 }}>"</div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 22, color: textColor, lineHeight: 1.35, marginBottom: 8, paddingLeft: 20 }}>{content?.quote}</div>
          </div>
          <div className="mono-sm" style={{ color: vibe.accent, paddingLeft: 28 }}>— {content?.quoteAuthor}</div>
          {saveShareRow('quote', content?.quote || '', content?.quoteAuthor)}
        </Card>
      )
    }
    if (component === 'anthem') {
      const handleSpotifyTap = (e: React.MouseEvent) => {
        if (spotifyConnected && spotifyTrack) {
          e.preventDefault()
          track('spotify_track_opened', { song: content?.songTitle || '', artist: content?.songArtist || '' })
          fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: data.name, event: 'spotify_tap', data: JSON.stringify({ song: content?.songTitle, artist: content?.songArtist, day: dayNumber }) }) }).catch(() => {})
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
      <div key={component} style={{ background: `linear-gradient(135deg, ${vibe.accent}0A 0%, ${vibe.accent}04 100%)`, border: `1px solid ${vibe.accent}18`, borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
        {vibeLabel({ emoji: vibeContent.labels.affirmation.emoji, text: 'SAY THIS TO YOURSELF' })}
        <div style={{ fontFamily: typo.headingFont, fontWeight: 700, fontSize: 22, color: vibe.accent, lineHeight: 1.35, padding: '8px 4px' }}>{content?.affirmation}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: `${vibe.accent}50`, marginTop: 6, letterSpacing: '0.1em' }}>BREATHE. REPEAT.</div>
        {saveShareRow('affirmation', content?.affirmation || '')}
      </div>
    )
    if (component === 'fuel') {
      const ALL_FUEL_ITEMS = [
        { name: 'Greek yoghurt with almonds & honey', emoji: '🥜', protein: '~20g' },
        { name: 'Salmon with sweet potato', emoji: '🐟', protein: '~30g' },
        { name: 'Avocado & egg toast', emoji: '🥑', protein: '~15g' },
        { name: 'Chicken & quinoa bowl', emoji: '🍗', protein: '~35g' },
        { name: 'Hummus with veggie sticks', emoji: '🥕', protein: '~8g' },
        { name: 'Overnight oats with chia seeds', emoji: '🥣', protein: '~18g' },
        { name: 'Lentil soup with crusty bread', emoji: '🍲', protein: '~18g' },
        { name: 'Cottage cheese with berries', emoji: '🫐', protein: '~14g' },
        { name: 'Edamame & rice bowl', emoji: '🍚', protein: '~22g' },
        { name: 'Turkey & avocado wrap', emoji: '🌯', protein: '~28g' },
        { name: 'Handful of almonds & banana', emoji: '🍌', protein: '~7g' },
        { name: 'Bean & cheese quesadilla', emoji: '🧀', protein: '~20g' },
        { name: 'Scrambled eggs on sourdough', emoji: '🍳', protein: '~18g' },
        { name: 'Tuna & avocado salad', emoji: '🥗', protein: '~25g' },
        { name: 'Peanut butter smoothie', emoji: '🥤', protein: '~15g' },
        { name: 'Tofu stir-fry with vegetables', emoji: '🥦', protein: '~20g' },
        { name: 'Black bean tacos', emoji: '🌮', protein: '~16g' },
        { name: 'Shakshuka with bread', emoji: '🍅', protein: '~18g' },
      ]
      // Dismissed foods — stored in localStorage, used to filter future suggestions
      const getDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem('cycle_fuel_dismissed') || '[]') } catch { return [] } }
      const dismissFood = (name: string) => {
        const current = getDismissed()
        if (!current.includes(name)) {
          localStorage.setItem('cycle_fuel_dismissed', JSON.stringify([...current, name]))
        }
        setFuelDismissKey(k => k + 1)
        track('fuel_item_dismissed', { food: name, day_number: dayNumber })
      }
      const dismissed = getDismissed()
      const aiFuel = content?.fuelItems
      // Filter out dismissed from all available items
      const available = ALL_FUEL_ITEMS.filter(item => !dismissed.some(d => item.name.toLowerCase() === d.toLowerCase()))
      // Pick 3 items: AI items first (if not dismissed), then fill from available pool
      const aiFiltered = aiFuel ? aiFuel.filter((item: any) => !dismissed.some((d: string) => item.name.toLowerCase() === d.toLowerCase())) : []
      const startIdx = (fuelIdx * 3) % Math.max(available.length, 1)
      const poolItems = available.slice(startIdx, startIdx + 3)
      const extraNeeded = 3 - (aiFiltered.length > 0 && fuelIdx === 0 ? aiFiltered.length : poolItems.length)
      const currentFuel = fuelIdx === 0 && aiFiltered.length > 0
        ? [...aiFiltered, ...available.filter(a => !aiFiltered.some((ai: any) => ai.name === a.name)).slice(0, Math.max(0, 3 - aiFiltered.length))].slice(0, 3)
        : [...poolItems, ...available.filter(a => !poolItems.includes(a)).slice(0, Math.max(0, extraNeeded))].slice(0, 3)
      const dietPrefs: string[] = (() => { try { return JSON.parse(localStorage.getItem('cycle_diet_prefs') || '[]') } catch { return [] } })()
      const hasDietPrefs = dietPrefs.length > 0 && !dietPrefs.includes('none')
      // If all items dismissed for this set, auto-advance
      if (currentFuel.length === 0) {
        return (
          <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
            {vibeLabel(vibeContent.labels.fuel)}
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontFamily: typo.bodyFont, fontSize: 12, color: mutedColor, marginBottom: 8 }}>No suggestions left for this set</div>
              <button onClick={() => setFuelIdx(prev => prev + 1)} style={{ background: vibe.accent, color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: typo.bodyFont }}>Show more ideas</button>
            </div>
          </Card>
        )
      }
      return (
        <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
          {vibeLabel(vibeContent.labels.fuel)}
          <div style={{ fontFamily: typo.bodyFont, fontWeight: 300, fontSize: 12, color: mutedColor, marginBottom: 12 }}>Protein-rich ideas for today</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentFuel.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
                <div style={{ fontSize: 22 }}>{item.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor }}>{item.name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: vibe.accent, marginTop: 2, opacity: 0.7 }}>{item.protein} PROTEIN</div>
                </div>
                <button onClick={() => { dismissFood(item.name); setFuelDismissKey(k => k + 1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: mutedColor, padding: '4px', opacity: 0.4, lineHeight: 1 }} title="Not for me">
                  &#10005;
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, opacity: 0.5, lineHeight: 1.5, marginTop: 10 }}>
            For inspiration only · follow your clinic's guidance
            {hasDietPrefs && <span> · {dietPrefs.join(', ')}</span>}
          </div>
        </Card>
      )
    }
    if (component === 'journal') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        {vibeLabel(vibeContent.labels.journal)}
        <div style={{ fontSize: 18, color: textColor, fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, lineHeight: 1.4, marginBottom: 12, borderLeft: `2px solid ${vibe.accent}40`, paddingLeft: 14 }}>{content?.journalPrompt}</div>
        <textarea value={journalText} onChange={e => setJournalText(e.target.value)} placeholder={t('day.writePlaceholder')} style={inputStyle} />
        <button onClick={saveJournal} style={{ marginTop: 8, background: journalSaved ? `${vibe.accent}20` : vibe.accent, color: journalSaved ? vibe.accent : 'white', border: journalSaved ? `1px solid ${vibe.accent}40` : 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: typo.bodyFont, transition: 'all 0.2s' }}>
          {journalSaved ? t('day.saved') : t('day.saveEntry')}
        </button>
      </Card>
    )
    if (component === 'gratitude') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        {vibeLabel({ emoji: vibeContent.labels.gratitude.emoji, text: 'PAUSE & REFLECT' })}
        <div style={{ fontSize: 18, color: isDark ? 'rgba(253,246,240,0.7)' : 'rgba(28,15,12,0.6)', fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 400, lineHeight: 1.5, padding: '4px 0' }}>{content?.gratitudePrompt}</div>
        <div style={{ borderBottom: `1px dashed ${vibe.accent}25`, marginTop: 14, paddingBottom: 20 }} />
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, marginTop: 6, letterSpacing: '0.05em', opacity: 0.6 }}>sit with this for a moment</div>
      </Card>
    )
    if (component === 'meditation' || component === 'breathing') return (
      <Card key={component} cardBg={cardBg} cardBorder={cardBorder}>
        <SectionLabel color={vibe.accent}>&#10024; YOUR MOMENT</SectionLabel>
        {!meditationStarted ? (
          <button onClick={() => { unlockSpeech(); setMeditationStarted(true); track('meditation_started', { day_number: dayNumber }) }} style={{ width: '100%', background: `${vibe.accent}15`, border: `1px solid ${vibe.accent}30`, borderRadius: 12, padding: '20px', cursor: 'pointer', fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: vibe.accent }}>
            Breathe with me · 35s
          </button>
        ) : (
          <YourMoment
            vibe={vibe}
            typo={typo}
            openingLine={content?.breathingOpening || ''}
            closingLine={content?.breathingClosing || ''}
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
    <ScreenShell bg={vibe.bg} visible={visible} transition="opacity 0.5s ease" style={isPaused ? { filter: 'blur(6px)', opacity: 0.4, pointerEvents: 'none' as const } : undefined}>
      {/* Header — centered tagline, title, subtitle + settings icon top-right */}
      <div style={{ padding: '20px 22px 0', position: 'relative' }}>
        <button onClick={onSettings} className="flex-center" style={{ position: 'absolute', top: 20, right: 22, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 14, zIndex: 1 }}>⚙️</button>
        <div style={{ textAlign: 'center' }}>
          {/* Tagline */}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: vibe.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, textShadow: `0 0 8px ${vibe.accent}60` }}>
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
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: mutedColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>You're on day</div>
              <div style={{
                fontFamily: (data.vibe === 'lighthearted') ? "'Nunito', sans-serif" : "'Cormorant Garamond', serif",
                fontWeight: 900,
                fontSize: 44,
                color: (data.vibe === 'fierce') ? '#FDF6F0' : (data.vibe === 'nurturing') ? '#3D1810' : (data.vibe === 'calm') ? '#E8F4F0' : (data.vibe === 'lighthearted') ? '#1A0A00' : '#F0EAF8',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {dayNumber}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: mutedColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                of {data.cycleDays} days
              </div>
              {streak > 0 && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: vibe.accent, letterSpacing: '0.08em', marginTop: 6, opacity: 0.8 }}>
                  &#127793; {streak} {streak === 1 ? 'day' : 'days'} of loving yourself
                </div>
              )}
            </div>
            {/* Right side: clickable day circles */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(7, data.cycleDays)}, 1fr)`, gap: 4, alignSelf: 'center', maxWidth: 160 }}>
              {Array.from({ length: data.cycleDays }, (_, i) => i + 1).map(d => {
                const isDone = completedDays.has(d)
                const isViewing = d === dayNumber
                const isLocked = !isPremium && d > 3
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (isLocked) { onUnlock?.(); return }
                      onGoToDay?.(d)
                    }}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', padding: 0,
                      background: isDone ? vibe.accent : isViewing ? `${vibe.accent}30` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      border: isViewing ? `1.5px solid ${vibe.accent}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      margin: 'auto',
                      transition: 'all 0.2s',
                      opacity: isLocked ? 0.4 : 1,
                    }}
                  >
                    {isLocked ? (
                      <span style={{ fontSize: 8 }}>🔒</span>
                    ) : (
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, fontWeight: 500, color: isDone ? 'white' : isViewing ? vibe.accent : mutedColor, lineHeight: 1 }}>{d}</span>
                    )}
                  </button>
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
            <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 18, color: textColor, lineHeight: 1.3, marginTop: 8 }}>{t('day.lockedHeading', { day: dayNumber })}</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, margin: '8px 0 16px' }}>{t('day.lockedMessage')}</div>
            <button onClick={onUnlock} className="btn-primary" style={{ background: '#C4614A' }}>{t('day.unlockButton')}</button>
            <div className="mono-xs" style={{ color: mutedColor, marginTop: 8 }}>{t('day.unlockHint')}</div>
          </Card>
        </div>
      ) : (
        <div className="flex-col gap-12" style={{ padding: '0 18px 140px', flex: 1 }}>
          {sortedComponents.filter(c => c !== 'fuel').map(renderComponent)}
          {/* Friend note card */}
          <Card cardBg={cardBg} cardBorder={cardBorder}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>{vibeContent.friendNote.emoji}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
                color: vibe.accent, letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>{vibeContent.friendNote.heading}</span>
            </div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 18, color: textColor, lineHeight: 1.5, textAlign: 'center', padding: '8px 4px' }}>
              {content?.friendNote || vibeContent.friendNote.text.replace('[name]', data.name).replace('[X]', String(dayNumber))}
            </div>
            <div style={{ fontFamily: typo.bodyFont, fontSize: 13, color: vibe.accent, textAlign: 'center', marginTop: 8 }}>
              I am so proud of you 🔥
            </div>
            {saveShareRow('friendNote', content?.friendNote || vibeContent.friendNote.text.replace('[name]', data.name).replace('[X]', String(dayNumber)))}
          </Card>
          {/* Fuel — always last */}
          {sortedComponents.includes('fuel') && renderComponent('fuel')}
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
              fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: data.name, event: 'spotify_tap', data: JSON.stringify({ song: content?.songTitle, artist: content?.songArtist, day: dayNumber }) }) }).catch(() => {})
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

    {/* Paused overlay */}
    {isPaused && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 36 }}>&#127769;</div>
        <div style={{ fontFamily: typo.headingFont, fontStyle: 'italic', fontWeight: 700, fontSize: 26, color: isDark ? '#FDF6F0' : '#1C0F0C', lineHeight: 1.2 }}>
          Your journey is paused
        </div>
        <div style={{ fontFamily: typo.bodyFont, fontSize: 14, color: isDark ? 'rgba(253,246,240,0.5)' : '#9B7B74', lineHeight: 1.6, maxWidth: 260 }}>
          Rest is part of the journey too. When you're ready, pick up right where you left off.
        </div>
        <button onClick={onResume} style={{ background: vibe.accent, color: 'white', border: 'none', borderRadius: 14, padding: '14px 32px', fontFamily: typo.bodyFont, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
          Resume my journey
        </button>
        <button onClick={onSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: typo.bodyFont, fontSize: 12, color: isDark ? 'rgba(253,246,240,0.35)' : '#9B7B74', marginTop: 4 }}>
          Settings
        </button>
      </div>
    )}

    {/* Pinned bottom navigation row — outside ScreenShell so position:fixed works */}
    {!isPaused && <div style={{
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
      {/* Mark Day done / sparkle celebration / toggle undo */}
      {showCelebration ? (
        <div style={{
          flex: 1, height: 48, borderRadius: 14,
          background: `${vibe.accent}20`,
          border: `1.5px solid ${vibe.accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 18, color: vibe.accent, animation: 'fadeIn 0.5s ease',
        }}>
          &#10024; &#10003; &#10024;
        </div>
      ) : dayDone ? (
        <button
          onClick={unmarkDone}
          style={{
            flex: 1, height: 48, borderRadius: 14,
            background: `${vibe.accent}15`,
            color: vibe.accent,
            border: `1.5px solid ${vibe.accent}30`,
            fontFamily: typo.bodyFont, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          Done &#10003;
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
          Done &#10003;
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
    </div>}
    </>
  )
}

export default DayScreen
