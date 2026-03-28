import { useState } from 'react'
import SplashScreen from './screens/SplashScreen'
import OnboardingName from './screens/OnboardingName'

type Screen = 'splash' | 'onboarding-name'

interface OnboardingData {
  name: string
}

function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({})

  const handleBegin = () => {
    setScreen('onboarding-name')
  }

  const handleHaveAccount = () => {
    console.log('Navigate to login — coming soon')
  }

  const handleNameContinue = (name: string) => {
    setOnboardingData(prev => ({ ...prev, name }))
    console.log('Name saved:', name, '— next onboarding steps coming soon')
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: screen === 'splash' ? '#0E0E0E' : '#FDF6F0',
      transition: 'background 0.4s ease',
    }}>
      {screen === 'splash' && (
        <SplashScreen
          onBegin={handleBegin}
          onHaveAccount={handleHaveAccount}
        />
      )}
      {screen === 'onboarding-name' && (
        <OnboardingName
          onBack={() => setScreen('splash')}
          onContinue={handleNameContinue}
        />
      )}
    </div>
  )
}

export default App
