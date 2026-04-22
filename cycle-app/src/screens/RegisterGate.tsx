import React from 'react'
import { useTranslation } from 'react-i18next'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell } from '../components/ui'

interface Props {
  onCreateAccount: () => void
  onContinueGuest: () => void
  onUnlock?: () => void
  cycleDays?: number
}

const RegisterGate: React.FC<Props> = ({ onCreateAccount, onContinueGuest, onUnlock, cycleDays = 18 }) => {
  const { t } = useTranslation()
  const visible = useFadeIn()

  const remainingDays = Math.max(0, cycleDays - 3)

  return (
    <ScreenShell bg="#FDF6F0" visible={visible}>
      <div className="content" style={{ gap: 12, textAlign: 'center', padding: '40px 24px 32px' }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🌟</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: '#1C0F0C', lineHeight: 1.1, margin: 0 }}>
          You've completed 3 free days
        </h1>
        <p className="body-font" style={{fontSize: 13, color: '#9B7B74', lineHeight: 1.5, margin: '4px 0 16px', padding: '0 8px' }}>
          <strong style={{ color: '#1C0F0C' }}>{remainingDays} more days</strong> waiting for you.
        </p>

        {/* Card 1: Unlock full journey */}
        <button onClick={onUnlock || onCreateAccount} style={{
          width: '100%', border: '2px solid #C4614A', borderRadius: 14, padding: '16px',
          background: '#C4614A', cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="body-font" style={{fontSize: 14, fontWeight: 700, color: 'white' }}>Unlock full journey</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>£9.99</div>
          </div>
          <div className="body-font" style={{fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
            All {cycleDays} days, journal, favourites, and more
          </div>
        </button>

        {/* Card 2: Create free account */}
        <button onClick={onCreateAccount} style={{
          width: '100%', border: '1.5px solid rgba(196,97,74,0.2)', borderRadius: 14, padding: '16px',
          background: 'white', cursor: 'pointer', textAlign: 'left',
        }}>
          <div className="body-font" style={{fontSize: 14, fontWeight: 700, color: '#1C0F0C', marginBottom: 4 }}>Save your progress — create account</div>
          <div className="body-font" style={{fontSize: 11, color: '#9B7B74', lineHeight: 1.4 }}>
            Free · keeps your journal &amp; favourites across devices. Upgrade anytime.
          </div>
        </button>

        {/* Card 3: Stay on free days */}
        <button onClick={onContinueGuest} style={{
          width: '100%', border: '1px dashed rgba(155,123,116,0.25)', borderRadius: 14, padding: '14px',
          background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}>
          <div className="body-font" style={{fontSize: 12, color: '#9B7B74', fontWeight: 500, marginBottom: 2 }}>Keep browsing my free days</div>
          <div className="body-font" style={{fontSize: 10, color: '#9B7B74', opacity: 0.7, lineHeight: 1.4 }}>
            Without an account · progress stays on this device only
          </div>
        </button>
      </div>
    </ScreenShell>
  )
}

export default RegisterGate
