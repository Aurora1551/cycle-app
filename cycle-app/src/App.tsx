import { useState, useEffect } from 'react'
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
import type { OnboardingData, VibeKey } from './types'
import { VIBES } from './types'
import { track } from './lib/posthog'

type Screen =
  | 'splash'
  | 'onboarding-name'
  | 'onboarding-treatment'
  | 'onboarding-cycle-length'
  | 'onboarding-components'
  | 'onboarding-vibe'
  | 'onboarding-music'
  | 'summary'
  | 'paywall'
  | 'create-account'
  | 'notification-settings'
  | 'day'
  | 'progress'
  | 'settings'
  | 'end-of-cycle'
  | 'gift-flow'

const ONBOARDING_VIBE_SCREENS: Screen[] = ['onboarding-vibe', 'onboarding-music', 'summary', 'paywall', 'create-account', 'notification-settings', 'day', 'progress', 'settings', 'end-of-cycle', 'gift-flow']
const DARK_SCREENS: Screen[] = ['splash', 'summary', 'end-of-cycle']
const NAV_SCREENS: Screen[] = ['day', 'progress', 'settings']

function getAppBg(screen: Screen, vibe: VibeKey | null, preview: VibeKey | null): string {
  if (screen === 'splash') return '#0E0E0E'
  const activeVibe = preview || vibe
  if (ONBOARDING_VIBE_SCREENS.includes(screen) && activeVibe) {
    return VIBES.find(v => v.key === activeVibe)?.bg || '#FDF6F0'
  }
  return '#FDF6F0'
}

const DATA_KEY = 'cycle_onboarding_data'
const DAY_KEY = 'cycle_current_day'

