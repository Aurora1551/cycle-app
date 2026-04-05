import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isDarkBg } from '../lib/theme'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, BackButton } from '../components/ui'

interface Props {
  onBack: () => void
  onDone: () => void
  vibeAccent?: string
  vibeBg?: string
}

type Step = 'compose' | 'payment' | 'sending' | 'success'

const GiftFlow: React.FC<Props> = ({ onBack, onDone, vibeAccent = '#C4614A', vibeBg = '#FDF6F0' }) => {
  const { t } = useTranslation()
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<Step>('compose')
  const visible = useFadeIn()

  const dark = isDarkBg(vibeBg)
  const textColor = dark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = dark ? 'rgba(253,246,240,0.4)' : '#9B7B74'
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'
  const cardBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(196,97,74,0.15)'

  const inputStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: 12,
    padding: '12px 14px', fontFamily: "'Karla', sans-serif", fontSize: 14, color: textColor,
    outline: 'none', caretColor: vibeAccent, boxSizing: 'border-box',
  }

  const handlePayment = () => {
    setStep('sending')
    // Mock: simulate sending email to recipient
    setTimeout(() => {
      // Store gift info so the recipient redeem flow can find it
      const gifts = JSON.parse(localStorage.getItem('cycle_gifts_sent') || '[]')
      gifts.push({
        recipientName,
        recipientEmail,
        message,
        senderEmail: localStorage.getItem('cycle_account_email') || 'anonymous',
        giftCode: `gift_${Date.now()}`,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem('cycle_gifts_sent', JSON.stringify(gifts))
      setStep('success')
    }, 1500)
  }

  if (step === 'success') return (
    <ScreenShell bg={vibeBg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 64 }}>✉️</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, textAlign: 'center', margin: 0 }}>
        Gift sent!
      </h2>
      <p className="subtext text-center" style={{ color: mutedColor, lineHeight: 1.6 }}>
        We've sent an email to <span style={{ color: textColor, fontWeight: 600 }}>{recipientEmail}</span> with
        instructions to create their free account and start their journey.
      </p>
      {recipientName && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '16px 18px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 12, color: mutedColor, marginBottom: 4 }}>SENT TO</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: textColor }}>{recipientName}</div>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, color: mutedColor, marginTop: 2 }}>{recipientEmail}</div>
        </div>
      )}
      <button onClick={onDone} className="btn-primary" style={{ background: vibeAccent, width: '100%' }}>
        Done
      </button>
    </ScreenShell>
  )

  if (step === 'sending') return (
    <ScreenShell bg={vibeBg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite' }}>✉️</div>
      <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 15, color: mutedColor, textAlign: 'center' }}>
        Sending gift to {recipientName || recipientEmail}...
      </p>
    </ScreenShell>
  )

  if (step === 'payment') return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={() => setStep('compose')} color={mutedColor} />
      <div className="content" style={{ gap: 16 }}>
        <div className="step-label" style={{ color: vibeAccent }}>{t('gift.paymentLabel')}</div>
        <h1 className="heading" style={{ color: textColor, margin: 0 }}>{t('gift.paymentHeading')}</h1>
        <p className="subtext" style={{ color: mutedColor }}>{recipientName ? `For ${recipientName} — ` : ''}{t('gift.paymentDesc')}</p>

        <button onClick={handlePayment} className="btn-primary flex-center" style={{ background: '#000', gap: 8 }}><span style={{ fontSize: 18 }}>🍎</span> {t('gift.applePay')}</button>
        <button onClick={handlePayment} className="flex-center" style={{ width: '100%', background: 'white', color: '#1a73e8', border: '2px solid #dadce0', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', gap: 8 }}><span style={{ fontSize: 18 }}>G</span> {t('gift.googlePay')}</button>

        <div className="divider">
          <div className="divider-line" style={{ background: cardBorder }} />
          <span className="mono-sm" style={{ color: mutedColor }}>{t('gift.orPayCard')}</span>
          <div className="divider-line" style={{ background: cardBorder }} />
        </div>

        <div className="flex-col gap-10">
          <div className="field" style={{ background: cardBg, border: `1.5px solid ${cardBorder}` }}>
            <div className="field-label" style={{ color: mutedColor }}>{t('gift.cardNumber')}</div>
            <input type="text" placeholder={t('gift.cardPlaceholder')} style={{ ...inputStyle, border: 'none', padding: 0, background: 'transparent' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1, background: cardBg, border: `1.5px solid ${cardBorder}` }}>
              <div className="field-label" style={{ color: mutedColor }}>{t('gift.expiry')}</div>
              <input type="text" placeholder={t('gift.expiryPlaceholder')} style={{ ...inputStyle, border: 'none', padding: 0, background: 'transparent' }} />
            </div>
            <div className="field" style={{ flex: 1, background: cardBg, border: `1.5px solid ${cardBorder}` }}>
              <div className="field-label" style={{ color: mutedColor }}>{t('gift.cvc')}</div>
              <input type="text" placeholder={t('gift.cvcPlaceholder')} style={{ ...inputStyle, border: 'none', padding: 0, background: 'transparent' }} />
            </div>
          </div>
        </div>

        <div className="spacer" />
        <button onClick={handlePayment} className="btn-primary" style={{ background: vibeAccent }}>{t('gift.payButton')}</button>
        <div className="mono-xs text-center" style={{ color: mutedColor }}>{t('gift.secureHint')}</div>
      </div>
    </ScreenShell>
  )

  return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={onBack} color={mutedColor} />
      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: vibeAccent }}>{t('gift.composeLabel')}</div>
        <h1 className="heading" style={{ color: textColor, margin: 0 }}>{t('gift.composeHeading')}</h1>
        <div className="info-banner" style={{ background: `${vibeAccent}10`, border: `1px solid ${vibeAccent}25` }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: textColor, lineHeight: 1.5 }}>{t('gift.composeBanner')}</div>
        </div>

        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>{t('gift.recipientName')}</div>
          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={t('gift.recipientPlaceholder')} style={inputStyle} />
        </div>
        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>Their email</div>
          <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="friend@example.com" style={inputStyle} />
        </div>
        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>{t('gift.personalMessage')}</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('gift.messagePlaceholder')} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div className="spacer" />
        <button onClick={() => setStep('payment')} disabled={!recipientEmail} className="btn-primary" style={{ background: recipientEmail ? vibeAccent : `${vibeAccent}44` }}>{t('gift.continuePayment')}</button>
        <div className="text-center" style={{ fontSize: 11, color: mutedColor }}>{t('gift.meaningfulSpend')}</div>
      </div>
    </ScreenShell>
  )
}

export default GiftFlow
