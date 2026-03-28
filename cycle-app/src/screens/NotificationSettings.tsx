import React, { useState, useEffect } from 'react'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'

interface Props {
  data: OnboardingData
  onBack: () => void
}

const NotificationSettings: React.FC<Props> = ({ data, onBack }) => {
  const [enabled, setEnabled] = useState(true)
  const [time, setTime] = useState('08:00')
  const [saved, setSaved] = useState(false)
  const [visible, setVisible] = useState(false)
  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg)
  const textColor = isDark ? '#FDF6F0' : vibe.text
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : vibe.muted
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    const savedEnabled = localStorage.getItem('notify_enabled')
    const savedTime = localStorage.getItem('notify_time')
    if (savedEnabled !== null) setEnabled(savedEnabled === '1')
    if (savedTime) setTime(savedTime)
    return () => clearTimeout(t)
  }, [])

  const savePrefs = () => {
    localStorage.setItem('notify_enabled', enabled ? '1' : '0')
    localStorage.setItem('notify_time', time)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const timings = ['06:00', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '12:00', '19:00', '20:00', '21:00']

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibe.bg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: mutedColor, padding: '20px 24px 0', textAlign: 'left' }}>
        ← back
      </button>

      <div style={{ padding: '20px 24px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 6 }}>
            Notifications
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>
            Daily reminder
          </h1>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 14, fontWeight: 600, color: textColor, marginBottom: 2 }}>Daily reminder</div>
            <div style={{ fontSize: 11, color: mutedColor }}>We'll nudge you to open your day</div>
          </div>
          <button onClick={() => setEnabled(e => !e)} style={{ width: 46, height: 26, borderRadius: 13, background: enabled ? vibe.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: enabled ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        {enabled && (
          <>
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: mutedColor, marginBottom: 10 }}>
                Reminder time
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {timings.map(t => (
                  <button key={t} onClick={() => setTime(t)} style={{ background: time === t ? vibe.accent : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(196,97,74,0.08)'), border: `1px solid ${time === t ? vibe.accent : 'transparent'}`, borderRadius: 20, padding: '6px 12px', fontFamily: "'DM Mono', monospace", fontSize: 10, color: time === t ? 'white' : textColor, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: `${vibe.accent}12`, border: `1px solid ${vibe.accent}25`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: textColor, lineHeight: 1.4 }}>
                You'll get a gentle nudge at {time} every day of your cycle. No pressure — just a reminder that today's content is waiting.
              </div>
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        <button onClick={savePrefs} style={{ width: '100%', background: saved ? `${vibe.accent}20` : vibe.accent, color: saved ? vibe.accent : 'white', border: saved ? `1px solid ${vibe.accent}40` : 'none', borderRadius: 14, padding: '16px', fontFamily: "'Karla', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
          {saved ? '✓ Saved' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}

export default NotificationSettings
