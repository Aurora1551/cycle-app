import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import OnboardingLayout from '../components/OnboardingLayout'

interface Props {
  onBack: () => void
  onContinue: (treatment: string) => void
  initialValue?: string
}

const TREATMENTS = [
  { id: 'ivf', emoji: '💫' },
  { id: 'iui', emoji: '🌱' },
  { id: 'egg-freezing', emoji: '🥚' },
  { id: 'egg-donation', emoji: '🤝' },
  { id: 'icsi', emoji: '🔬' },
  { id: 'embryo-transfer', emoji: '🌟' },
  { id: 'fet', emoji: '❄️' },
  { id: 'medicated-cycle', emoji: '💊' },
  { id: 'surrogacy', emoji: '💞' },
  { id: 'preparing', emoji: '🌿' },
  { id: 'other', emoji: '✨' },
]

const A = '#C4614A', BG = '#FDF6F0', T = '#1C0F0C', M = '#9B7B74'

const OnboardingTreatment: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const { t } = useTranslation()
  const isKnownId = initialValue && TREATMENTS.some(tr => tr.id === initialValue)
  const [selected, setSelected] = useState(isKnownId ? initialValue : initialValue ? 'other' : '')
  const [otherText, setOtherText] = useState(!isKnownId && initialValue ? initialValue : '')
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const canContinue = selected && (selected !== 'other' || otherText.trim().length > 0)
  const treatmentValue = selected === 'other' ? otherText.trim() : selected

  return (
    <div className="fade-in w-full flex-center" style={{ opacity: visible ? 1 : 0 }}>
      <OnboardingLayout step={2} totalSteps={6} bg={BG} accent={A} text={T} muted={M} onBack={onBack}>
        <div className="step-label" style={{ color: A }}>{t('stepOf', { step: 2 })}</div>
        <h1 className="heading" style={{ color: T }}>{t('onboardingTreatment.heading')}</h1>

        <div className="flex-col gap-8">
          {TREATMENTS.map(tr => {
            const sel = selected === tr.id
            return (
              <div key={tr.id}>
                <button onClick={() => { setSelected(tr.id); if (tr.id !== 'other') setTimeout(() => onContinue(tr.id), 350) }} className="sel-btn" style={{
                  gap: 12, background: sel ? 'rgba(196,97,74,0.06)' : 'white',
                  border: sel ? `1.5px solid ${A}` : '1.5px solid rgba(196,97,74,0.12)',
                  boxShadow: sel ? '0 0 0 3px rgba(196,97,74,0.1)' : 'none',
                }}>
                  <div className="icon-box flex-center" style={{ width: 36, height: 36, background: sel ? 'rgba(196,97,74,0.15)' : 'rgba(232,165,152,0.12)', fontSize: 18 }}>{tr.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div className="body-font" style={{ fontSize: 14, fontWeight: 600, color: T }}>{t(`treatments.${tr.id}`)}</div>
                  </div>
                  <div className="check-circle" style={{
                    width: 18, height: 18, background: sel ? A : 'transparent',
                    border: sel ? 'none' : '1.5px solid rgba(196,97,74,0.2)',
                    transition: 'all 0.18s ease',
                  }}>{sel ? '✓' : ''}</div>
                </button>
                {tr.id === 'other' && sel && (
                  <div style={{
                    marginTop: 8, background: 'white', border: `1.5px solid ${A}`,
                    borderRadius: 12, padding: '10px 14px',
                  }}>
                    <input
                      type="text"
                      value={otherText}
                      onChange={e => setOtherText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && otherText.trim()) onContinue(otherText.trim()) }}
                      placeholder={t('onboardingTreatment.otherPlaceholder')}
                      autoFocus
                      className="body-font" style={{
                        width: '100%', background: 'transparent', border: 'none', outline: 'none',
                        fontSize: 14, color: T, caretColor: A,
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="spacer" />
        <button onClick={() => canContinue && onContinue(treatmentValue!)} disabled={!canContinue}
          className="btn-primary" style={{ background: canContinue ? A : 'rgba(196,97,74,0.3)' }}>
          {t('continue')}
        </button>
        <button onClick={() => onContinue('ivf')} className="body-font" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: M, padding: '12px 0', minHeight: 44, width: '100%', textAlign: 'center' }}>
          Skip for now
        </button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingTreatment
