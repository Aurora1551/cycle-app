import React from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell } from '../components/ui'

interface Props {
  data: OnboardingData
  onStartFree: () => void
  onUnlock: () => void
}

const Summary: React.FC<Props> = ({ data, onStartFree, onUnlock }) => {
  const { t } = useTranslation()
  const visible = useFadeIn(80)
  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const componentSummary = data.components.slice(0, 4).map(c => t(`components.${c}`) || c).join(' · ') + (data.components.length > 4 ? ` +${data.components.length - 4}` : '')

  return (
    <ScreenShell bg="#1C0F0C" visible={visible} transition="opacity 0.5s ease">
      <div className="progress-track" style={{ background: 'rgba(232,165,152,0.15)' }}>
        <div className="progress-fill" style={{ width: '96%', background: 'linear-gradient(90deg, #C4614A, #D4956A)' }} />
      </div>

      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: '#E8A598' }}>{t('summary.allSet')}</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: '#FDF6F0', lineHeight: 1.1, fontStyle: 'italic', margin: 0 }}>
          {t('summary.readyForYou', { name: '' })}<br /><span style={{ color: '#E8A598' }}>{data.name}.</span>
        </h1>
        <p className="subtext" style={{ color: 'rgba(253,246,240,0.4)' }}>{t('summary.heresYourJourney')}</p>

        <div style={{ background: 'rgba(232,165,152,0.07)', border: '1px solid rgba(232,165,152,0.15)', borderRadius: 14, padding: '14px 16px' }}>
          <div className="mono-hint" style={{ color: '#E8A598', marginBottom: 10 }}>{t('summary.day1Preview')}</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: '#FDF6F0', lineHeight: 1.5, marginBottom: 10 }}>{t('summary.previewQuote')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
            <div className="icon-box flex-center" style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #C4614A, #5a1a0a)', fontSize: 14 }}>🎵</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#FDF6F0' }}>{t('summary.previewSong')}</div>
              <div style={{ fontSize: 10, color: 'rgba(253,246,240,0.4)' }}>{t('summary.previewArtist')}</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,165,152,0.1)', borderRadius: 14, padding: '4px 14px' }}>
          {[
            { icon: '💊', key: t('summary.treatment'), val: `${t(`treatments.${data.treatment}`) || data.treatment} · ${data.cycleDays} days` },
            { icon: '✨', key: t('summary.dailyContent'), val: componentSummary },
            { icon: vibe.emoji, key: t('summary.vibe'), val: t(`vibes.${vibe.key}`) },
            { icon: '🎵', key: t('summary.music'), val: data.genres.slice(0, 3).join(' · ') },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="icon-box flex-center" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(232,165,152,0.1)', fontSize: 12 }}>{row.icon}</div>
              <div>
                <div className="mono-hint" style={{ color: 'rgba(253,246,240,0.35)', marginBottom: 2, letterSpacing: '0.15em', fontSize: 7 }}>{row.key}</div>
                <div style={{ fontSize: 12, color: '#FDF6F0' }}>{row.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="spacer" />
        <button onClick={onStartFree} className="btn-primary" style={{ background: '#C4614A' }}>{t('summary.beginFree')}</button>
        <button onClick={onUnlock} className="btn-ghost" style={{ color: '#E8A598', border: '1px solid rgba(232,165,152,0.3)' }}>{t('summary.unlockFull')}</button>
        <div className="mono-xs text-center" style={{ color: 'rgba(253,246,240,0.25)' }}>{t('summary.freeDaysHint')}</div>
      </div>
    </ScreenShell>
  )
}

export default Summary
