import React, { useState } from 'react'
import type { OnboardingData } from '../types'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { NOTIFICATION_TIMES, NOTIFICATION_CONTENT } from '../lib/constants'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, Card, SectionLabel, Toggle, PrimaryButton, GhostButton } from '../components/ui'

interface Props {
  data: OnboardingData
  onDone: () => void
}

const NotificationSettings: React.FC<Props> = ({ data, onDone }) => {
  const [time, setTime] = useState('08:00')
  const [notifyContent, setNotifyContent] = useState('surprise')
  const [eveningReflection, setEveningReflection] = useState(false)
  const visible = useFadeIn()

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)

  const handleAllow = () => {
    localStorage.setItem('notify_enabled', '1')
    localStorage.setItem('notify_time', time)
    localStorage.setItem('notify_content', notifyContent)
    localStorage.setItem('notify_evening', eveningReflection ? '1' : '0')
    onDone()
  }

  return (
    <ScreenShell bg={vibe.bg} visible={visible}>
      <div style={{ padding: '32px 24px 24px' }}>
        <SectionLabel color={vibe.accent}>Notifications</SectionLabel>
        <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 30, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.1, margin: 0 }}>Stay connected</h1>
        <p style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, marginTop: 8 }}>A gentle daily reminder to open your day</p>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>Morning reminder time</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {NOTIFICATION_TIMES.map(t => (
              <button key={t} onClick={() => setTime(t)} style={{ background: time === t ? vibe.accent : (isDark ? 'rgba(255,255,255,0.07)' : `${vibe.accent}10`), border: `1px solid ${time === t ? vibe.accent : 'transparent'}`, borderRadius: 20, padding: '6px 12px', fontFamily: "'DM Mono', monospace", fontSize: 10, color: time === t ? 'white' : textColor, cursor: 'pointer', transition: 'all 0.15s' }}>{t}</button>
            ))}
          </div>
        </Card>

        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <SectionLabel color={vibe.accent}>Morning notification shows</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NOTIFICATION_CONTENT.map(opt => (
              <button key={opt.id} onClick={() => setNotifyContent(opt.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: notifyContent === opt.id ? `${vibe.accent}15` : 'transparent', border: `1px solid ${notifyContent === opt.id ? vibe.accent : cardBorder}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${notifyContent === opt.id ? vibe.accent : mutedColor}`, background: notifyContent === opt.id ? vibe.accent : 'transparent', flexShrink: 0 }} />
                <span style={{ fontFamily: typo.bodyFont, fontSize: 13, color: textColor, fontWeight: notifyContent === opt.id ? 600 : typo.bodyWeight }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card cardBg={cardBg} cardBorder={cardBorder} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor, marginBottom: 2 }}>Evening reflection</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 11, color: mutedColor }}>Off by default</div>
          </div>
          <Toggle value={eveningReflection} onChange={setEveningReflection} accent={vibe.accent} isDark={isDark} />
        </Card>

        <div style={{ background: `${vibe.accent}10`, border: `1px solid ${vibe.accent}20`, borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.08em' }}>Max 2 notifications per day · no spam ever</div>
        </div>

        <div style={{ flex: 1 }} />
        <PrimaryButton accent={vibe.accent} typo={typo} onClick={handleAllow}>Allow notifications →</PrimaryButton>
        <GhostButton color={mutedColor} borderColor={cardBorder} typo={typo} onClick={onDone} style={{ marginBottom: 8 }}>Skip for now</GhostButton>
      </div>
    </ScreenShell>
  )
}

export default NotificationSettings
