import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { resolveVibe } from '../lib/theme'
import { NOTIFICATION_CONTENT } from '../lib/constants'
import { subscribeToPush, registerServiceWorker } from '../lib/push'
import { getAppUserId } from '../lib/userId'

interface Props {
  data: OnboardingData
  onBack: () => void
  onDone: () => void
}

const NotificationSettings: React.FC<Props> = ({ data, onBack, onDone }) => {
  const { t } = useTranslation()
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM')
  const [notifyContent, setNotifyContent] = useState('surprise')
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const vibeTheme = resolveVibe(data.vibe)
  const { bg, accent, text, muted } = vibeTheme

  const to24h = () => {
    if (period === 'AM') return hour === 12 ? 0 : hour
    return hour === 12 ? 12 : hour + 12
  }

  const handleAllow = async () => {
    const h24 = to24h()
    const timeStr = `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    localStorage.setItem('notify_enabled', '1')
    localStorage.setItem('notify_time', timeStr)
    localStorage.setItem('notify_content', notifyContent)

    const uid = getAppUserId()
    await registerServiceWorker()
    await subscribeToPush(uid)

    fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, subscription: null, notifyTime: timeStr }),
    }).catch(() => {})

    localStorage.setItem('notify_seen', '1')
    onDone()
  }

  const handleSkip = () => {
    localStorage.setItem('notify_seen', '1')
    onDone()
  }

  // Compact time-spinner ticker (matches the onboarding chip aesthetic)
  const tickBtn = (onClick: () => void, label: string): React.CSSProperties => ({
    width: 28, height: 24, padding: 0, cursor: 'pointer', color: muted, fontSize: 12, lineHeight: 1,
  })

  return (
    <div className="screen fade-in" style={{ opacity: visible ? 1 : 0, background: bg }}>
      <div className="progress-track" style={{ background: `${accent}22` }}>
        <div className="progress-fill" style={{ width: '100%', background: `linear-gradient(90deg, ${accent}, ${accent}bb)` }} />
      </div>
      <button onClick={onBack} className="btn-back" style={{ color: muted }}>{t('back')}</button>

      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: accent }}>{t('notifications.sectionLabel')}</div>
        <h1 className="heading" style={{ color: text }}>{t('notifications.heading')}</h1>
        <p className="subtext" style={{ color: muted, marginTop: -4 }}>{t('notifications.subtext')}</p>

        {/* Time picker — compact, chip-style to match onboarding */}
        <div>
          <div className="mono-hint" style={{ color: muted, marginBottom: 10 }}>{t('notifications.morningTime')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: `${accent}08`, border: `1.5px solid ${accent}30`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${accent}18` }}>
                <button onClick={() => setHour(hour >= 12 ? 1 : hour + 1)} className="btn-bare flex-center" style={tickBtn(() => {}, '▲')}>▲</button>
                <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: text, padding: '2px 10px', textAlign: 'center', minWidth: 38 }}>{hour}</div>
                <button onClick={() => setHour(hour <= 1 ? 12 : hour - 1)} className="btn-bare flex-center" style={tickBtn(() => {}, '▼')}>▼</button>
              </div>
              <div className="mono" style={{ fontSize: 18, color: muted, padding: '0 4px' }}>:</div>
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${accent}18`, borderRight: `1px solid ${accent}18` }}>
                <button onClick={() => setMinute(minute >= 55 ? 0 : minute + 5)} className="btn-bare flex-center" style={tickBtn(() => {}, '▲')}>▲</button>
                <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: text, padding: '2px 10px', textAlign: 'center', minWidth: 38 }}>{String(minute).padStart(2, '0')}</div>
                <button onClick={() => setMinute(minute <= 0 ? 55 : minute - 5)} className="btn-bare flex-center" style={tickBtn(() => {}, '▼')}>▼</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(['AM', 'PM'] as const).map(p => {
                const sel = period === p
                return (
                  <button key={p} onClick={() => setPeriod(p)} className="mono" style={{
                    background: sel ? accent : 'transparent',
                    border: `1.5px solid ${sel ? accent : `${accent}33`}`,
                    borderRadius: 10, padding: '5px 12px', fontSize: 11, fontWeight: 600,
                    color: sel ? 'white' : muted, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{p}</button>
                )
              })}
            </div>
          </div>
          <div className="mono-sm" style={{ color: muted, marginTop: 8, fontSize: 11, opacity: 0.7 }}>{t('notifications.recommend')}</div>
        </div>

        <div style={{ height: 1, background: `${accent}20` }} />

        {/* Content picker — chip style like onboarding music */}
        <div>
          <div className="mono-hint" style={{ color: muted, marginBottom: 10 }}>{t('notifications.morningShows')}</div>
          <div className="flex-wrap">
            {NOTIFICATION_CONTENT.map(opt => {
              const sel = notifyContent === opt.id
              const label = t(`notifications.${({ quote: 'todaysQuote', affirmation: 'todaysAffirmation', song: 'todaysSong', surprise: 'surpriseMe' } as Record<string, string>)[opt.id] || opt.id}`)
              return (
                <button key={opt.id} onClick={() => setNotifyContent(opt.id)} className="chip" style={{
                  border: `1.5px solid ${sel ? accent : `${accent}33`}`,
                  background: sel ? `${accent}14` : 'transparent',
                  color: sel ? accent : muted,
                }}>
                  {label}
                  {sel && <span style={{ fontSize: 10 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="spacer" />
        <button onClick={handleAllow} className="btn-primary" style={{ background: accent }}>
          {t('notifications.allow')}
        </button>
        <button onClick={handleSkip} className="body-font btn-bare" style={{ fontSize: 12, color: muted, padding: '12px 0', minHeight: 44, width: '100%', textAlign: 'center' }}>
          {t('notifications.skip')}
        </button>
      </div>
    </div>
  )
}

export default NotificationSettings
