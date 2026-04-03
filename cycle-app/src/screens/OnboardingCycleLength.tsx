import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import OnboardingLayout from '../components/OnboardingLayout'

interface Props {
  onBack: () => void
  onContinue: (days: number) => void
  initialValue?: number
}

const A = '#C4614A', BG = '#FDF6F0', T = '#1C0F0C', M = '#9B7B74'

const OnboardingCycleLength: React.FC<Props> = ({ onBack, onContinue, initialValue }) => {
  const { t } = useTranslation()
  const [days, setDays] = useState(initialValue || 14)
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const totalDots = Math.min(days, 28)
  const filledDots = Math.ceil(totalDots * 0.3)

  const counterBtn: React.CSSProperties = {
    width: 48, height: 56, background: 'none', border: 'none',
    color: A, fontSize: 22, cursor: 'pointer', fontWeight: 300,
  }

  return (
    <div className="fade-in w-full flex-center" style={{ opacity: visible ? 1 : 0 }}>
      <OnboardingLayout step={3} totalSteps={6} bg={BG} accent={A} text={T} muted={M} onBack={onBack}>
        <div className="step-label" style={{ color: A }}>{t('stepOf', { step: 3 })}</div>
        <h1 className="heading" style={{ color: T }}>{t('onboardingCycleLength.heading')}</h1>
        <p className="subtext">{t('onboardingCycleLength.subtext')}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1.5px solid rgba(196,97,74,0.15)', borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setDays(d => Math.max(1, d - 1))} className="flex-center" style={counterBtn}>−</button>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: T, width: 60, textAlign: 'center', borderLeft: '1px solid rgba(196,97,74,0.12)', borderRight: '1px solid rgba(196,97,74,0.12)', lineHeight: '56px' }}>{days}</div>
            <button onClick={() => setDays(d => Math.min(60, d + 1))} className="flex-center" style={counterBtn}>+</button>
          </div>
          <p className="subtext">{t('onboardingCycleLength.daysInCycle')}</p>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(196,97,74,0.12)', borderRadius: 12, padding: '14px 16px', marginTop: 4 }}>
          <div className="mono-hint" style={{ color: M, marginBottom: 10 }}>{t('onboardingCycleLength.preview')}</div>
          <div className="flex-wrap" style={{ gap: 5 }}>
            {Array.from({ length: totalDots }).map((_, i) => (
              <div key={i} className="dot" style={{
                width: 10, height: 10,
                background: i < filledDots ? A : 'rgba(196,97,74,0.12)',
                boxShadow: i === filledDots - 1 ? `0 0 6px ${A}88` : 'none',
              }} />
            ))}
            {days > 28 && <div className="mono-sm" style={{ color: M, alignSelf: 'center', marginLeft: 2 }}>+{days - 28} more</div>}
          </div>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 11, color: M, marginTop: 8 }}>{filledDots} of {days} days shown · {t('onboardingCycleLength.firstFree')}</div>
        </div>

        <div className="spacer" />
        <button onClick={() => onContinue(days)} className="btn-primary" style={{ background: A }}>{t('continue')}</button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingCycleLength
