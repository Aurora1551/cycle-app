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
import type { OnboardingData, VibeKey } from './types'
import { VIBES } from './types'

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
  | 'day'
  | 'settings'
  | 'notification-settings'
  | 'end-of-cycle'
  | 'gift-flow'

const ONBOARDING_VIBE_SCREENS: Screen[] = ['onboarding-vibe', 'onboarding-music', 'summary', 'paywall', 'create-account', 'day', 'settings', 'notification-settings', 'end-of-cycle', 'gift-flow']
const DARK_SCREENS: Screen[] = ['splash', 'summary', 'end-of-cycle']

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
          onContinue={name => { update({ name }); setScreen('onboarding-treatment') }}
          initialValue={data.name}
        />
      )}

      {screen === 'onboarding-treatment' && (
        <OnboardingTreatment
          onBack={() => setScreen('onboarding-name')}
          onContinue={treatment => { update({ treatment }); setScreen('onboarding-cycle-length') }}
          initialValue={data.treatment}
        />
      )}

      {screen === 'onboarding-cycle-length' && (
        <OnboardingCycleLength
          onBack={() => setScreen('onboarding-treatment')}
          onContinue={cycleDays => { update({ cycleDays }); setScreen('onboarding-components') }}
          initialValue={data.cycleDays}
        />
      )}

      {screen === 'onboarding-components' && (
        <OnboardingComponents
          onBack={() => setScreen('onboarding-cycle-length')}
          onContinue={components => { update({ components }); setScreen('onboarding-vibe') }}
          initialValue={data.components}
        />
      )}

      {screen === 'onboarding-vibe' && (
        <OnboardingVibe
          onBack={() => { setVibePreview(null); setScreen('onboarding-components') }}
          onContinue={vibeKey => {
            update({ vibe: vibeKey })
            setVibePreview(null)
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
            setScreen('summary')
          }}
          vibe={data.vibe}
          initialValue={data.genres}
        />
      )}

      {screen === 'summary' && data.name && data.treatment && data.cycleDays && data.components && data.vibe && data.genres && (
        <Summary
          data={data as OnboardingData}
          onStartFree={() => { setScreen('day') }}
          onUnlock={() => setScreen('paywall')}
        />
      )}

      {screen === 'paywall' && (
        <Paywall
          name={data.name}
          onStartFree={() => setScreen('day')}
          onSelectPlan={plan => {
            if (plan === 'gift') setScreen('gift-flow')
            else setScreen('create-account')
          }}
        />
      )}

      {screen === 'create-account' && (
        <CreateAccount
          onBack={() => setScreen('paywall')}
          onSuccess={() => setScreen('day')}
          vibeBg={vibe?.bg}
          vibeAccent={vibe?.accent}
        />
      )}

      {screen === 'day' && data.name && data.vibe && data.components && (
        <DayScreen
          data={data as OnboardingData}
          dayNumber={dayNumber}
          onDayComplete={advanceDay}
          onSettings={() => setScreen('settings')}
        />
      )}

      {screen === 'settings' && data.name && (
        <Settings
          data={data as OnboardingData}
          dayNumber={dayNumber}
          onBack={() => setScreen('day')}
          onNotifications={() => setScreen('notification-settings')}
          onRestartOnboarding={restartJourney}
        />
      )}

      {screen === 'notification-settings' && data.name && (
        <NotificationSettings
          data={data as OnboardingData}
          onBack={() => setScreen('settings')}
        />
      )}

      {screen === 'end-of-cycle' && data.name && data.vibe && data.components && (
        <EndOfCycle
          data={data as OnboardingData}
          onShareWhatsApp={() => {}}
          onStartNewCycle={restartJourney}
        />
      )}

      {screen === 'gift-flow' && (
        <GiftFlow
          onBack={() => setScreen('paywall')}
          vibeAccent={vibe?.accent}
          vibeBg={vibe?.bg}
        />
      )}
    </div>
  )
}

export default App
