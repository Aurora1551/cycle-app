import React, { useState, useEffect } from 'react'
import OnboardingLayout from '../components/OnboardingLayout'

interface Props {
  onBack: () => void
  onContinue: (components: string[]) => void
  initialValue?: string[]
}

const ALL_COMPONENTS = [
  { id: 'quote', emoji: '💬', label: 'Quote' },
  { id: 'anthem', emoji: '🎵', label: 'Anthem' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation' },
  { id: 'journal', emoji: '✍️', label: 'Journal prompt' },
  { id: 'affirmation', emoji: '🌟', label: 'Affirmation' },
  { id: 'gratitude', emoji: '🙏', label: 'Gratitude prompt' },
  { id: 'breathing', emoji: '🌬️', label: 'Breathing exercise' },
]

const ACCENT = '#C4614A'
const BG = '#FDF6F0'
const TEXT = '#1C0F0C'
const MUTED = '#9B7B74'

const OnboardingComponents: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const [selected, setSelected] = useState<string[]>(
    initialValue || ALL_COMPONENTS.map(c => c.id)
  )
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', width: '100%' }}>
      <OnboardingLayout
        step={4} totalSteps={6}
        bg={BG} accent={ACCENT} text={TEXT} muted={MUTED}
        onBack={onBack}
      >
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT }}>
          Step 4 of 6
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
          What do you want each day?
        </h1>

        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: MUTED, lineHeight: 1.5 }}>
          Everything is selected — remove anything you don't want.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ALL_COMPONENTS.map(c => {
            const isSelected = selected.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isSelected ? 'rgba(196,97,74,0.07)' : 'white',
                  border: isSelected ? `1.5px solid ${ACCENT}` : '1.5px solid rgba(196,97,74,0.12)',
                  borderRadius: 12,
                  padding: '12px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isSelected ? TEXT : MUTED,
                  fontFamily: "'Karla', sans-serif",
                  lineHeight: 1.2,
                  transition: 'color 0.18s ease',
                }}>
                  {c.label}
                </span>
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: ACCENT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    color: 'white',
                    fontWeight: 700,
                  }}>
                    ✓
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.1em', textAlign: 'center' }}>
          {selected.length} of {ALL_COMPONENTS.length} selected
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => selected.length > 0 && onContinue(selected)}
          disabled={selected.length === 0}
          style={{
            width: '100%',
            background: selected.length > 0 ? ACCENT : 'rgba(196,97,74,0.3)',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontFamily: "'Karla', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            cursor: selected.length > 0 ? 'pointer' : 'default',
            letterSpacing: '0.02em',
          }}
        >
          Continue →
        </button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingComponents
