import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { isDarkBg } from '../lib/theme'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, BackButton } from '../components/ui'
import { track } from '../lib/posthog'

interface Props {
  plan: 'one_cycle' | 'gift'
  onSuccess: (plan: 'one_cycle' | 'gift') => void
  onBack: () => void
  vibeBg?: string
  vibeAccent?: string
  email?: string
  userId?: string
}

const PLAN_DISPLAY = {
  one_cycle: { name: 'One Cycle', price: '£5.99' },
  gift: { name: 'Gift a Cycle', price: '£12.99' },
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

const CheckoutForm: React.FC<{
  plan: 'one_cycle' | 'gift'
  onSuccess: (plan: 'one_cycle' | 'gift') => void
  vibeAccent: string
  textColor: string
  mutedColor: string
  email: string
  userId: string
}> = ({ plan, onSuccess, vibeAccent, textColor, mutedColor, email, userId }) => {
  const { t } = useTranslation()
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setLoading(false)
      return
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?plan=${plan}&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`,
      },
    })

    if (result.error) {
      setError(result.error.message || 'Payment failed. Please try again.')
      setLoading(false)
      track('payment_failed', { plan, error: result.error.message })
    }
    // If no error, Stripe redirects to return_url
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentElement />

      {error && (
        <div style={{ fontSize: 13, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '10px 12px' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="btn-primary"
        style={{
          background: stripe && !loading ? vibeAccent : `${vibeAccent}66`,
          position: 'relative',
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="spinner" style={{
              width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white', borderRadius: '50%',
              animation: 'spin 0.6s linear infinite', display: 'inline-block',
            }} />
            {t('payment.processing')}
          </span>
        ) : (
          t('payment.payNow')
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span style={{ fontSize: 13 }}>🔒</span>
        <span className="mono-xs" style={{ color: mutedColor }}>{t('payment.secureByStripe')}</span>
      </div>
      <div className="mono-xs text-center" style={{ color: mutedColor }}>
        {t('payment.noSubscription')}
      </div>
    </form>
  )
}

const PaymentScreen: React.FC<Props> = ({
  plan, onSuccess, onBack,
  vibeBg = '#1C0F0C', vibeAccent = '#C4614A',
  email = '', userId = '',
}) => {
  const { t } = useTranslation()
  const [clientSecret, setClientSecret] = useState('')
  const [loadError, setLoadError] = useState('')
  const visible = useFadeIn()

  const dark = isDarkBg(vibeBg)
  const textColor = dark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = dark ? 'rgba(253,246,240,0.45)' : '#9B7B74'

  const display = PLAN_DISPLAY[plan]

  useEffect(() => {
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId, email }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
        } else {
          setLoadError(data.error || 'Failed to initialize payment')
        }
      })
      .catch(() => setLoadError('Unable to connect. Please try again.'))
  }, [plan, userId, email])

  const stripeAppearance = {
    theme: (dark ? 'night' : 'stripe') as 'night' | 'stripe',
    variables: {
      colorPrimary: vibeAccent,
      fontFamily: "'Karla', sans-serif",
      borderRadius: '12px',
    },
  }

  return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={onBack} color={mutedColor} />
      <div className="content" style={{ gap: 16 }}>
        <div className="step-label" style={{ color: vibeAccent }}>{t('payment.label')}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700,
            color: textColor, lineHeight: 1.1, margin: 0,
          }}>
            {display.name}
          </h1>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700,
            color: vibeAccent,
          }}>
            {display.price}
          </span>
        </div>

        {loadError ? (
          <div style={{ fontSize: 13, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '12px' }}>
            {loadError}
          </div>
        ) : !clientSecret ? (
          <div style={{ textAlign: 'center', padding: 40, color: mutedColor }}>
            <div className="spinner" style={{
              width: 24, height: 24, border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: vibeAccent, borderRadius: '50%',
              animation: 'spin 0.6s linear infinite', margin: '0 auto 12px',
            }} />
            {t('payment.loading')}
          </div>
        ) : (
          <Elements stripe={getStripe()} options={{ clientSecret, appearance: stripeAppearance }}>
            <CheckoutForm
              plan={plan}
              onSuccess={onSuccess}
              vibeAccent={vibeAccent}
              textColor={textColor}
              mutedColor={mutedColor}
              email={email}
              userId={userId}
            />
          </Elements>
        )}
      </div>
    </ScreenShell>
  )
}

export default PaymentScreen
