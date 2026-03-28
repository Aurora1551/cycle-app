import { useState } from 'react'
import SplashScreen from './screens/SplashScreen'
import OnboardingName from './screens/OnboardingName'
import OnboardingTreatment from './screens/OnboardingTreatment'
import OnboardingCycleLength from './screens/OnboardingCycleLength'
import OnboardingComponents from './screens/OnboardingComponents'
import OnboardingVibe from './screens/OnboardingVibe'
import OnboardingMusic from './screens/OnboardingMusic'
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

function getAppBg(screen: Screen, vibe: VibeKey | null, preview: VibeKey | null): string {
  if (screen === 'splash') return '#0E0E0E'
  if (screen === 'onboarding-vibe' || screen === 'onboarding-music') {
    const activeVibe = preview || vibe
    if (activeVibe) return VIBES.find(v => v.key === activeVibe)?.bg || '#FDF6F0'
  }
  return '#FDF6F0'
}

function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [vibePreview, setVibePreview] = useState<VibeKey | null>(null)

  const update = (patch: Partial<OnboardingData>) =>
    setData(prev => ({ ...prev, ...patch }))

  const appBg = getAppBg(screen, data.vibe || null, vibePreview)

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
          onHaveAccount={() => console.log('Login — coming soon')}
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
          onContinue={vibe => {
            update({ vibe })
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
            console.log('Onboarding complete:', { ...data, genres })
          }}
          vibe={data.vibe}
          initialValue={data.genres}
        />
      )}
    </div>
  )
}

export default App
