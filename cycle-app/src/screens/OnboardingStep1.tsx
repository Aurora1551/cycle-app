import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BackButton } from '../components/ui'

interface Props {
  onBack: () => void
  onContinue: (name: string, treatment: string, cycleDays: number) => void
  initialName?: string
  initialTreatment?: string
  initialCycleDays?: number
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

const TREATMENT_DEFAULTS: Record<string, number> = {
  ivf: 18, iui: 28, 'egg-freezing': 14, 'egg-donation': 14, icsi: 18,
  'embryo-transfer': 18, fet: 18, 'medicated-cycle': 21, surrogacy: 28, preparing: 14,
}

const A = '#C4614A', BG = '#FDF6F0', T = '#1C0F0C', M = '#9B7B74'

const OnboardingStep1: React.FC<Props> = ({ onBack, onContinue, initialName, initialTreatment, initialCycleDays }) => {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName || '')
  const [treatment, setTreatment] = useState(initialTreatment || '')
  const [otherText, setOtherText] = useState('')
  const [days, setDays] = useState(initialCycleDays || 14)
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(true); inputRef.current?.focus() }, 60)
    return () => clearTimeout(t)
  }, [])

  // Auto-fill days when treatment changes
  useEffect(() => {
    if (treatment && treatment !== 'other' && TREATMENT_DEFAULTS[treatment] && !initialCycleDays) {
      setDays(TREATMENT_DEFAULTS[treatment])
    }
  }, [treatment])

  const treatmentValue = treatment === 'other' ? otherText.trim() : treatment
  const canContinue = name.trim() && treatmentValue && days > 0

  const handleContinue = () => {
    if (canContinue) onContinue(name.trim(), treatmentValue, days)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Enter' && canContinue) handleContinue() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canContinue, name, treatmentValue, days])

  return (
    <div className="screen fade-in" style={{ background: BG, opacity: visible ? 1 : 0 }}>
      <div className="progress-track" style={{ background: 'rgba(196,97,74,0.1)' }}>
        <div className="progress-fill" style={{ width: '33%', background: 'linear-gradient(90deg, #C4614A, #D4956A)' }} />
      </div>

      <BackButton onClick={onBack} color={M} />

      <div style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10, overflowY: 'auto' }}>
        <div className="step-label" style={{ color: A }}>{t('stepOf', { step: 1 }).replace('6', '3')}</div>
        <h1 className="heading" style={{ color: T, marginBottom: 4 }}>Tell us about you</h1>
        <p className="subtext" style={{ marginBottom: 8 }}>So we can personalise your journey</p>

        {/* Name */}
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: M, letterSpacing: '0.1em', marginBottom: 4 }}>YOUR NAME</div>
          <div className="field" style={{ background: 'white', border: '1.5px solid rgba(196,97,74,0.2)' }}>
            <input
              ref={inputRef} type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your first name"
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: T, caretColor: A }}
            />
          </div>
        </div>

        {/* Treatment */}
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: M, letterSpacing: '0.1em', marginBottom: 6 }}>YOUR TREATMENT</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TREATMENTS.map(tr => {
              const sel = treatment === tr.id
              return (
                <button key={tr.id} onClick={() => setTreatment(tr.id)} style={{
                  padding: '7px 12px', borderRadius: 20, cursor: 'pointer',
                  border: sel ? `1.5px solid ${A}` : '1.5px solid rgba(196,97,74,0.15)',
                  background: sel ? 'rgba(196,97,74,0.06)' : 'white',
                  fontFamily: "'Karla', sans-serif", fontSize: 12, fontWeight: sel ? 600 : 400,
                  color: sel ? T : M, display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 14 }}>{tr.emoji}</span>
                  {t(`treatments.${tr.id}`)}
                </button>
              )
            })}
          </div>
          {treatment === 'other' && (
            <div style={{ marginTop: 8, background: 'white', border: `1.5px solid ${A}`, borderRadius: 12, padding: '10px 14px' }}>
              <input
                type="text" value={otherText} onChange={e => setOtherText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canContinue) handleContinue() }}
                placeholder="Tell us your treatment" autoFocus
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 14, color: T, caretColor: A }}
              />
            </div>
          )}
        </div>

        {/* Cycle Days */}
        {treatment && (
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: M, letterSpacing: '0.1em', marginBottom: 6 }}>HOW MANY DAYS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1.5px solid rgba(196,97,74,0.15)', borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setDays(d => Math.max(1, d - 1))} style={{ width: 40, height: 44, background: 'none', border: 'none', color: A, fontSize: 18, cursor: 'pointer' }}>−</button>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: T, width: 48, textAlign: 'center', borderLeft: '1px solid rgba(196,97,74,0.1)', borderRight: '1px solid rgba(196,97,74,0.1)', lineHeight: '44px' }}>{days}</div>
                <button onClick={() => setDays(d => Math.min(60, d + 1))} style={{ width: 40, height: 44, background: 'none', border: 'none', color: A, fontSize: 18, cursor: 'pointer' }}>+</button>
              </div>
              <span style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, color: M }}>days</span>
            </div>
          </div>
        )}

        <div className="spacer" />
        <button onClick={handleContinue} disabled={!canContinue} className="btn-primary" style={{ background: canContinue ? A : 'rgba(196,97,74,0.3)' }}>
          Continue
        </button>
        <button onClick={() => onContinue('You', 'ivf', 18)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Karla', sans-serif", fontSize: 12, color: M, padding: '10px 0 0', width: '100%', textAlign: 'center' }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default OnboardingStep1
