import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import OnboardingLayout from '../components/OnboardingLayout'

interface Props {
  onBack: () => void
  onContinue: (components: string[]) => void
  initialValue?: string[]
}

const ALL_COMPONENTS = [
  { id: 'quote', emoji: '💬' },
  { id: 'anthem', emoji: '🎵' },
  { id: 'meditation', emoji: '🧘' },
  { id: 'journal', emoji: '✍️' },
  { id: 'affirmation', emoji: '🌟' },
  { id: 'gratitude', emoji: '🙏' },
  { id: 'breathing', emoji: '🌬️' },
  { id: 'fuel', emoji: '🍳' },
]

const A = '#C4614A', BG = '#FDF6F0', T = '#1C0F0C', M = '#9B7B74'

const OnboardingComponents: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>(initialValue || ALL_COMPONENTS.map(c => c.id))
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  // Allow Enter key to advance
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Enter' && selected.length > 0) onContinue(selected) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, onContinue])

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="fade-in w-full flex-center" style={{ opacity: visible ? 1 : 0 }}>
      <OnboardingLayout step={4} totalSteps={6} bg={BG} accent={A} text={T} muted={M} onBack={onBack}>
        <div className="step-label" style={{ color: A }}>{t('stepOf', { step: 4 })}</div>
        <h1 className="heading" style={{ color: T }}>{t('onboardingComponents.heading')}</h1>
        <p className="subtext">{t('onboardingComponents.subtext')}</p>

        <div className="grid-2">
          {ALL_COMPONENTS.map(c => {
            const sel = selected.includes(c.id)
            return (
              <button key={c.id} onClick={() => toggle(c.id)} className="sel-btn" style={{
                gap: 8, background: sel ? 'rgba(196,97,74,0.07)' : 'white',
                border: sel ? `1.5px solid ${A}` : '1.5px solid rgba(196,97,74,0.12)',
              }}>
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
                <span className="body-font" style={{ fontSize: 12, fontWeight: 600, color: sel ? T : M, lineHeight: 1.2, transition: 'color 0.18s ease' }}>{t(`components.${c.id}`)}</span>
                {sel && (
                  <div className="check-circle" style={{ position: 'absolute', top: 6, right: 8, width: 14, height: 14, background: A }}>✓</div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mono-sm text-center" style={{ color: M }}>{selected.length} of {ALL_COMPONENTS.length} {t('selected')}</div>
        <div className="spacer" />
        <button onClick={() => selected.length > 0 && onContinue(selected)} disabled={selected.length === 0}
          className="btn-primary" style={{ background: selected.length > 0 ? A : 'rgba(196,97,74,0.3)' }}>
          {t('continue')}
        </button>
        <button onClick={() => onContinue(['quote', 'anthem', 'affirmation', 'journal', 'breathing'])} className="body-font btn-bare" style={{ fontSize: 12, color: M, padding: '12px 0', minHeight: 44, width: '100%', textAlign: 'center' }}>
          Skip for now
        </button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingComponents
