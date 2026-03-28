import React, { useState, useEffect } from 'react'
import OnboardingLayout from '../components/OnboardingLayout'

interface Props {
  onBack: () => void
  onContinue: (treatment: string) => void
  initialValue?: string
}

const TREATMENTS = [
  { id: 'egg-freezing', emoji: '🥚', label: 'Egg Freezing', desc: 'Oocyte cryopreservation' },
  { id: 'ivf', emoji: '💫', label: 'IVF', desc: 'In vitro fertilization' },
  { id: 'iui', emoji: '🌱', label: 'IUI', desc: 'Intrauterine insemination' },
  { id: 'egg-donation', emoji: '🤝', label: 'Egg Donation', desc: '' },
  { id: 'other', emoji: '✨', label: 'Other', desc: '' },
]

const ACCENT = '#C4614A'
const BG = '#FDF6F0'
const TEXT = '#1C0F0C'
const MUTED = '#9B7B74'

const OnboardingTreatment: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const [selected, setSelected] = useState(initialValue || '')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', width: '100%' }}>
      <OnboardingLayout
        step={2} totalSteps={6}
        bg={BG} accent={ACCENT} text={TEXT} muted={MUTED}
        onBack={onBack}
      >
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT }}>
          Step 2 of 6
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
          What are you going through?
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TREATMENTS.map(t => {
            const isSelected = selected === t.id
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: isSelected ? `rgba(196,97,74,0.06)` : 'white',
                  border: isSelected ? `1.5px solid ${ACCENT}` : '1.5px solid rgba(196,97,74,0.12)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(196,97,74,0.1)' : 'none',
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.18s ease',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isSelected ? 'rgba(196,97,74,0.15)' : 'rgba(232,165,152,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}>
                  {t.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'Karla', sans-serif" }}>{t.label}</div>
                  {t.desc && <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{t.desc}</div>}
                </div>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: isSelected ? ACCENT : 'transparent',
                  border: isSelected ? 'none' : '1.5px solid rgba(196,97,74,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 10,
                  color: 'white',
                  fontWeight: 700,
                  transition: 'all 0.18s ease',
                }}>
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => selected && onContinue(selected)}
          disabled={!selected}
          style={{
            width: '100%',
            background: selected ? ACCENT : 'rgba(196,97,74,0.3)',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontFamily: "'Karla', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            cursor: selected ? 'pointer' : 'default',
            transition: 'background 0.2s ease',
            letterSpacing: '0.02em',
          }}
        >
          Continue →
        </button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingTreatment
