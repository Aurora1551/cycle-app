import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isDarkBg } from './lib/theme'
import SplashScreen from './screens/SplashScreen'
import OnboardingStep1 from './screens/OnboardingStep1'
import OnboardingStep2 from './screens/OnboardingStep2'
import OnboardingMusic from './screens/OnboardingMusic'
// Legacy imports kept for resume-from-partial support
import OnboardingName from './screens/OnboardingName'
import OnboardingTreatment from './screens/OnboardingTreatment'
import OnboardingCycleLength from './screens/OnboardingCycleLength'
import OnboardingComponents from './screens/OnboardingComponents'
import OnboardingVibe from './screens/OnboardingVibe'
import Summary from './screens/Summary'
import Paywall from './screens/Paywall'
import CreateAccount from './screens/CreateAccount'
import DayScreen from './screens/DayScreen'
import Settings from './screens/Settings'
import NotificationSettings from './screens/NotificationSettings'
import EndOfCycle from './screens/EndOfCycle'
import GiftFlow from './screens/GiftFlow'
import Progress from './screens/Progress'
import LoginScreen from './screens/LoginScreen'
import RegisterGate from './screens/RegisterGate'
import PaymentScreen from './screens/PaymentScreen'
import PaymentSuccess from './screens/PaymentSuccess'
import GiftRedeem from './screens/GiftRedeem'
import type { OnboardingData, VibeKey } from './types'
import { VIBES } from './types'
import { track } from './lib/posthog'
import { saveProfile } from './lib/db'
import { handleSpotifyCallback, verifySpotifyState } from './lib/spotify'
import { getAppUserId } from './lib/userId'

type Screen =
  | 'splash' | 'login'
  | 'onboarding-step1' | 'onboarding-step2' | 'onboarding-music'
  | 'onboarding-name' | 'onboarding-treatment' | 'onboarding-cycle-length' | 'onboarding-components' | 'onboarding-vibe'
  | 'summary'
  | 'paywall' | 'create-account' | 'notification-settings'
  | 'day' | 'progress' | 'settings' | 'end-of-cycle' | 'gift-flow'
  | 'register-gate' | 'payment' | 'payment-success'
  | 'gift-redeem'

const ONBOARDING_VIBE_SCREENS: Screen[] = ['onboarding-step2', 'onboarding-vibe', 'onboarding-music', 'summary', 'paywall', 'create-account', 'notification-settings', 'day', 'progress', 'settings', 'end-of-cycle', 'gift-flow', 'payment', 'payment-success']
const NAV_SCREENS: Screen[] = ['day', 'progress', 'settings']

function getAppBg(screen: Screen, vibe: VibeKey | null, preview: VibeKey | null): string {
  if (screen === 'splash') return '#FFFBF0'
  if (screen === 'login' || screen === 'gift-redeem') return '#0E0E0E'
  if (screen === 'register-gate' || screen === 'onboarding-step1' || screen === 'onboarding-name' || screen === 'onboarding-treatment' || screen === 'onboarding-cycle-length') return '#FDF6F0'
  const activeVibe = preview || vibe
  if (ONBOARDING_VIBE_SCREENS.includes(screen) && activeVibe) {
    return VIBES.find(v => v.key === activeVibe)?.bg || '#FDF6F0'
  }
  return '#FDF6F0'
}

const DATA_KEY = 'cycle_onboarding_data'
const DAY_KEY = 'cycle_current_day'

