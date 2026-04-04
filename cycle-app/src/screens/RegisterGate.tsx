import React from 'react'
import { useTranslation } from 'react-i18next'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell } from '../components/ui'

interface Props {
  onCreateAccount: () => void
  onContinueGuest: () => void
}

const RegisterGate: React.FC<Props> = ({ onCreateAccount, onContinueGuest }) => {
  const { t } = useTranslation()
  const visible = useFadeIn()

  const bg = '#0E0E0E'
  const accent = '#C4614A'
  const textColor = '#FDF6F0'
  const mutedColor = 'rgba(253,246,240,0.45)'

  const handleContinueGuest = () => {
    localStorage.setItem('cycle_register_dismissed', '1')
    onContinueGuest()
  }

  return (
    <ScreenShell bg={bg} visible={visible}>
      <div className="content" style={{ gap: 16, textAlign: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, lineHeight: 1.1, margin: 0 }}>
          {t('registerGate.heading')}
        </h1>
        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 14, color: mutedColor, lineHeight: 1.6, margin: '0 0 12px' }}>
          {t('registerGate.subtext')}
        </p>

        <button onClick={onCreateAccount} className="btn-primary" style={{ background: accent }}>
          {t('registerGate.createAccount')}
        </button>

        <button onClick={handleContinueGuest} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Karla', sans-serif", fontSize: 13, color: mutedColor,
          textDecoration: 'underline', padding: '8px 0',
        }}>
          {t('registerGate.continueAsGuest')}
        </button>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(253,246,240,0.3)', letterSpacing: '0.05em', lineHeight: 1.6 }}>
          {t('registerGate.guestWarning')}
        </p>
      </div>
    </ScreenShell>
  )
}

export default RegisterGate
