import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { isDarkBg } from '../lib/theme'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, BackButton } from '../components/ui'
import { track } from '../lib/posthog'

interface Props {
  onBack: () => void
  onDone: () => void
  vibeAccent?: string
  vibeBg?: string
}

type Step = 'compose' | 'payment' | 'success'

let stripePromise: ReturnType<typeof loadStripe> | null = null
function getStripe() {
  if (!stripePromise) {
    stripePromise = fetch('/api/stripe/config').then(r => r.json()).then(({ publishableKey }) => publishableKey ? loadStripe(publishableKey) : null)
  }
  return stripePromise
}

const GiftCheckoutForm: React.FC<{
  vibeAccent: string
  mutedColor: string
  paymentIntentId: string
  onSuccess: (recipientEmail: string) => void
}> = ({ vibeAccent, mutedColor, paymentIntentId, onSuccess }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true); setError('')

    const submit = await elements.submit()
    if (submit.error) { setError(submit.error.message || 'Payment failed'); setLoading(false); return }

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    if (result.error) {
      setError(result.error.message || 'Payment failed. Please try again.')
      track('gift_payment_failed', { error: result.error.message || 'unknown' })
      setLoading(false)
      return
    }
    // Succeeded inline — call server to record gift + send emails
    try {
      const res = await fetch('/api/gift/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Payment went through but the gift could not be finalised. Contact support.')
        setLoading(false)
        return
      }
      track('gift_payment_succeeded')
      onSuccess(data.recipientEmail || '')
    } catch {
      setError('Payment went through but we could not finalise the gift. Contact support.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>{error}</div>}
      <div className="spacer" />
      <button type="submit" disabled={!stripe || loading} className="btn-primary" style={{ background: vibeAccent, marginTop: 16 }}>
        {loading ? 'Processing…' : 'Pay £9.99'}
      </button>
      <div className="mono-xs text-center" style={{ color: mutedColor, marginTop: 6 }}>Secured by Stripe</div>
    </form>
  )
}

