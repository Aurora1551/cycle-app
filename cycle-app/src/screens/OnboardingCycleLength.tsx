import React, { useState, useEffect } from 'react'
import OnboardingLayout from '../components/OnboardingLayout'

interface Props {
  onBack: () => void
  onContinue: (days: number) => void
  initialValue?: number
}

const ACCENT = '#C4614A'
const BG = '#FDF6F0'
const TEXT = '#1C0F0C'
const MUTED = '#9B7B74'

const OnboardingCycleLength: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const [days, setDays] = useState(initialValue || 14)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const decrement = () => setDays(d => Math.max(1, d - 1))
  const increment = () => setDays(d => Math.min(60, d + 1))

  const totalDots = Math.min(days, 28)
  const filledDots = Math.ceil(totalDots * 0.3)

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', width: '100%' }}>
      <OnboardingLayout
        step={3} totalSteps={6}
        bg={BG} accent={ACCENT} text={TEXT} muted={MUTED}
        onBack={onBack}
      >
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT }}>
          Step 3 of 6
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
          How many days?
        </h1>

        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: MUTED, lineHeight: 1.5 }}>
          We'll create a unique companion for each day.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'white',
            border: '1.5px solid rgba(196,97,74,0.15)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <button
              onClick={decrement}
              style={{
                width: 48,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: ACCENT,
                fontSize: 22,
                cursor: 'pointer',
                fontWeight: 300,
              }}
            >
              −
            </button>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 32,
              fontWeight: 700,
              color: TEXT,
              width: 60,
              textAlign: 'center',
              borderLeft: '1px solid rgba(196,97,74,0.12)',
              borderRight: '1px solid rgba(196,97,74,0.12)',
              lineHeight: '56px',
            }}>
              {days}
            </div>
            <button
              onClick={increment}
              style={{
                width: 48,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: ACCENT,
                fontSize: 22,
                cursor: 'pointer',
                fontWeight: 300,
              }}
            >
              +
            </button>
          </div>
          <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: MUTED, lineHeight: 1.5 }}>
            days in<br />your cycle
          </p>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid rgba(196,97,74,0.12)',
          borderRadius: 12,
          padding: '14px 16px',
          marginTop: 4,
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED, marginBottom: 10 }}>
            Your journey preview
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {Array.from({ length: totalDots }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: i < filledDots
                    ? ACCENT
                    : 'rgba(196,97,74,0.12)',
                  boxShadow: i === filledDots - 1 ? `0 0 6px ${ACCENT}88` : 'none',
                  transition: 'background 0.2s ease',
                }}
              />
            ))}
            {days > 28 && (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: MUTED, alignSelf: 'center', marginLeft: 2 }}>
                +{days - 28} more
              </div>
            )}
          </div>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 11, color: MUTED, marginTop: 8 }}>
            {filledDots} of {days} days shown · first 3 days free
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => onContinue(days)}
          style={{
            width: '100%',
            background: ACCENT,
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontFamily: "'Karla', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          Continue →
        </button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingCycleLength
