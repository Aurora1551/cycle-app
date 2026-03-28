import React from 'react'

interface OnboardingLayoutProps {
  step: number
  totalSteps: number
  bg: string
  accent: string
  text: string
  muted: string
  onBack: () => void
  children: React.ReactNode
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  step, totalSteps, bg, accent, text: _text, muted, onBack, children,
}) => {
  const progress = (step / totalSteps) * 100

  return (
    <div style={{
      width: '100%',
      maxWidth: 390,
      minHeight: '100svh',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      transition: 'background 0.5s ease',
    }}>
      <div style={{ height: 3, width: '100%', background: `${accent}22`, flexShrink: 0 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
          borderRadius: 2,
          transition: 'width 0.5s ease',
        }} />
      </div>

      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.1em',
          color: muted,
          padding: '14px 20px 6px',
          textAlign: 'left',
          display: 'block',
          transition: 'color 0.3s ease',
        }}
      >
        ← back
      </button>

      <div style={{
        padding: '12px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: 12,
      }}>
        {children}
      </div>
    </div>
  )
}

export default OnboardingLayout
