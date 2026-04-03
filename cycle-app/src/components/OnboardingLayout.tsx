import React from 'react'
import { useTranslation } from 'react-i18next'

interface OnboardingLayoutProps {
  step: number
  totalSteps: number
  bg: string
  accent: string
  text: string
  muted: string
  onBack: () => void
  children: React.ReactNode
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  step, totalSteps, bg, accent, text: _text, muted, onBack, children,
}) => {
  const { t } = useTranslation()
  const progress = (step / totalSteps) * 100

  return (
    <div className="screen" style={{ background: bg, transition: 'background 0.5s ease' }}>
      <div className="progress-track" style={{ background: `${accent}22` }}>
        <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, ${accent}bb)` }} />
      </div>
      <button onClick={onBack} className="btn-back" style={{ color: muted }}>{t('back')}</button>
      <div className="content-sm">{children}</div>
    </div>
  )
}

export default OnboardingLayout
