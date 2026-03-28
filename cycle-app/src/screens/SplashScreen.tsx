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
    <div style={{
      width: '100%',
      maxWidth: 390,
      minHeight: '100svh',
      background: '#0E0E0E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.6s ease',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #E8A598, #C4614A)',
        boxShadow: '0 12px 36px rgba(196,97,74,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
        marginBottom: 20,
        animation: 'float 3s ease-in-out infinite',
      }}>
        🌸
      </div>

      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 48,
        fontWeight: 700,
        color: '#FDF6F0',
        letterSpacing: '-0.5px',
        marginBottom: 8,
        lineHeight: 1,
      }}>
        Cycle
      </h1>

      <p style={{
        fontFamily: "'Karla', sans-serif",
        fontSize: 13,
        fontWeight: 300,
        color: 'rgba(253,246,240,0.4)',
        marginBottom: 48,
        letterSpacing: '0.02em',
      }}>
        Daily strength for your journey
      </p>

      <button
        onClick={onBegin}
        style={{
          width: '100%',
          background: '#C4614A',
          color: '#FDF6F0',
          border: 'none',
          borderRadius: 14,
          padding: '16px',
          fontFamily: "'Karla', sans-serif",
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
          letterSpacing: '0.02em',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.985)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1'
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
      >
        Begin →
      </button>

      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        color: '#333',
        letterSpacing: '0.12em',
        margin: '4px 0',
      }}>
        or
      </div>

      <button
        onClick={onHaveAccount}
        style={{
          width: '100%',
          background: 'transparent',
          color: 'rgba(253,246,240,0.5)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: '16px',
          fontFamily: "'Karla', sans-serif",
          fontSize: 14,
          fontWeight: 400,
          cursor: 'pointer',
          letterSpacing: '0.02em',
          transition: 'border-color 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'
        }}
      >
        I have an account
      </button>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

export default SplashScreen
