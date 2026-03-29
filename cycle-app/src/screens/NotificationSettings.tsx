import React, { useState, useEffect } from 'react'
import type { OnboardingData } from '../types'
import { VIBES, VIBE_TYPO } from '../types'

interface Props {
  data: OnboardingData
  onDone: () => void
}

const NOTIFICATION_TIMES = ['06:00', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '12:00', '19:00', '20:00', '21:00']
const NOTIFICATION_CONTENT = [
  { id: 'quote', label: "Today's quote" },
  { id: 'affirmation', label: "Today's affirmation" },
  { id: 'song', label: "Today's song" },
  { id: 'surprise', label: "Surprise me daily" },
]

const NotificationSettings: React.FC<Props> = ({ data, onDone }) => {
  const [time, setTime] = useState('08:00')
  const [notifyContent, setNotifyContent] = useState('surprise')
  const [eveningReflection, setEveningReflection] = useState(false)
  const [visible, setVisible] = useState(false)

  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg)
  const textColor = isDark ? '#FDF6F0' : vibe.text
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : vibe.muted
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : `${vibe.accent}20`
  const typo = data.vibe ? VIBE_TYPO[data.vibe] : VIBE_TYPO.fierce

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleAllow = () => {
    localStorage.setItem('notify_enabled', '1')
    localStorage.setItem('notify_time', time)
    localStorage.setItem('notify_content', notifyContent)
    localStorage.setItem('notify_evening', eveningReflection ? '1' : '0')
    onDone()
  }

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibe.bg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <div style={{ padding: '32px 24px 24px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 6 }}>
          Notifications
        </div>
        <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 30, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.1, margin: 0 }}>
          Stay connected
        </h1>
        <p style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.5, marginTop: 8 }}>
          A gentle daily reminder to open your day
        </p>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Morning time */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 10 }}>
            Morning reminder time
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {NOTIFICATION_TIMES.map(t => (
              <button
                key={t}
                onClick={() => setTime(t)}
                style={{ background: time === t ? vibe.accent : (isDark ? 'rgba(255,255,255,0.07)' : `${vibe.accent}10`), border: `1px solid ${time === t ? vibe.accent : 'transparent'}`, borderRadius: 20, padding: '6px 12px', fontFamily: "'DM Mono', monospace", fontSize: 10, color: time === t ? 'white' : textColor, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Notification content */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 10 }}>
            Morning notification shows
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NOTIFICATION_CONTENT.map(opt => (
              <button
                key={opt.id}
                onClick={() => setNotifyContent(opt.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: notifyContent === opt.id ? `${vibe.accent}15` : 'transparent', border: `1px solid ${notifyContent === opt.id ? vibe.accent : cardBorder}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              >
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${notifyContent === opt.id ? vibe.accent : mutedColor}`, background: notifyContent === opt.id ? vibe.accent : 'transparent', flexShrink: 0, transition: 'all 0.15s' }} />
                <span style={{ fontFamily: typo.bodyFont, fontSize: 13, color: textColor, fontWeight: notifyContent === opt.id ? 600 : typo.bodyWeight }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Evening reflection */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor, marginBottom: 2 }}>Evening reflection</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 11, color: mutedColor }}>Off by default</div>
          </div>
          <button
            onClick={() => setEveningReflection(e => !e)}
            style={{ width: 46, height: 26, borderRadius: 13, background: eveningReflection ? vibe.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 3, left: eveningReflection ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        <div style={{ background: `${vibe.accent}10`, border: `1px solid ${vibe.accent}20`, borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.08em', textAlign: 'center' }}>
            Max 2 notifications per day · no spam ever
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleAllow}
          style={{ width: '100%', background: vibe.accent, color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          Allow notifications →
        </button>
        <button
          onClick={onDone}
          style={{ width: '100%', background: 'transparent', color: mutedColor, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '15px', fontFamily: typo.bodyFont, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default NotificationSettings
