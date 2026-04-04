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
            <button onClick={() => setDays(d => Math.min(30, d + 1))} className="flex-center" style={counterBtn}>+</button>
          </div>
          <p className="subtext">{t('onboardingCycleLength.daysInCycle')}</p>
        </div>

        {/* Journey preview — simple dot timeline */}
        <div style={{ background: 'white', border: '1px solid rgba(196,97,74,0.12)', borderRadius: 12, padding: '14px 16px', marginTop: 4 }}>
          <div className="mono-hint" style={{ color: M, marginBottom: 10 }}>YOUR JOURNEY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Start marker */}
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: A, flexShrink: 0,
              boxShadow: `0 0 6px ${A}88`,
            }} />
            {/* Connecting line with gradient */}
            <div style={{
              flex: 1, height: 2, borderRadius: 1,
              background: `linear-gradient(to right, ${A}, ${A}40)`,
            }} />
            {/* End marker */}
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: `${A}30`, flexShrink: 0,
              border: `1.5px solid ${A}50`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: A, letterSpacing: '0.1em' }}>DAY 1</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: M, letterSpacing: '0.1em' }}>DAY {days}</span>
          </div>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 11, color: M, marginTop: 8, textAlign: 'center' }}>
            {days} days of daily content made just for you
          </div>
        </div>

        <div className="spacer" />
        <button onClick={() => onContinue(days)} className="btn-primary" style={{ background: A }}>{t('continue')}</button>
      </OnboardingLayout>
    </div>
  )
}

export default OnboardingCycleLength