function App() {
  const { t } = useTranslation()
  const [screen, setScreen] = useState<Screen>('splash')
  const [data, setData] = useState<Partial<OnboardingData>>(() => {
    try { return JSON.parse(localStorage.getItem(DATA_KEY) || '{}') } catch { return {} }
  })
  const [vibePreview, setVibePreview] = useState<VibeKey | null>(null)
  const [dayNumber, setDayNumber] = useState(() => parseInt(localStorage.getItem(DAY_KEY) || '1', 10))
  // Testing bypass: in dev mode or when VITE_BYPASS_PAYWALL=1, treat everyone as premium
  // so the Day 4+ gate does not interrupt testing.
  const BYPASS_PAYWALL = import.meta.env.DEV || import.meta.env.VITE_BYPASS_PAYWALL === '1'
  const [isPremium, setIsPremium] = useState(() => BYPASS_PAYWALL || localStorage.getItem('cycle_premium') === '1')
  const [isPaused, setIsPaused] = useState(() => localStorage.getItem('cycle_paused') === '1')
  const [showDisclaimer, setShowDisclaimer] = useState(() => !localStorage.getItem('cycle_disclaimer_ack'))
  const ackDisclaimer = () => { localStorage.setItem('cycle_disclaimer_ack', '1'); setShowDisclaimer(false) }
  const [showWelcomeBack, setShowWelcomeBack] = useState(() => {
    // Show welcome back if user was paused and just returned
    if (localStorage.getItem('cycle_paused') === '1' && localStorage.getItem('cycle_pause_returning') === '1') {
      localStorage.removeItem('cycle_pause_returning')
      return true
    }
    return false
  })
  const [selectedPlan, setSelectedPlan] = useState<'one_cycle' | 'gift'>('one_cycle')

  const update = (patch: Partial<OnboardingData>) => {
    const next = { ...data, ...patch }
    setData(next)
    localStorage.setItem(DATA_KEY, JSON.stringify(next))
    // Persist to SQLite if profile is complete
    if (next.name && next.treatment && next.cycleDays && next.components && next.vibe && next.genres) {
      saveProfile({
        id: next.name,
        name: next.name,
        treatment: next.treatment,
        cycleDays: next.cycleDays,
        components: next.components,
        vibe: next.vibe,
        genres: next.genres,
        currentDay: dayNumber,
      })
    }
  }

  useEffect(() => {
    // Handle Stripe payment success redirect
    if (window.location.pathname === '/payment/success') {
      setScreen('payment-success')
      return
    }

    // Handle gift redeem link
    if (window.location.pathname.startsWith('/gift/redeem')) {
      setScreen('gift-redeem')
      return
    }

    // Handle Spotify OAuth callback
    const params = new URLSearchParams(window.location.search)
    const spotifyCode = params.get('code')
    const spotifyError = params.get('error')
    const spotifyState = params.get('state')
    const isSpotifyCallback = window.location.pathname === '/auth/spotify/callback' || sessionStorage.getItem('spotify_code_verifier')

    if (isSpotifyCallback && (spotifyCode || spotifyError)) {
      // Clean URL immediately
      window.history.replaceState({}, '', '/')

      if (spotifyError) {
        // User cancelled or Spotify returned an error
        console.warn('[Spotify] Auth error:', spotifyError)
        localStorage.setItem('spotify_auth_error', spotifyError === 'access_denied' ? 'Connection cancelled — try again' : `Spotify error: ${spotifyError}`)
        sessionStorage.removeItem('spotify_code_verifier')
        localStorage.removeItem('spotify_auth_state')
      } else if (spotifyCode) {
        // Verify CSRF state
        if (!verifySpotifyState(spotifyState)) {
          localStorage.setItem('spotify_auth_error', 'Connection failed — security check failed. Please try again.')
          sessionStorage.removeItem('spotify_code_verifier')
        } else {
          const userId = getAppUserId()
          handleSpotifyCallback(spotifyCode, userId).then(result => {
            if (result.success) {
              localStorage.setItem('spotify_connected', '1')
              localStorage.setItem('spotify_display_name', result.displayName || '')
              localStorage.removeItem('spotify_auth_error')
              track('spotify_connected', { spotify_user: result.displayName || '' })
            } else {
              localStorage.setItem('spotify_auth_error', result.error || 'Connection failed — try again')
            }
          })
        }
      }
    }

    const saved = localStorage.getItem(DATA_KEY)
    if (saved) {
      try {
        const d = JSON.parse(saved) as Partial<OnboardingData>
        if (d.name && d.treatment && d.cycleDays && d.components && d.vibe && d.genres) {
          // Full profile — go to day screen
          setData(d)
          const day = parseInt(localStorage.getItem(DAY_KEY) || '1', 10)
          setDayNumber(day)
          if (isSpotifyCallback && (spotifyCode || spotifyError)) {
            setScreen('settings')
          } else {
            setScreen(day > (d.cycleDays || 28) ? 'end-of-cycle' : 'day')
          }
        } else if (d.name) {
          // Partial profile — resume onboarding from where they left off
          setData(d)
          if (!d.treatment || !d.cycleDays) setScreen('onboarding-step1')
          else if (!d.components || !d.vibe) setScreen('onboarding-step2')
          else if (!d.genres) setScreen('onboarding-music')
          else if (!localStorage.getItem('notify_seen')) setScreen('notification-settings')
          else setScreen('summary')
        }
      } catch {}
    }
  }, [])

  const appBg = getAppBg(screen, data.vibe || null, vibePreview)
  const vibe = VIBES.find(v => v.key === (data.vibe || null)) || null

  // Sync body background with vibe so no black shows behind content
  useEffect(() => {
    document.documentElement.style.background = appBg
    document.body.style.background = appBg
  }, [appBg])

  const pauseJourney = () => {
    localStorage.setItem('cycle_paused', '1')
    localStorage.setItem('cycle_pause_date', new Date().toISOString())
    setIsPaused(true)
    track('journey_paused')
  }

  const resumeJourney = () => {
    localStorage.removeItem('cycle_paused')
    localStorage.removeItem('cycle_pause_date')
    setIsPaused(false)
    setShowWelcomeBack(false)
    track('journey_resumed')
  }

  const advanceDay = () => {
    const next = dayNumber + 1
    localStorage.setItem(DAY_KEY, String(next))
    setDayNumber(next)
    if (data.name && data.treatment && data.cycleDays && data.components && data.vibe && data.genres) {
      saveProfile({ id: data.name, name: data.name, treatment: data.treatment, cycleDays: data.cycleDays, components: data.components, vibe: data.vibe, genres: data.genres, currentDay: next })
    }
    if (data.cycleDays && next > data.cycleDays) setScreen('end-of-cycle')
  }

  const clearDayDoneKeys = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cycle_day_') && k.endsWith('_done'))
    keys.forEach(k => localStorage.removeItem(k))
    // Also clear cached content keys
    const contentKeys = Object.keys(localStorage).filter(k => k.startsWith('cycle_content_'))
    contentKeys.forEach(k => localStorage.removeItem(k))
  }

  const signOut = () => {
    track('sign_out')
    setScreen('splash')
  }

  const restartJourney = () => {
    localStorage.removeItem(DATA_KEY)
    localStorage.removeItem(DAY_KEY)
    localStorage.removeItem('cycle_is_guest')
    localStorage.removeItem('cycle_guest_start')
    localStorage.removeItem('cycle_register_dismissed')
    localStorage.removeItem('cycle_account_email')
    localStorage.removeItem('cycle_favorites')
    // Clear mood keys
    Object.keys(localStorage).filter(k => k.startsWith('cycle_mood_day')).forEach(k => localStorage.removeItem(k))
    clearDayDoneKeys()
    setData({})
    setDayNumber(1)
    setScreen('splash')
  }

  const showNav = NAV_SCREENS.includes(screen)
  const navIsDark = vibe ? ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg) : false
  const navAccent = vibe?.accent || '#C4614A'
  const navMuted = vibe ? (navIsDark ? 'rgba(253,246,240,0.35)' : vibe.muted) : '#9B7B74'
  const navBorder = navIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)'

  return (
    <div style={{ width: '100%', minHeight: '100svh', display: 'flex', justifyContent: 'center', background: appBg, transition: 'background 0.5s ease' }}>
      {screen === 'splash' && <SplashScreen onBegin={() => { localStorage.setItem('cycle_is_guest', '1'); if (!localStorage.getItem('cycle_guest_start')) localStorage.setItem('cycle_guest_start', new Date().toISOString()); setScreen('onboarding-step1') }} onHaveAccount={() => setScreen('login')} onCreateAccount={() => setScreen('create-account')} onGift={() => setScreen('gift-flow')} />}
      {screen === 'login' && <LoginScreen onBack={() => setScreen('splash')} onSuccess={(profile, day) => { setData(profile); localStorage.setItem(DATA_KEY, JSON.stringify(profile)); localStorage.setItem('cycle_is_guest', '0'); setDayNumber(day); localStorage.setItem(DAY_KEY, String(day)); setScreen(day > (profile.cycleDays || 28) ? 'end-of-cycle' : 'day') }} onSignUp={() => setScreen('create-account')} />}
      {/* 3-step onboarding */}
      {screen === 'onboarding-step1' && <OnboardingStep1 onBack={() => setScreen('splash')} onContinue={(name, treatment, cycleDays) => { update({ name, treatment, cycleDays }); track('onboarding_step_completed', { step: 1 }); setScreen('onboarding-step2') }} initialName={data.name} initialTreatment={data.treatment} initialCycleDays={data.cycleDays} />}
      {screen === 'onboarding-step2' && <OnboardingStep2 onBack={() => { setVibePreview(null); setScreen('onboarding-step1') }} onContinue={(vibeKey, components) => { update({ vibe: vibeKey, components }); setVibePreview(null); track('onboarding_step_completed', { step: 2 }); setScreen('onboarding-music') }} initialVibe={data.vibe || null} initialComponents={data.components} onPreview={setVibePreview} />}
      {screen === 'onboarding-music' && data.vibe && <OnboardingMusic onBack={() => setScreen('onboarding-step2')} onContinue={genres => { update({ genres }); track('onboarding_step_completed', { step: 3 }); setScreen('notification-settings') }} vibe={data.vibe} initialValue={data.genres} />}
      {/* Legacy screens for resume-from-partial (old profiles) */}
      {screen === 'onboarding-name' && <OnboardingStep1 onBack={() => setScreen('splash')} onContinue={(name, treatment, cycleDays) => { update({ name, treatment, cycleDays }); setScreen('onboarding-step2') }} initialName={data.name} initialTreatment={data.treatment} initialCycleDays={data.cycleDays} />}
      {screen === 'onboarding-treatment' && <OnboardingStep1 onBack={() => setScreen('splash')} onContinue={(name, treatment, cycleDays) => { update({ name, treatment, cycleDays }); setScreen('onboarding-step2') }} initialName={data.name} initialTreatment={data.treatment} initialCycleDays={data.cycleDays} />}
      {screen === 'onboarding-cycle-length' && <OnboardingStep1 onBack={() => setScreen('splash')} onContinue={(name, treatment, cycleDays) => { update({ name, treatment, cycleDays }); setScreen('onboarding-step2') }} initialName={data.name} initialTreatment={data.treatment} initialCycleDays={data.cycleDays} />}
      {screen === 'onboarding-components' && <OnboardingStep2 onBack={() => setScreen('onboarding-step1') } onContinue={(vibeKey, components) => { update({ vibe: vibeKey, components }); setScreen('onboarding-music') }} initialVibe={data.vibe || null} initialComponents={data.components} onPreview={setVibePreview} />}
      {screen === 'onboarding-vibe' && <OnboardingStep2 onBack={() => setScreen('onboarding-step1') } onContinue={(vibeKey, components) => { update({ vibe: vibeKey, components }); setScreen('onboarding-music') }} initialVibe={data.vibe || null} initialComponents={data.components} onPreview={setVibePreview} />}
      {screen === 'summary' && data.name && data.treatment && data.cycleDays && data.components && data.vibe && data.genres && <Summary data={data as OnboardingData} onStartFree={() => { clearDayDoneKeys(); setDayNumber(1); localStorage.setItem(DAY_KEY, '1'); setScreen('day') }} onUnlock={() => { track('paywall_viewed'); setScreen('paywall') }} />}
      {screen === 'paywall' && <Paywall name={data.name} onBack={() => setScreen('day')} onStartFree={() => { clearDayDoneKeys(); setDayNumber(1); localStorage.setItem(DAY_KEY, '1'); setScreen('day') }} onSelectPlan={plan => {
        track('plan_selected', { plan })
        if (plan === 'free') { setDayNumber(3); localStorage.setItem(DAY_KEY, '3'); setScreen('day'); return }
        if (plan === 'gift') { setScreen('gift-flow'); return }
        setSelectedPlan(plan as 'one_cycle' | 'gift')
        setScreen('payment')
      }} />}
      {screen === 'create-account' && <CreateAccount onBack={() => setScreen('splash')} onSuccess={() => {
        localStorage.setItem('cycle_is_guest', '0')
        const hasProfile = !!(data.name && data.vibe && data.components && data.genres && data.treatment && data.cycleDays)
        if (selectedPlan === 'gift') {
          setScreen('gift-flow')
        } else if (hasProfile && selectedPlan === 'one_cycle') {
          // Came from paywall with a plan picked — proceed to payment
          setScreen('payment')
        } else if (!hasProfile) {
          // New account, no profile yet — build their journey first
          setScreen('onboarding-step1')
        } else {
          // Has profile but no plan yet — show paywall so they can pick free vs paid
          track('paywall_viewed')
          setScreen('paywall')
        }
      }} onLogin={() => setScreen('login')} vibeBg={vibe?.bg} vibeAccent={vibe?.accent} profileData={data as OnboardingData} dayNumber={dayNumber} />}
      {screen === 'notification-settings' && data.name && data.vibe && data.components && <NotificationSettings data={data as OnboardingData} onBack={() => setScreen('onboarding-music')} onDone={() => setScreen('summary')} />}
      {screen === 'register-gate' && <RegisterGate onCreateAccount={() => setScreen('create-account')} onContinueGuest={() => { setDayNumber(3); localStorage.setItem(DAY_KEY, '3'); setScreen('day') }} onUnlock={() => { track('paywall_viewed'); setScreen('paywall') }} cycleDays={data.cycleDays} />}
      {screen === 'day' && data.name && data.vibe && data.components && <DayScreen data={data as OnboardingData} dayNumber={dayNumber} isPremium={isPremium} isPaused={isPaused} onResume={resumeJourney} onDayComplete={() => { const isGuest = localStorage.getItem('cycle_is_guest') === '1'; const nextDay = dayNumber + 1; if (isGuest && nextDay > 3) { setScreen('register-gate'); return } if (!isPremium && nextDay > 3) { track('paywall_viewed'); setScreen('paywall'); return } advanceDay() }} onSettings={() => setScreen('settings')} onGoToDay={day => { if (!isPremium && day > 3) { track('paywall_viewed'); setScreen('paywall'); return } setDayNumber(day); localStorage.setItem(DAY_KEY, String(day)) }} onUnlock={() => { track('paywall_viewed'); setScreen('paywall') }} onEndOfCycle={() => setScreen('end-of-cycle')} />}
      {screen === 'progress' && data.name && data.vibe && data.components && <Progress data={data as OnboardingData} dayNumber={dayNumber} onGoToDay={day => { setDayNumber(day); localStorage.setItem(DAY_KEY, String(day)); setScreen('day') }} onSettings={() => setScreen('settings')} />}
      {screen === 'settings' && data.name && data.vibe && data.components && <Settings data={data as OnboardingData} dayNumber={dayNumber} onUpdateData={update} onDeleteAccount={restartJourney} onLogout={restartJourney} onSignOut={signOut} onBack={() => setScreen('day')} isPaused={isPaused} onPause={pauseJourney} onResume={resumeJourney} isPremium={isPremium} onUpgrade={() => { track('paywall_viewed'); setScreen('paywall') }} />}
      {/* Welcome back overlay after pause */}
      {showWelcomeBack && screen === 'day' && vibe && (
        <div style={{ position: 'fixed', inset: 0, background: vibe.bg, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>&#127800;</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: isDarkBg(vibe.bg) ? '#FDF6F0' : '#1C0F0C', lineHeight: 1.2 }}>
            Welcome back{data.name ? `, ${data.name}` : ''}
          </div>
          <div className="body-font" style={{fontSize: 14, color: isDarkBg(vibe.bg) ? 'rgba(253,246,240,0.5)' : '#9B7B74', lineHeight: 1.6, maxWidth: 280 }}>
            You took a break, and that's okay. You're here now, and that's what matters.
          </div>
          <button onClick={resumeJourney} className="btn-primary" style={{ background: vibe.accent, marginTop: 12 }}>
            Continue my journey
          </button>
        </div>
      )}
      {/* First-launch medical disclaimer — blocks splash until acknowledged */}
      {showDisclaimer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(28,15,12,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#FDF6F0', borderRadius: 16, maxWidth: 360, width: '100%', padding: '28px 24px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💛</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 22, fontWeight: 700, color: '#1C0F0C', lineHeight: 1.25, marginBottom: 10 }}>Before you start</div>
            <div className="body-font" style={{fontSize: 14, color: '#3D1810', lineHeight: 1.55, marginBottom: 18 }}>
              Cycle is for emotional support, not medical advice. Always consult your clinic for anything about your treatment, medication, or symptoms.
            </div>
            <button onClick={ackDisclaimer} className="btn-primary" style={{ background: '#C4614A' }}>I understand</button>
          </div>
        </div>
      )}
      {screen === 'end-of-cycle' && data.name && data.vibe && data.components && <EndOfCycle data={data as OnboardingData} onStartNewCycle={restartJourney} onGift={() => setScreen('gift-flow')} />}
      {screen === 'gift-flow' && <GiftFlow onBack={() => setScreen('splash')} onDone={() => { const hasProfile = data.name && data.vibe; if (hasProfile) { setDayNumber(3); localStorage.setItem(DAY_KEY, '3'); setScreen('day') } else { setScreen('splash') } }} vibeAccent={vibe?.accent} vibeBg={vibe?.bg} />}
      {screen === 'gift-redeem' && <GiftRedeem
        giftCode={new URLSearchParams(window.location.search).get('code') || ''}
        senderName={new URLSearchParams(window.location.search).get('from') || undefined}
        message={new URLSearchParams(window.location.search).get('msg') || undefined}
        onCreateAccount={() => {
          // Recipient registered — they have premium, start onboarding
          window.history.replaceState({}, '', '/')
          setScreen('onboarding-step1')
        }}
        onLogin={() => {
          window.history.replaceState({}, '', '/')
          setScreen('login')
        }}
      />}
      {screen === 'payment' && <PaymentScreen
        plan={selectedPlan}
        onSuccess={plan => {
          if (plan === 'gift') { setScreen('gift-flow'); return }
          localStorage.setItem('cycle_premium', '1')
          setIsPremium(true)
          track('payment_completed', { plan })
          setDayNumber(4); localStorage.setItem(DAY_KEY, '4'); setScreen('day')
        }}
        onBack={() => setScreen('paywall')}
        vibeBg={vibe?.bg}
        vibeAccent={vibe?.accent}
        email={localStorage.getItem('cycle_account_email') || ''}
        userId={data.name || ''}
      />}
      {screen === 'payment-success' && <PaymentSuccess
        onComplete={plan => {
          if (plan === 'gift') { setScreen('gift-flow'); return }
          setIsPremium(true)
          setDayNumber(4); localStorage.setItem(DAY_KEY, '4'); setScreen('day')
        }}
        vibeBg={vibe?.bg}
        vibeAccent={vibe?.accent}
      />}

      {showNav && (
        <div className="bottom-nav" style={{ background: vibe?.bg || '#FDF6F0', borderTop: `1px solid ${navBorder}` }}>
          {([
            { id: 'day' as Screen, label: t('nav.today'), icon: '☀' as const },
            { id: 'progress' as Screen, label: t('nav.progress'), icon: 'calendar' as const },
            { id: 'settings' as Screen, label: 'Settings', icon: '⚙' as const },
          ]).map(tab => {
            const isActive = screen === tab.id
            const color = isActive ? navAccent : navMuted
            const size = isActive ? 20 : 18
            return (
              <button key={tab.id} onClick={() => setScreen(tab.id)} className="btn-nav">
                {tab.icon === 'calendar' ? (
                  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.15s' }}>
                    <rect x="3" y="4.5" width="18" height="17" rx="2" />
                    <line x1="16" y1="2.5" x2="16" y2="6.5" />
                    <line x1="8" y1="2.5" x2="8" y2="6.5" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ) : (
                  <span style={{ fontSize: size, color, transition: 'all 0.15s' }}>{tab.icon}</span>
                )}
                <span className="nav-label" style={{ color }}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default App
