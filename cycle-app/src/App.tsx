import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import SplashScreen from './screens/SplashScreen'
import OnboardingName from './screens/OnboardingName'
import OnboardingTreatment from './screens/OnboardingTreatment'
import OnboardingCycleLength from './screens/OnboardingCycleLength'
import OnboardingComponents from './screens/OnboardingComponents'
import OnboardingVibe from './screens/OnboardingVibe'
import OnboardingMusic from './screens/OnboardingMusic'
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
import type { OnboardingData, VibeKey } from './types'
import { VIBES } from './types'
import { track } from './lib/posthog'
import { saveProfile } from './lib/db'
import { handleSpotifyCallback, verifySpotifyState } from './lib/spotify'

type Screen =
  | 'splash' | 'login' | 'onboarding-name' | 'onboarding-treatment'
  | 'onboarding-cycle-length' | 'onboarding-components'
  | 'onboarding-vibe' | 'onboarding-music' | 'summary'
  | 'paywall' | 'create-account' | 'notification-settings'
  | 'day' | 'progress' | 'settings' | 'end-of-cycle' | 'gift-flow'
  | 'register-gate' | 'payment' | 'payment-success'

const ONBOARDING_VIBE_SCREENS: Screen[] = ['onboarding-vibe', 'onboarding-music', 'summary', 'paywall', 'create-account', 'notification-settings', 'day', 'progress', 'settings', 'end-of-cycle', 'gift-flow', 'payment', 'payment-success']
const NAV_SCREENS: Screen[] = ['day', 'progress']

