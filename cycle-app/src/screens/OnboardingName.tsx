import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface OnboardingNameProps {
  onBack: () => void
  onContinue: (name: string) => void
  initialValue?: string
}

const TOTAL_STEPS = 6
const STEP = 1

const OnboardingName: React.FC<OnboardingNameProps> = ({ onBack, onContinue, initialValue }) => {
  const { t } = useTranslation()
  const [name, setName] = useState(initialValue || '')
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(true); inputRef.current?.focus() }, 60)
    return () => clearTimeout(t)
  }, [])

  const handleContinue = () => { if (name.trim()) onContinue(name.trim()) }
  const progress = (STEP / TOTAL_STEPS) * 100

  return (
    <div className="screen fade-in" style={{ background: '#FDF6F0', opacity: visible ? 1 : 0 }}>
      <div className="progress-track" style={{ background: 'rgba(196,97,74,0.1)' }}>
        <div className="progress-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #C4614A, #D4956A)' }} />
      </div>

      <button onClick={onBack} className="btn-back" style={{ color: '#9B7B74' }}>{t('back')}</button>

      <div className="content" style={{ padding: '16px 24px 32px', gap: 10 }}>
        <div className="step-label" style={{ color: '#C4614A', marginBottom: 2 }}>{t('stepOf', { step: STEP })}</div>
        <h1 className="heading" style={{ color: '#1C0F0C', marginBottom: 4 }}>{t('onboardingName.heading')}</h1>
        <p className="subtext" style={{ marginBottom: 8 }}>{t('onboardingName.subtext')}</p>

        <div className="field" style={{ background: 'white', border: '1.5px solid rgba(196,97,74,0.2)', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}>
          <input
            ref={inputRef} type="text" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleContinue() }}
            placeholder={t('onboardingName.placeholder')}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#1C0F0C', caretColor: '#C4614A' }}
            onFocus={e => { const p = e.currentTarget.parentElement; if (p) { p.style.borderColor = '#C4614A'; p.style.boxShadow = '0 0 0 3px rgba(196,97,74,0.1)' } }}
            onBlur={e => { const p = e.currentTarget.parentElement; if (p) { p.style.borderColor = 'rgba(196,97,74,0.2)'; p.style.boxShadow = 'none' } }}
          />
        </div>

        <div className="spacer" />
        <button onClick={handleContinue} disabled={!name.trim()} className="btn-primary" style={{ background: name.trim() ? '#C4614A' : 'rgba(196,97,74,0.3)' }}>
          {t('continue')}
        </button>
        <button onClick={() => onContinue('You')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Karla', sans-serif", fontSize: 12, color: '#9B7B74', padding: '10px 0 0', width: '100%', textAlign: 'center' }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default OnboardingName