function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [data, setData] = useState<Partial<OnboardingData>>(() => {
    try { return JSON.parse(localStorage.getItem(DATA_KEY) || '{}') } catch { return {} }
  })
  const [vibePreview, setVibePreview] = useState<VibeKey | null>(null)
  const [dayNumber, setDayNumber] = useState(() => {
    return parseInt(localStorage.getItem(DAY_KEY) || '1', 10)
  })
  const [isPremium] = useState(() => localStorage.getItem('cycle_premium') === '1')

  const update = (patch: Partial<OnboardingData>) => {
    const next = { ...data, ...patch }
    setData(next)
    localStorage.setItem(DATA_KEY, JSON.stringify(next))
  }

  useEffect(() => {
    const saved = localStorage.getItem(DATA_KEY)
    if (saved) {
      try {
        const d = JSON.parse(saved) as Partial<OnboardingData>
        if (d.name && d.treatment && d.cycleDays && d.components && d.vibe && d.genres) {
          setData(d)
          const day = parseInt(localStorage.getItem(DAY_KEY) || '1', 10)
          setDayNumber(day)
          if (day > (d.cycleDays || 28)) {
            setScreen('end-of-cycle')
          } else {
            setScreen('day')
          }
        }
      } catch {}
    }
  }, [])

  const appBg = getAppBg(screen, data.vibe || null, vibePreview)
  const vibe = VIBES.find(v => v.key === (data.vibe || null)) || null

  const advanceDay = () => {
    const next = dayNumber + 1
    localStorage.setItem(DAY_KEY, String(next))
    setDayNumber(next)
    if (data.cycleDays && next > data.cycleDays) {
      setScreen('end-of-cycle')
    }
  }

  const restartJourney = () => {
    localStorage.removeItem(DATA_KEY)
    localStorage.removeItem(DAY_KEY)
    setData({})
    setDayNumber(1)
    setScreen('splash')
  }

  const showNav = NAV_SCREENS.includes(screen)

  const navVibe = vibe
  const navIsDark = navVibe ? ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(navVibe.bg) : false
  const navBg = navVibe ? navVibe.bg : '#FDF6F0'
  const navAccent = navVibe ? navVibe.accent : '#C4614A'
  const navMuted = navVibe
    ? (navIsDark ? 'rgba(253,246,240,0.35)' : navVibe.muted)
    : '#9B7B74'
  const navBorder = navIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)'

  return (
    <div style={{
      width: '100%',
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: appBg,
      transition: 'background 0.5s ease',
    }}>
      {screen === 'splash' && (
        <SplashScreen
          onBegin={() => setScreen('onboarding-name')}
          onHaveAccount={() => setScreen('onboarding-name')}
        />
      )}

      {screen === 'onboarding-name' && (
        <OnboardingName
          onBack={() => setScreen('splash')}
          onContinue={name => { update({ name }); track('onboarding_step_completed', { step: 1 }); setScreen('onboarding-treatment') }}
          initialValue={data.name}
        />
      )}

      {screen === 'onboarding-treatment' && (
        <OnboardingTreatment
          onBack={() => setScreen('onboarding-name')}
          onContinue={treatment => { update({ treatment }); track('onboarding_step_completed', { step: 2 }); setScreen('onboarding-cycle-length') }}
          initialValue={data.treatment}
        />
      )}

      {screen === 'onboarding-cycle-length' && (
        <OnboardingCycleLength
          onBack={() => setScreen('onboarding-treatment')}
          onContinue={cycleDays => { update({ cycleDays }); track('onboarding_step_completed', { step: 3 }); setScreen('onboarding-components') }}
          initialValue={data.cycleDays}
        />
      )}

      {screen === 'onboarding-components' && (
        <OnboardingComponents
          onBack={() => setScreen('onboarding-cycle-length')}
          onContinue={components => { update({ components }); track('onboarding_step_completed', { step: 4 }); setScreen('onboarding-vibe') }}
          initialValue={data.components}
        />
      )}

      {screen === 'onboarding-vibe' && (
        <OnboardingVibe
          onBack={() => { setVibePreview(null); setScreen('onboarding-components') }}
          onContinue={vibeKey => {
            update({ vibe: vibeKey })
            setVibePreview(null)
            track('onboarding_step_completed', { step: 5 })
            setScreen('onboarding-music')
          }}
          initialValue={data.vibe || null}
          onPreview={setVibePreview}
        />
      )}

      {screen === 'onboarding-music' && data.vibe && (
        <OnboardingMusic
          onBack={() => setScreen('onboarding-vibe')}
          onContinue={genres => {
            update({ genres })
            track('onboarding_step_completed', { step: 6 })
            setScreen('summary')
          }}
          vibe={data.vibe}
          initialValue={data.genres}
        />
      )}

      {screen === 'summary' && data.name && data.treatment && data.cycleDays && data.components && data.vibe && data.genres && (
        <Summary
          data={data as OnboardingData}
          onStartFree={() => setScreen('day')}
          onUnlock={() => { track('paywall_viewed'); setScreen('paywall') }}
        />
      )}

      {screen === 'paywall' && (
        <Paywall
          name={data.name}
          onStartFree={() => setScreen('day')}
          onSelectPlan={plan => {
            track('plan_selected', { plan })
            if (plan === 'gift') setScreen('gift-flow')
            else setScreen('create-account')
          }}
        />
      )}

      {screen === 'create-account' && (
        <CreateAccount
          onBack={() => setScreen('paywall')}
          onSuccess={() => setScreen('notification-settings')}
          vibeBg={vibe?.bg}
          vibeAccent={vibe?.accent}
        />
      )}

      {screen === 'notification-settings' && data.name && data.vibe && data.components && (
        <NotificationSettings
          data={data as OnboardingData}
          onDone={() => setScreen('day')}
        />
      )}

      {screen === 'day' && data.name && data.vibe && data.components && (
        <DayScreen
          data={data as OnboardingData}
          dayNumber={dayNumber}
          isPremium={isPremium}
          onDayComplete={advanceDay}
          onSettings={() => setScreen('settings')}
        />
      )}

      {screen === 'progress' && data.name && data.vibe && data.components && (
        <Progress
          data={data as OnboardingData}
          dayNumber={dayNumber}
        />
      )}

      {screen === 'settings' && data.name && data.vibe && data.components && (
        <Settings
          data={data as OnboardingData}
          dayNumber={dayNumber}
          onUpdateData={update}
          onDeleteAccount={restartJourney}
        />
      )}

      {screen === 'end-of-cycle' && data.name && data.vibe && data.components && (
        <EndOfCycle
          data={data as OnboardingData}
          onStartNewCycle={restartJourney}
          onGift={() => setScreen('gift-flow')}
        />
      )}

      {screen === 'gift-flow' && (
        <GiftFlow
          onBack={() => setScreen('paywall')}
          vibeAccent={vibe?.accent}
          vibeBg={vibe?.bg}
        />
      )}

      {/* Bottom navigation */}
      {showNav && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 390,
          height: 64,
          background: navBg,
          borderTop: `1px solid ${navBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 50,
        }}>
          {([
            { id: 'day', label: 'Today', icon: '☀' },
            { id: 'progress', label: 'Progress', icon: '○' },
            { id: 'settings', label: 'Settings', icon: '⚙' },
          ] as { id: Screen; label: string; icon: string }[]).map(tab => {
            const isActive = screen === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 0',
                }}
              >
                <span style={{ fontSize: isActive ? 20 : 18, color: isActive ? navAccent : navMuted, transition: 'all 0.15s' }}>
                  {tab.icon}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive ? navAccent : navMuted, transition: 'color 0.15s' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default App