function getAppBg(screen: Screen, vibe: VibeKey | null, preview: VibeKey | null): string {
  if (screen === 'splash' || screen === 'login' || screen === 'register-gate') return '#0E0E0E'
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
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('cycle_premium') === '1')
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
      return // Don't process Spotify callback on payment redirect
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
          const saved = localStorage.getItem(DATA_KEY)
          let userId = 'default'
          if (saved) {
            try { userId = JSON.parse(saved).name || 'default' } catch {}
          }
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
          setData(d)
          const day = parseInt(localStorage.getItem(DAY_KEY) || '1', 10)
          setDayNumber(day)
          // If returning from Spotify callback, go to settings; otherwise normal flow
          if (isSpotifyCallback && (spotifyCode || spotifyError)) {
            setScreen('settings')
          } else {
            setScreen(day > (d.cycleDays || 28) ? 'end-of-cycle' : 'day')
          }
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

  const restartJourney = () => {
    localStorage.removeItem(DATA_KEY)
    localStorage.removeItem(DAY_KEY)
    localStorage.removeItem('cycle_is_guest')
    localStorage.removeItem('cycle_guest_start')
    localStorage.removeItem('cycle_register_dismissed')
    localStorage.removeItem('cycle_account_email')
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
      {screen === 'splash' && <SplashScreen onBegin={() => { localStorage.setItem('cycle_is_guest', '1'); if (!localStorage.getItem('cycle_guest_start')) localStorage.setItem('cycle_guest_start', new Date().toISOString()); setScreen('onboarding-name') }} onHaveAccount={() => setScreen('login')} />}
      {screen === 'login' && <LoginScreen onBack={() => setScreen('splash')} onSuccess={(profile, day) => { setData(profile); localStorage.setItem(DATA_KEY, JSON.stringify(profile)); localStorage.setItem('cycle_is_guest', '0'); setDayNumber(day); localStorage.setItem(DAY_KEY, String(day)); setScreen(day > (profile.cycleDays || 28) ? 'end-of-cycle' : 'day') }} onSignUp={() => setScreen('onboarding-name')} />}
      {screen === 'onboarding-name' && <OnboardingName onBack={() => setScreen('splash')} onContinue={name => { update({ name }); track('onboarding_step_completed', { step: 1 }); setScreen('onboarding-treatment') }} initialValue={data.name} />}
      {screen === 'onboarding-treatment' && <OnboardingTreatment onBack={() => setScreen('onboarding-name')} onContinue={treatment => { update({ treatment }); track('onboarding_step_completed', { step: 2 }); setScreen('onboarding-cycle-length') }} initialValue={data.treatment} />}
      {screen === 'onboarding-cycle-length' && <OnboardingCycleLength onBack={() => setScreen('onboarding-treatment')} onContinue={cycleDays => { update({ cycleDays }); track('onboarding_step_completed', { step: 3 }); setScreen('onboarding-components') }} initialValue={data.cycleDays} />}
      {screen === 'onboarding-components' && <OnboardingComponents onBack={() => setScreen('onboarding-cycle-length')} onContinue={components => { update({ components }); track('onboarding_step_completed', { step: 4 }); setScreen('onboarding-vibe') }} initialValue={data.components} />}
      {screen === 'onboarding-vibe' && <OnboardingVibe onBack={() => { setVibePreview(null); setScreen('onboarding-components') }} onContinue={vibeKey => { update({ vibe: vibeKey }); setVibePreview(null); track('onboarding_step_completed', { step: 5 }); setScreen('onboarding-music') }} initialValue={data.vibe || null} onPreview={setVibePreview} />}
      {screen === 'onboarding-music' && data.vibe && <OnboardingMusic onBack={() => setScreen('onboarding-vibe')} onContinue={genres => { update({ genres }); track('onboarding_step_completed', { step: 6 }); setScreen('summary') }} vibe={data.vibe} initialValue={data.genres} />}
      {screen === 'summary' && data.name && data.treatment && data.cycleDays && data.components && data.vibe && data.genres && <Summary data={data as OnboardingData} onStartFree={() => { clearDayDoneKeys(); setDayNumber(1); localStorage.setItem(DAY_KEY, '1'); setScreen('day') }} onUnlock={() => { track('paywall_viewed'); setScreen('paywall') }} />}
      {screen === 'paywall' && <Paywall name={data.name} onBack={() => setScreen('day')} onStartFree={() => { clearDayDoneKeys(); setDayNumber(1); localStorage.setItem(DAY_KEY, '1'); setScreen('day') }} onSelectPlan={plan => {
        track('plan_selected', { plan })
        if (plan === 'free') { setScreen('day'); return }
        setSelectedPlan(plan === 'gift' ? 'gift' : 'one_cycle')
        // Check if logged in — if not, create account first
        const hasAccount = localStorage.getItem('cycle_account_email')
        if (hasAccount) { setScreen('payment') } else { setScreen('create-account') }
      }} />}
      {screen === 'create-account' && <CreateAccount onBack={() => setScreen('paywall')} onSuccess={() => {
        localStorage.setItem('cycle_is_guest', '0')
        // If a paid plan was selected, go to payment; otherwise notification settings
        if (selectedPlan === 'one_cycle' || selectedPlan === 'gift') {
          setScreen('payment')
        } else {
          setScreen('notification-settings')
        }
      }} onLogin={() => setScreen('login')} vibeBg={vibe?.bg} vibeAccent={vibe?.accent} profileData={data as OnboardingData} dayNumber={dayNumber} />}
      {screen === 'notification-settings' && data.name && data.vibe && data.components && <NotificationSettings data={data as OnboardingData} onDone={() => setScreen('day')} />}
      {screen === 'register-gate' && <RegisterGate onCreateAccount={() => setScreen('create-account')} onContinueGuest={() => setScreen('day')} />}
      {screen === 'day' && data.name && data.vibe && data.components && <DayScreen data={data as OnboardingData} dayNumber={dayNumber} isPremium={isPremium} onDayComplete={() => { const isGuest = localStorage.getItem('cycle_is_guest') === '1'; const nextDay = dayNumber + 1; if (isGuest && nextDay > 3 && localStorage.getItem('cycle_register_dismissed') !== '1') { advanceDay(); setScreen('register-gate'); return } advanceDay() }} onSettings={() => setScreen('settings')} onGoToDay={day => { setDayNumber(day); localStorage.setItem(DAY_KEY, String(day)) }} onUnlock={() => { track('paywall_viewed'); setScreen('paywall') }} onEndOfCycle={() => setScreen('end-of-cycle')} />}
      {screen === 'progress' && data.name && data.vibe && data.components && <Progress data={data as OnboardingData} dayNumber={dayNumber} onGoToDay={day => { setDayNumber(day); localStorage.setItem(DAY_KEY, String(day)); setScreen('day') }} />}
      {screen === 'settings' && data.name && data.vibe && data.components && <Settings data={data as OnboardingData} dayNumber={dayNumber} onUpdateData={update} onDeleteAccount={restartJourney} onLogout={restartJourney} onBack={() => setScreen('day')} />}
      {screen === 'end-of-cycle' && data.name && data.vibe && data.components && <EndOfCycle data={data as OnboardingData} onStartNewCycle={restartJourney} onGift={() => setScreen('gift-flow')} />}
      {screen === 'gift-flow' && <GiftFlow onBack={() => setScreen('paywall')} vibeAccent={vibe?.accent} vibeBg={vibe?.bg} />}
      {screen === 'payment' && <PaymentScreen
        plan={selectedPlan}
        onSuccess={plan => {
          localStorage.setItem('cycle_premium', '1')
          setIsPremium(true)
          track('payment_completed', { plan })
          if (plan === 'gift') { setScreen('gift-flow') } else { setDayNumber(1); localStorage.setItem(DAY_KEY, '1'); setScreen('day') }
        }}
        onBack={() => setScreen('paywall')}
        vibeBg={vibe?.bg}
        vibeAccent={vibe?.accent}
        email={localStorage.getItem('cycle_account_email') || ''}
        userId={data.name || ''}
      />}
      {screen === 'payment-success' && <PaymentSuccess
        onComplete={plan => {
          setIsPremium(true)
          if (plan === 'gift') { setScreen('gift-flow') } else { setDayNumber(1); localStorage.setItem(DAY_KEY, '1'); setScreen('day') }
        }}
        vibeBg={vibe?.bg}
        vibeAccent={vibe?.accent}
      />}

      {showNav && (
        <div className="bottom-nav" style={{ background: vibe?.bg || '#FDF6F0', borderTop: `1px solid ${navBorder}` }}>
          {([
            { id: 'day' as Screen, label: t('nav.today'), icon: '☀' },
            { id: 'progress' as Screen, label: t('nav.progress'), icon: '○' },
          ]).map(tab => {
            const isActive = screen === tab.id
            const color = isActive ? navAccent : navMuted
            return (
              <button key={tab.id} onClick={() => setScreen(tab.id)} className="btn-nav">
                <span style={{ fontSize: isActive ? 20 : 18, color, transition: 'all 0.15s' }}>{tab.icon}</span>
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
