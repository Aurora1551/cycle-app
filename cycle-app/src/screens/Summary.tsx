import React from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
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
  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor } = deriveTheme(vibe)
  const componentSummary = data.components.slice(0, 4).map(c => t(`components.${c}`) || c).join(' · ') + (data.components.length > 4 ? ` +${data.components.length - 4}` : '')

  return (
    <ScreenShell bg={vibe.bg} visible={visible} transition="opacity 0.5s ease">
      <div className="progress-track" style={{ background: `${vibe.accent}25` }}>
        <div className="progress-fill" style={{ width: '96%', background: `linear-gradient(90deg, ${vibe.accent}, ${vibe.accent}88)` }} />
      </div>

      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: vibe.accent }}>{t('summary.allSet')}</div>
        <h1 style={{ fontFamily: typo.headingFont, fontSize: 32, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.1, fontStyle: typo.headingStyle, margin: 0 }}>
          {t('summary.readyForYou', { name: '' })}<br /><span style={{ color: vibe.accent }}>{data.name}.</span>
        </h1>
        <p className="subtext" style={{ color: mutedColor }}>{t('summary.heresYourJourney')}</p>

        <div style={{ background: `${vibe.accent}12`, border: `1px solid ${vibe.accent}25`, borderRadius: 14, padding: '14px 16px' }}>
          <div className="mono-hint" style={{ color: vibe.accent, marginBottom: 10 }}>{t('summary.day1Preview')}</div>
          <div style={{ fontFamily: typo.headingFont, fontSize: 14, fontStyle: 'italic', color: textColor, lineHeight: 1.5, marginBottom: 10 }}>{t('summary.previewQuote')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '10px 12px' }}>
            <div className="icon-box flex-center" style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${vibe.accent}, ${vibe.accent}40)`, fontSize: 14 }}>🎵</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{t('summary.previewSong')}</div>
              <div style={{ fontSize: 10, color: mutedColor }}>{t('summary.previewArtist')}</div>
            </div>
          </div>
        </div>

        <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${vibe.accent}18`, borderRadius: 14, padding: '4px 14px' }}>
          {[
            { icon: '💊', key: t('summary.treatment'), val: `${t(`treatments.${data.treatment}`) || data.treatment} · ${data.cycleDays} days` },
            { icon: '✨', key: t('summary.dailyContent'), val: componentSummary },
            { icon: vibe.emoji, key: t('summary.vibe'), val: t(`vibes.${data.vibe}`) },
            { icon: '🎵', key: t('summary.music'), val: data.genres.slice(0, 3).join(' · ') },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < 3 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none' }}>
              <div className="icon-box flex-center" style={{ width: 28, height: 28, borderRadius: 8, background: `${vibe.accent}18`, fontSize: 12 }}>{row.icon}</div>
              <div>
                <div className="mono-hint" style={{ color: mutedColor, marginBottom: 2, letterSpacing: '0.15em', fontSize: 7 }}>{row.key}</div>
                <div style={{ fontSize: 12, color: textColor }}>{row.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="spacer" />
        <button onClick={onStartFree} className="btn-primary" style={{ background: vibe.accent }}>{t('summary.beginFree')}</button>
        <button onClick={onUnlock} className="btn-ghost" style={{ color: vibe.accent, border: `1px solid ${vibe.accent}50` }}>{t('summary.unlockFull')}</button>
        <div className="mono-xs text-center" style={{ color: mutedColor }}>{t('summary.freeDaysHint')}</div>
      </div>
    </ScreenShell>
  )
}

export default Summary
