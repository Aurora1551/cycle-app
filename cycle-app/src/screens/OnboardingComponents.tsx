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

const A = '#C4614A', BG = '#FDF6F0', T = '#1C0F0C', M = '#9B7B74'

const OnboardingComponents: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const [selected, setSelected] = useState<string[]>(initialValue || ALL_COMPONENTS.map(c => c.id))
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="fade-in w-full flex-center" style={{ opacity: visible ? 1 : 0 }}>
      <OnboardingLayout step={4} totalSteps={6} bg={BG} accent={A} text={T} muted={M} onBack={onBack}>
        <div className="step-label" style={{ color: A }}>Step 4 of 6</div>
        <h1 className="heading" style={{ color: T }}>What do you want each day?</h1>
        <p className="subtext">Everything is selected — remove anything you don't want.</p>

        <div className="grid-2">
          {ALL_COMPONENTS.map(c => {
            const sel = selected.includes(c.id)
            return (
              <button key={c.id} onClick={() => toggle(c.id)} className="sel-btn" style={{
                gap: 8, background: sel ? 'rgba(196,97,74,0.07)' : 'white',
                border: sel ? `1.5px solid ${A}` : '1.5px solid rgba(196,97,74,0.12)',
              }}>
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: sel ? T : M, fontFamily: "'Karla', sans-serif", lineHeight: 1.2, transition: 'color 0.18s ease' }}>{c.label}</span>
                {sel && (
                  <div className="check-circle" style={{ position: 'absolute', top: 6, right: 8, width: 14, height: 14, background: A }}>✓</div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mono-sm text-center" style={{ color: M }}>{selected.length} of {ALL_COMPONENTS.length} selected</div>
        <div className="spacer" />
        <button onClick={() => selected.length > 0 && onContinue(selected)} disabled={selected.length === 0}
          className="btn-primary" style={{ background: selected.length > 0 ? A : 'rgba(196,97,74,0.3)' }}>
          Continue →
        </button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingComponents
