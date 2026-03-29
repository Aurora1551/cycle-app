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

const A = '#C4614A', BG = '#FDF6F0', T = '#1C0F0C', M = '#9B7B74'

const OnboardingTreatment: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const [selected, setSelected] = useState(initialValue || '')
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  return (
    <div className="fade-in w-full flex-center" style={{ opacity: visible ? 1 : 0 }}>
      <OnboardingLayout step={2} totalSteps={6} bg={BG} accent={A} text={T} muted={M} onBack={onBack}>
        <div className="step-label" style={{ color: A }}>Step 2 of 6</div>
        <h1 className="heading" style={{ color: T }}>What are you going through?</h1>

        <div className="flex-col gap-8">
          {TREATMENTS.map(t => {
            const sel = selected === t.id
            return (
              <button key={t.id} onClick={() => setSelected(t.id)} className="sel-btn" style={{
                gap: 12, background: sel ? 'rgba(196,97,74,0.06)' : 'white',
                border: sel ? `1.5px solid ${A}` : '1.5px solid rgba(196,97,74,0.12)',
                boxShadow: sel ? '0 0 0 3px rgba(196,97,74,0.1)' : 'none',
              }}>
                <div className="icon-box flex-center" style={{ width: 36, height: 36, background: sel ? 'rgba(196,97,74,0.15)' : 'rgba(232,165,152,0.12)', fontSize: 18 }}>{t.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T, fontFamily: "'Karla', sans-serif" }}>{t.label}</div>
                  {t.desc && <div style={{ fontSize: 11, color: M, marginTop: 1 }}>{t.desc}</div>}
                </div>
                <div className="check-circle" style={{
                  width: 18, height: 18, background: sel ? A : 'transparent',
                  border: sel ? 'none' : '1.5px solid rgba(196,97,74,0.2)',
                  transition: 'all 0.18s ease',
                }}>{sel ? '✓' : ''}</div>
              </button>
            )
          })}
        </div>

        <div className="spacer" />
        <button onClick={() => selected && onContinue(selected)} disabled={!selected}
          className="btn-primary" style={{ background: selected ? A : 'rgba(196,97,74,0.3)' }}>
          Continue →
        </button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingTreatment
