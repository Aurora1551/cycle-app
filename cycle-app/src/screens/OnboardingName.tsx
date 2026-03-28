import React, { useState, useRef, useEffect } from 'react'

interface OnboardingNameProps {
  onBack: () => void
  onContinue: (name: string) => void
}

const TOTAL_STEPS = 6
const STEP = 1

const OnboardingName: React.FC<OnboardingNameProps> = ({ onBack, onContinue }) => {
  const [name, setName] = useState('')
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true)
      inputRef.current?.focus()
    }, 60)
    return () => clearTimeout(t)
  }, [])

  const handleContinue = () => {
    if (name.trim()) {
      onContinue(name.trim())
    }
  }

  const progress = (STEP / TOTAL_STEPS) * 100

  return (
    <div style={{
      width: '100%',
      maxWidth: 390,
      minHeight: '100svh',
      background: '#FDF6F0',
      display: 'flex',
      flexDirection: 'column',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{
        height: 3,
        width: '100%',
        background: 'rgba(196,97,74,0.1)',
        flexShrink: 0,
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #C4614A, #D4956A)',
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
          color: '#9B7B74',
          padding: '14px 20px 6px',
          textAlign: 'left',
          display: 'block',
        }}
      >
        ← back
      </button>

      <div style={{
        padding: '16px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: 10,
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#C4614A',
          marginBottom: 2,
        }}>
          Step {STEP} of {TOTAL_STEPS}
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 30,
          fontWeight: 700,
          color: '#1C0F0C',
          lineHeight: 1.1,
          marginBottom: 4,
        }}>
          What's your name?
        </h1>

        <p style={{
          fontFamily: "'Karla', sans-serif",
          fontSize: 13,
          fontWeight: 300,
          color: '#9B7B74',
          lineHeight: 1.5,
          marginBottom: 8,
        }}>
          We'll use this to make everything feel personal.
        </p>

        <div style={{
          background: 'white',
          border: '1.5px solid rgba(196,97,74,0.2)',
          borderRadius: 12,
          padding: '14px 16px',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleContinue() }}
            placeholder="Your name"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24,
              fontWeight: 600,
              color: '#1C0F0C',
              caretColor: '#C4614A',
            }}
            onFocus={e => {
              const parent = e.currentTarget.parentElement
              if (parent) {
                parent.style.borderColor = '#C4614A'
                parent.style.boxShadow = '0 0 0 3px rgba(196,97,74,0.1)'
              }
            }}
            onBlur={e => {
              const parent = e.currentTarget.parentElement
              if (parent) {
                parent.style.borderColor = 'rgba(196,97,74,0.2)'
                parent.style.boxShadow = 'none'
              }
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleContinue}
          disabled={!name.trim()}
          style={{
            width: '100%',
            background: name.trim() ? '#C4614A' : 'rgba(196,97,74,0.3)',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontFamily: "'Karla', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s ease, transform 0.15s ease',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => {
            if (name.trim()) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.985)'
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.9'
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

export default OnboardingName
