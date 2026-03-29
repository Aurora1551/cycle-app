import React, { useEffect, useState } from 'react'

interface SplashScreenProps {
  onBegin: () => void
  onHaveAccount: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onBegin, onHaveAccount }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="screen flex-center" style={{
      background: '#0E0E0E', padding: '40px 32px',
      opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease',
    }}>
      <div className="flex-center" style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #E8A598, #C4614A)',
        boxShadow: '0 12px 36px rgba(196,97,74,0.45)',
        fontSize: 32, marginBottom: 20, animation: 'float 3s ease-in-out infinite',
      }}>
        🌸
      </div>

      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 700, color: '#FDF6F0', letterSpacing: '-0.5px', marginBottom: 8, lineHeight: 1 }}>
        Cycle
      </h1>

      <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(253,246,240,0.4)', marginBottom: 48, letterSpacing: '0.02em' }}>
        Daily strength for your journey
      </p>

      <button onClick={onBegin} className="btn-primary" style={{ background: '#C4614A', marginBottom: 12 }}>
        Begin →
      </button>

      <div className="mono-xs" style={{ color: '#333', margin: '4px 0' }}>or</div>

      <button onClick={onHaveAccount} className="btn-ghost" style={{
        color: 'rgba(253,246,240,0.5)', border: '1px solid rgba(255,255,255,0.12)',
      }}>
        I have an account
      </button>
    </div>
  )
}

export default SplashScreen
