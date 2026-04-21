import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { loadStripe } from '@stripe/stripe-js'
import { isDarkBg } from '../lib/theme'
import { track } from '../lib/posthog'

interface Props {
  onComplete: (plan: 'one_cycle' | 'gift') => void
  vibeBg?: string
  vibeAccent?: string
}

let stripePromise: ReturnType<typeof loadStripe> | null = null

function getStripe() {
  if (!stripePromise) {
    stripePromise = fetch('/api/stripe/config')
      .then(r => r.json())
      .then(({ publishableKey }) => publishableKey ? loadStripe(publishableKey) : null)
  }
  return stripePromise
}

const PaymentSuccess: React.FC<Props> = ({ onComplete, vibeBg = '#1C0F0C', vibeAccent = '#C4614A' }) => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const dark = isDarkBg(vibeBg)
  const textColor = dark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = dark ? 'rgba(253,246,240,0.45)' : '#9B7B74'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clientSecret = params.get('payment_intent_client_secret')
    const plan = (params.get('plan') || 'one_cycle') as 'one_cycle' | 'gift'
    const email = params.get('email') || ''
    const userId = params.get('userId') || ''

    // Clean URL
    window.history.replaceState({}, '', '/')

    if (!clientSecret) {
      setStatus('error')
      setErrorMsg('Missing payment information.')
      return
    }

    getStripe().then(async stripe => {
      if (!stripe) {
        setStatus('error')
        setErrorMsg('Stripe failed to load.')
        return
      }

      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret)

      if (paymentIntent?.status === 'succeeded') {
        // Confirm purchase on our backend
        try {
          await fetch('/api/purchase/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stripePaymentId: paymentIntent.id,
              plan,
              userId,
              email,
            }),
          })
        } catch {
          // Webhook will handle as backup
        }

        localStorage.setItem('cycle_premium', '1')
        localStorage.setItem('cycle_plan', plan)
        track('payment_succeeded', { plan, amount: paymentIntent.amount })
        setStatus('success')

        // Auto-redirect after a moment
        setTimeout(() => onComplete(plan), 1500)
      } else {
        setStatus('error')
        setErrorMsg(t('payment.statusFailed'))
        track('payment_status_failed', { status: paymentIntent?.status })
      }
    })
  }, [onComplete, t])

  return (
    <div className="screen" style={{
      background: vibeBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 28, textAlign: 'center',
    }}>
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{
            width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: vibeAccent, borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
          <p className="body-font" style={{ color: mutedColor, fontSize: 14 }}>
            {t('payment.confirming')}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 56 }}>✓</div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700,
            color: textColor, margin: 0,
          }}>
            {t('payment.successHeading')}
          </h2>
          <p className="body-font" style={{ color: mutedColor, fontSize: 14 }}>
            {t('payment.successMessage')}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 48 }}>⚠</div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700,
            color: textColor, margin: 0,
          }}>
            {t('payment.errorHeading')}
          </h2>
          <p className="body-font" style={{ color: '#E8907A', fontSize: 14 }}>
            {errorMsg}
          </p>
          <button
            onClick={() => onComplete('one_cycle')}
            className="btn-primary"
            style={{ background: vibeAccent, marginTop: 8 }}
          >
            {t('payment.returnToApp')}
          </button>
        </div>
      )}
    </div>
  )
}

export default PaymentSuccess