const GiftFlow: React.FC<Props> = ({ onBack, onDone, vibeAccent = '#C4614A', vibeBg = '#FDF6F0' }) => {
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [buyerEmail, setBuyerEmail] = useState(() => localStorage.getItem('cycle_account_email') || '')
  const [buyerName, setBuyerName] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('cycle_onboarding_data') || '{}').name as string) || '' } catch { return '' }
  })
  const [step, setStep] = useState<Step>('compose')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [stripe, setStripe] = useState<Awaited<ReturnType<typeof loadStripe>>>(null)
  const [intentError, setIntentError] = useState('')
  const [creatingIntent, setCreatingIntent] = useState(false)
  const visible = useFadeIn()

  useEffect(() => { getStripe().then(setStripe) }, [])

  const dark = isDarkBg(vibeBg)
  const textColor = dark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = dark ? 'rgba(253,246,240,0.4)' : '#9B7B74'
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'
  const cardBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(196,97,74,0.15)'

  const inputStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: 12,
    padding: '12px 14px', fontSize: 14, color: textColor,
    outline: 'none', caretColor: vibeAccent, boxSizing: 'border-box',
  }

  const handleProceedToPayment = async () => {
    if (!buyerEmail || !recipientEmail) return
    setCreatingIntent(true); setIntentError('')
    try {
      const res = await fetch('/api/gift/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerEmail: buyerEmail.trim().toLowerCase(),
          buyerName: buyerName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
          recipientName: recipientName.trim(),
          message: message.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) {
        setIntentError(data.error || 'Could not set up payment. Please try again.')
        setCreatingIntent(false)
        return
      }
      setClientSecret(data.clientSecret)
      setPaymentIntentId(data.paymentIntentId)
      setStep('payment')
    } catch {
      setIntentError('Network error. Please try again.')
    } finally {
      setCreatingIntent(false)
    }
  }

  // --- Success screen ---
  if (step === 'success') return (
    <ScreenShell bg={vibeBg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 64 }}>💛</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, textAlign: 'center', margin: 0 }}>Gift sent!</h2>
      <p className="subtext text-center" style={{ color: mutedColor, lineHeight: 1.6 }}>
        We've emailed <span style={{ color: textColor, fontWeight: 600 }}>{recipientEmail}</span> a link to redeem their cycle. We've also sent a receipt to <span style={{ color: textColor, fontWeight: 600 }}>{buyerEmail}</span>.
      </p>
      {recipientName && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '14px 18px', width: '100%', textAlign: 'center' }}>
          <div className="body-font" style={{ fontSize: 11, color: mutedColor, marginBottom: 4 }}>SENT TO</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: textColor }}>{recipientName}</div>
          <div className="body-font" style={{ fontSize: 13, color: mutedColor, marginTop: 2 }}>{recipientEmail}</div>
        </div>
      )}
      <button onClick={onDone} className="btn-primary" style={{ background: vibeAccent, width: '100%' }}>Done</button>
    </ScreenShell>
  )

  // --- Payment step ---
  if (step === 'payment' && clientSecret && paymentIntentId) return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={() => setStep('compose')} color={mutedColor} />
      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: vibeAccent }}>PAYMENT</div>
        <h1 className="heading" style={{ color: textColor, margin: 0 }}>Complete your gift</h1>
        <p className="subtext" style={{ color: mutedColor }}>{recipientName ? `For ${recipientName} — ` : ''}£9.99 · 18 days of Cycle</p>
        {stripe ? (
          <Elements stripe={stripe} options={{ clientSecret, appearance: { theme: dark ? 'night' : 'stripe', variables: { colorPrimary: vibeAccent, borderRadius: '10px', fontFamily: "'Karla', sans-serif" } } }}>
            <GiftCheckoutForm
              vibeAccent={vibeAccent}
              mutedColor={mutedColor}
              paymentIntentId={paymentIntentId}
              onSuccess={() => setStep('success')}
            />
          </Elements>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: mutedColor, fontSize: 13 }}>Loading payment…</div>
        )}
      </div>
    </ScreenShell>
  )

  // --- Compose step (default) ---
  return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={onBack} color={mutedColor} />
      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: vibeAccent }}>A GIFT OF CARE</div>
        <h1 className="heading" style={{ color: textColor, margin: 0 }}>Gift a Cycle</h1>
        <div className="info-banner" style={{ background: `${vibeAccent}10`, border: `1px solid ${vibeAccent}25` }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: textColor, lineHeight: 1.5 }}>Know someone going through fertility treatment? 18 days of daily content, journaling, and breathing — paid for by you, enjoyed by them.</div>
        </div>

        {/* About the recipient */}
        <div className="mono-hint" style={{ color: mutedColor, marginTop: 4 }}>FOR THEM</div>
        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>Their first name</div>
          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Aurora" className="body-font" style={inputStyle} />
        </div>
        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>Their email</div>
          <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="friend@example.com" className="body-font" style={inputStyle} />
        </div>
        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>Your message (optional)</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="I'm thinking of you." rows={3} className="body-font" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* About the buyer */}
        <div className="mono-hint" style={{ color: mutedColor, marginTop: 10 }}>FROM YOU</div>
        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>Your first name</div>
          <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="So we can tell them who it's from" className="body-font" style={inputStyle} />
        </div>
        <div className="flex-col" style={{ gap: 4 }}>
          <div className="field-label" style={{ color: mutedColor }}>Your email (for receipt)</div>
          <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="you@example.com" className="body-font" style={inputStyle} />
        </div>

        {intentError && <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '10px 12px' }}>{intentError}</div>}

        <div className="spacer" />
        <button onClick={handleProceedToPayment} disabled={!recipientEmail || !buyerEmail || creatingIntent} className="btn-primary" style={{ background: (recipientEmail && buyerEmail) ? vibeAccent : `${vibeAccent}44` }}>
          {creatingIntent ? 'Preparing payment…' : 'Continue to payment'}
        </button>
        <div className="text-center" style={{ fontSize: 11, color: mutedColor }}>£9.99 · one-time · Stripe-secured</div>
      </div>
    </ScreenShell>
  )
}

export default GiftFlow
