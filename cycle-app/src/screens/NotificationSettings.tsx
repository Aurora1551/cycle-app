import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { NOTIFICATION_CONTENT } from '../lib/constants'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, Card, SectionLabel, PrimaryButton, GhostButton } from '../components/ui'
import { subscribeToPush, registerServiceWorker } from '../lib/push'

interface Props {
  data: OnboardingData
  onDone: () => void
}

const NotificationSettings: React.FC<Props> = ({ data, onDone }) => {
  const { t } = useTranslation()
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM')
  const [notifyContent, setNotifyContent] = useState('surprise')
  const visible = useFadeIn()

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)

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

    // Register service worker and subscribe to push
    await registerServiceWorker()
    await subscribeToPush(data.name)

    // Save the notify time to the server subscription
    fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.name,
        subscription: null, // Already saved by subscribeToPush
        notifyTime: timeStr,
      }),
    }).catch(() => {})

    onDone()
  }

  const spinnerBtn = (onClick: () => void, label: string) => (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: mutedColor, padding: 4 }}>{label}</button>
  )

  const spinnerBox = (value: string) => (
    <div style={{
      fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 700, color: textColor,
      background: isDark ? 'rgba(255,255,255,0.06)' : `${vibe.accent}08`,
      border: `1.5px solid ${vibe.accent}40`, borderRadius: 12, padding: '8px 16px', minWidth: 56, textAlign: 'center',
    }}>{value}</div>
  )

  return (
    <ScreenShell bg={vibe.bg} visible={visible}>
      <div style={{ padding: '32px 24px 24px' }}>
        <SectionLabel color={vibe.accent}>{t('notifications.sectionLabel')}</SectionLabel>
        <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 30, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.1, margin: 0 }}>{t('notifications.heading')}</h1>
        <p style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, marginTop: 8 }}>{t('notifications.subtext')}</p>
      </div>

      <div className="flex-col gap-14" style={{ padding: '0 24px', flex: 1 }}>
        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>{t('notifications.morningTime')}</SectionLabel>
          <div style={{ fontFamily: typo.bodyFont, fontSize: 12, color: mutedColor, marginBottom: 12 }}>{t('notifications.recommend')}</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {spinnerBtn(() => setHour(hour >= 12 ? 1 : hour + 1), '▲')}
              {spinnerBox(String(hour))}
              {spinnerBtn(() => setHour(hour <= 1 ? 12 : hour - 1), '▼')}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 700, color: textColor }}>:</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {spinnerBtn(() => setMinute(minute >= 55 ? 0 : minute + 5), '▲')}
              {spinnerBox(String(minute).padStart(2, '0'))}
              {spinnerBtn(() => setMinute(minute <= 0 ? 55 : minute - 5), '▼')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
              {(['AM', 'PM'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  background: period === p ? vibe.accent : 'transparent',
                  border: `1.5px solid ${period === p ? vibe.accent : `${vibe.accent}40`}`,
                  borderRadius: 10, padding: '8px 14px', fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600,
                  color: period === p ? 'white' : textColor, cursor: 'pointer', transition: 'all 0.15s',
                }}>{p}</button>
              ))}
            </div>
          </div>
        </Card>

        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>{t('notifications.morningShows')}</SectionLabel>
          <div className="flex-col gap-6">
            {NOTIFICATION_CONTENT.map(opt => (
              <button key={opt.id} onClick={() => setNotifyContent(opt.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: notifyContent === opt.id ? `${vibe.accent}15` : 'transparent',
                border: `1px solid ${notifyContent === opt.id ? vibe.accent : cardBorder}`,
                borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
                <div className="radio" style={{ borderColor: notifyContent === opt.id ? vibe.accent : mutedColor, background: notifyContent === opt.id ? vibe.accent : 'transparent' }} />
                <span style={{ fontFamily: typo.bodyFont, fontSize: 13, color: textColor, fontWeight: notifyContent === opt.id ? 600 : typo.bodyWeight }}>{t(`notifications.${({ quote: 'todaysQuote', affirmation: 'todaysAffirmation', song: 'todaysSong', surprise: 'surpriseMe' } as Record<string, string>)[opt.id] || opt.id}`)}</span>
              </button>
            ))}
          </div>
        </Card>


        <div className="spacer" />
        <PrimaryButton accent={vibe.accent} typo={typo} onClick={handleAllow}>{t('notifications.allow')}</PrimaryButton>
        <GhostButton color={mutedColor} borderColor={cardBorder} typo={typo} onClick={onDone} style={{ marginBottom: 8 }}>{t('notifications.skip')}</GhostButton>
      </div>
    </ScreenShell>
  )
}

export default NotificationSettings
